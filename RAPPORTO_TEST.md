# Rapporto di verifica

Data: 9 novembre 2026

## Esito

`node tests/model.test.js` → **OK: 35 controlli numerici e casi limite superati.**

## Equivalenza con il caso Excel

Input: alesaggio 80 mm, stelo 25 mm, corsa 600 mm, pressione 6 bar, 12 cicli/min, 30 °C, 16 ore/giorno, 230 giorni/anno, massa 100 kg, E 210.000 N/mm², k 2, sicurezza 5.

| Risultato | Excel | Applicazione | Esito |
|---|---:|---:|---|
| Spinta teorica | 3.015,928947 N | 3.015,928947 N | coincide |
| Trazione teorica | 2.721,404636 N | 2.721,404636 N | coincide |
| Portata uscita | 36,191147 l/min | 36,191147 l/min | coincide |
| Portata rientro | 32,656856 l/min | 32,656856 l/min | coincide |
| Portata totale norm. | 466,030542 Nl/min | 466,030542 Nl/min | coincide |
| Consumo annuo | 102.899.543,625516 Nl | 102.899.543,625516 Nl | coincide |
| Forza critica | 27.598,563736 N | 27.598,563736 N | coincide |
| Forza ammissibile | 5.519,712747 N | 5.519,712747 N | coincide |
| Velocità media | 0,24 m/s | 0,24 m/s | coincide |
| Energia cinetica | 2,88 J | 2,88 J | coincide |

## Casi limite verificati

- pressione diversa da 6 bar effettivamente applicata alle forze;
- diametro stelo non inferiore all’alesaggio rifiutato;
- carico manuale superiore alla forza ammissibile classificato non ammissibile;
- massa superiore al limite verticale dell’ammortizzo classificata non ammissibile;
- energia superiore alla curva classificata non ammissibile;
- punto esattamente sulla frontiera di ciascuna delle 12 curve classificato ammissibile con tolleranza numerica relativa `1e-12`.

## Verifica interfaccia

Sono stati eseguiti controllo sintattico JavaScript, controllo di unicità dei 79 identificatori HTML, verifica dei riferimenti ai file locali, bilanciamento dei 394 blocchi CSS e controllo dei tre collegamenti tra pulsanti e schede didattiche. Sono stati inoltre controllati il campo di anteprima della velocità, la scala tipografica comune per valori e unità, la continuità cilindro–pistone–stelo–massa, la separazione tra schema e testo e la presenza nel mini-diagramma di curva decrescente e limite `m max`. La cattura automatica di schermate desktop/mobile non è stata eseguita perché il container non dispone di un browser headless e il download del binario è bloccato dalla rete. Il pacchetto non dipende da tale strumento.
