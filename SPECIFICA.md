# Specifica funzionale e copertura

## Scelta tecnologica

HTML, CSS e JavaScript senza dipendenze, distribuiti come cartella o ZIP. Il target è qualsiasi sistema con browser moderno; tutti i calcoli sono locali e offline. Il principale compromesso è l’assenza di integrazione desktop nativa, non necessaria per questo flusso.

## Mappa Excel → applicazione

| Funzione Excel | Vista applicazione | Regola | Verifica |
|---|---|---|---|
| Input C3:C10, E8 | Dati cilindro | geometria e condizioni operative | convalida numerica e caso campione |
| Forze C12:C29 | Forze e portate | F = A·P; coefficienti 0,8 e 0,6 | confronto con valori memorizzati Excel |
| Portate C34:C45 | Forze e portate | volumi per ciclo, normalizzazione, consumo annuo | confronto con valori memorizzati Excel |
| Carico di punta C47:C57 | Carico di punta | Eulero, lunghezza libera k·c, sicurezza | confronto con valori memorizzati Excel |
| Velocità ed energia B67:B69 | Ammortizzo | v = 2·c·n/60; Ec = ½mv² | confronto con valori memorizzati Excel |
| Diagramma incorporato | Ammortizzo | rette logaritmiche + limite verticale di massa | punti limite e casi fuori campo |

## Formule

- `A_spinta = πD²/4`
- `A_trazione = π(D²-d²)/4`
- `F = A · P`, con `1 bar = 0,1 N/mm²`
- `Q = A · c · n`, convertita in l/min e m³/s
- `Q_N = Q · (P_rel + 1) · 293 / (273 + t_C)`
- `I = πd⁴/64`
- `S_L = k·c`
- `F_cr = π²EI/S_L²`
- `F_amm = F_cr/k_s`
- `v_media = 2·c·n/60`, con corsa in metri
- `E_c = ½mv²`

## Interfaccia e supporto didattico

- layout a piena finestra sui normali monitor desktop, senza scorrimento verticale delle viste;
- modalità adattiva con scorrimento su tablet, smartphone o finestre eccezionalmente piccole;
- campi di input raggruppati e colorati per geometria, esercizio, carico di punta e ammortizzo;
- blu per forze e portate, arancio per stabilità dello stelo, viola per ammortizzo;
- tre schede **Approfondimento** con schemi, formule essenziali e criterio di lettura dell’esito.

## Diagramma di ammortizzo

Gli assi del raster sono logaritmici. Ogni diagonale è stata digitalizzata come energia limite costante:

`v_lim(m) = √(2E_lim/m)`

equivalente alla retta:

`log10(v_lim) = log10(√(2E_lim)) − 0,5·log10(m)`

| Alesaggio (mm) | E limite digitalizzata (J) | Massa massima (kg) |
|---:|---:|---:|
| 25 | 1,0 | 50 |
| 32 | 3,6 | 80 |
| 40 | 6,4 | 120 |
| 50 | 10,5 | 200 |
| 63 | 26 | 300 |
| 80 | 53 | 500 |
| 100 | 82 | 800 |
| 125 | 132 | 1.200 |
| 160 | 205 | 2.000 |
| 200 | 300 | 3.000 |
| 250 | 400 | 5.000 |
| 320 | 800 | 8.000 |

La verifica richiede sia `Ec ≤ E_lim` sia `m ≤ m_max`. I coefficienti provengono dalla lettura di un’immagine raster, quindi non sostituiscono dati tabellari certificati del costruttore.

## Differenze e limitazioni

- Nel workbook le forze teoriche usano `6 bar` come costante anche se esiste una cella pressione. L’app usa il valore inserito dall’utente; a 6 bar i risultati coincidono.
- Il workbook riporta `OK` per l’ammortizzo come testo fisso. L’app esegue una verifica numerica.
- Il workbook calcola il carico ammissibile ma non lo confronta con un carico. L’app consente il confronto con spinta teorica, spinta effettiva o carico manuale.
- La velocità da frequenza è una media senza soste e non descrive necessariamente l’impatto reale. È disponibile l’inserimento manuale.
- Macro, query, pivot e collegamenti esterni non sono presenti nel file analizzato.
