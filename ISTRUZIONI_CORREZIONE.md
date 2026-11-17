# Correzione riconoscimento chiave Gemini - versione 6.1

## Cosa cambia

- Il server distingue `PERSONAL_KEY_MISSING` (nessuna chiave inviata) da `PERSONAL_KEY_FORMAT` (chiave presente ma formato anomalo). In precedenza entrambi producevano la falsa indicazione che la chiave fosse assente.
- Il browser conferma che il campo contiene una chiave **senza mostrarla**. La conferma non ne verifica l'autenticita presso Google.
- I vecchi avvisi di chiave mancante sono rimossi automaticamente dopo l'inserimento di una chiave sufficientemente lunga.
- Il file JavaScript e richiesto con `?v=6.1` per favorire il caricamento della versione aggiornata.
- Restano invariati i calcoli, gli schemi di verifica e l'uso delle chiavi individuali.

## Aggiornamento su GitHub

Nel repository `monicatiboni/calcolo-cilindri-gemini` sostituire, nelle rispettive cartelle, i file:

1. `server.mjs`
2. `js/ai_assistant.js`
3. `index.html`
4. `styles.css`
5. `package.json` (aggiornamento della sola versione)

Salvare le modifiche con **Commit changes**. Se il deploy automatico non parte, avviare Render -> **Manual Deploy -> Deploy latest commit**. Ricaricare quindi la pagina con **Ctrl+F5**.

### Verifica

1. Aprire Assistente AI: compare `Nessuna chiave API inserita`.
2. Inserire la propria chiave. Compare `Chiave inserita nel campo (non ancora verificata da Google)`.
3. Premere **Invia a Gemini**. Se si riceve `La chiave e presente ma il formato non sembra corretto`, ricopiarla da Google AI Studio senza spazi o virgolette.
4. In caso di errore di autenticazione da Google, controllare le autorizzazioni e il modello.

Non condividere la chiave e non inserirla nei log, negli screenshot o nel repository.
