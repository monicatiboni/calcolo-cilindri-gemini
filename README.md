# Calcolo Cilindri 6.0 - Gemini con chiavi API personali

Applicazione web per il predimensionamento e la verifica didattica di cilindri pneumatici ISO 15552. Deriva dalla **versione 4 originale**: il file `js/model.js` (formule e calcoli) non è stato modificato. La versione 6 utilizza il modulo conversazionale della versione 5, ora adattato per **una chiave Gemini personale per ciascuno studente**.

## Cosa fa lo studente

1. Apre il link HTTPS dell'applicazione, senza installazioni sul PC.
2. Clicca su **Assistente AI** (pulsante viola, a sinistra di Importa dati).
3. Inserisce la propria chiave API Gemini, ottenuta in Google AI Studio, nel campo di tipo password.
4. Descrive il cilindro e l'impiego in linguaggio naturale. Gemini estrae soltanto i valori esplicitamente forniti.
5. Risponde alle domande sui parametri ancora mancanti e corregge eventuali dati estratti in modo errato.
6. Quando tutti i dati necessari risultano completi e validi, sceglie **Compila e calcola**. I valori vengono passati al motore numerico *locale nel browser* della versione 4.
7. Può cancellare la chiave usando il pulsante **Cancella**. Ricaricando o chiudendo la pagina, la chiave non è più presente.

## Copertura dei calcoli originali

| Sezione | Campi obbligatori | Aggiunte condizionali |
|---|---|---|
| Geometria | `bore`, `rod`, `stroke` | - |
| Esercizio | `pressure`, `frequency`, `temperature`, `dailyHours`, `annualDays`, `mass` | - |
| Carico di punta | `elasticModulus`, `lengthFactor`, `safetyFactor`, `loadMode` | `manualLoad` se carico manuale |
| Ammortizzo | `velocityMode` | `manualVelocity` se velocità manuale |

**14 campi sono sempre necessari** (fino a 16 in caso di modalità manuali). Non vengono accettati come "dati forniti" i valori dimostrativi che compaiono già nella schermata iniziale dell'applicazione. I controlli sui campi sono deterministici, non affidati al modello Gemini.

## Architettura e privacy delle credenziali

```text
Browser studente A [chiave personale A]   Browser studente B [chiave personale B]
                 \                         /
                HTTPS stesso dominio Render
                             |
                       server.mjs (Node.js)
                 (usa la chiave di quella richiesta,
                      non la memorizza)
                             |
                         HTTPS POST
                             |
                       Gemini Developer API
                             |
                       JSON con dati estratti
                             |
                        Browser studente
                             |
                   js/model.js (calcoli locali)
```

- La chiave è **inserita dallo studente**, non è in HTML, CSS, JS o `render.yaml`.
- Viene passata nel corpo `POST` della richiesta HTTPS verso il backend. Il server la trasmette a Google come `x-goog-api-key` e non la memorizza in sessioni, log, database, cookie o file.
- Il backend non la restituisce nel JSON. La trasmissione al server è necessaria: **chi gestisce il server deve essere considerato attendibile**.
- Nel browser la chiave resta nel campo finché lo studente non la cancella o chiude/ricarica la pagina. Non viene salvata in LocalStorage, SessionStorage o nei file esportati.
- Il sito pubblico deve essere usato su **HTTPS**, come fornito da Render. Su un PC condiviso non salvare la chiave nei gestori di password e chiudere la scheda al termine.
- Le chiavi diverse NON assicurano quote separate se appartengono allo stesso progetto Google: ogni studente dovrebbe usare un proprio progetto quando possibile.
- Il backend include verifica dell'origine, limiti di dimensione dei messaggi, timer, limiti per sessione e limiti globali. Per un servizio pubblico duraturo aggiungere autenticazione, monitoraggio e rate limiting persistente tra istanze.

## Avvio locale (solo per docente/programmatore)

Richiede **Node.js 20+ solo sul computer che ospita il server**. Su computer universitari senza installazioni utilizzare Render.

```sh
npm start
```

Aprire http://localhost:8501. Non serve inserire alcuna chiave Google nel server. Il pulsante AI chiederà la chiave personale nella pagina.

Su Windows è disponibile `AVVIA_WINDOWS.bat`. Eventuali impostazioni locali si possono conservare in `.env` (non committare).

## Pubblicazione su GitHub e Render

### 1. Crea repository GitHub separato

Apri https://github.com/new, nome suggerito `calcolo-cilindri-gemini`, e imposta la visibilità che preferisci. Questo progetto è **separato da Gemini Studio Lab**.

Estrai lo ZIP e carica **i file contenuti** direttamente nella radice del repository (non un'ulteriore cartella):

- `index.html`, `styles.css`, `server.mjs`, `package.json`, `render.yaml`
- cartella `js/` con i quattro script
- cartella `tests/` (facoltativa per il deploy, utile per controllo)
- cartella `assets/`, `README.md`, `.gitignore`, `.env.example`

Non caricare file `.env` con segreti.

### 2. Pubblica su Render

Apri https://dashboard.render.com e accedi con GitHub. Hai due opzioni:

**Opzione consigliata - Blueprint**

1. **New > Blueprint**.
2. Scegli il repository appena creato. Render riconosce `render.yaml`.
3. Controlla la proposta: Node Web Service, piano `free`, regione `frankfurt`, avvio `npm start`.
4. Conferma l'applicazione. Render creerà automaticamente `SESSION_SECRET`.

**Opzione alternativa - Web Service manuale**

1. **New > Web Service**, connetti il repository.
2. Language/Runtime: `Node`; Branch `main`.
3. Build command: `npm install --ignore-scripts --no-audit --no-fund`.
4. Start command: `npm start`.
5. Plan: `Free`, se disponibile.
6. Environment variables: `NODE_ENV=production`; `GEMINI_MODEL=gemini-3-flash-preview`; `SESSION_SECRET` impostato a una stringa casuale lunga 32+ caratteri; se necessario `CYLINDER_APP_ACCESS_CODE` (codice di accesso didattico, NON chiave Gemini).
7. Deploy. URL finale simile a `https://calcolo-cilindri-gemini.onrender.com` (esempio; il nome effettivo dipende dalla disponibilità).

**NON configurare `GEMINI_API_KEY` su Render**: le chiavi devono essere inserite dagli studenti nell'interfaccia.

### 3. Prova con due studenti

1. Apri l'URL HTTPS da due browser/sessioni indipendenti.
2. Inserisci due chiavi diverse, una per studente.
3. Invia due descrizioni differenti e verifica che ogni browser riceva i propri dati.
4. Controlla che in **Network > Requests** (visibile allo stesso studente) i dati vadano verso il tuo server `/api/assistant/extract`, e non verso un endpoint arbitrario. Non mostrare la propria chiave agli altri.
5. Se il modello restituisce `404`, il docente può cambiare la variabile `GEMINI_MODEL` su Render con un modello disponibile per i progetti della classe.

Nota: il piano gratuito Render può sospendere il servizio dopo inattività; l'avvio iniziale potrebbe richiedere tempo. Quote gratuite Gemini e modelli disponibili possono cambiare.

## Test tecnici

```sh
npm test
```

Il comando esegue 35 controlli numerici originali e test aggiuntivi di copertura/validazione, comunicazione backend e separazione simultanea delle chiavi. Uno script Playwright (disponibile nei test) prova l'interfaccia con risposte API simulate; un collaudo Gemini reale richiede una chiave valida.

## Fonti

- Google Gemini API keys: https://ai.google.dev/gemini-api/docs/api-key
- Google Gemini REST: https://ai.google.dev/api/generate-content
- Render Web Services: https://render.com/docs/web-services
- Render Blueprints: https://render.com/docs/blueprint-spec

**Avvertenza**: questo è un laboratorio didattico di predimensionamento, non un progetto esecutivo o una validazione normativa per la sicurezza di una macchina.
