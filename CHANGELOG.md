# Changelog - Ultranalytics

## 6 Ottobre 2026 (v9) — Confronta: A contro B

Il tavolo di confronto è sostituito da due insiemi, A e B (`sections/Insiemi.js`, logica in `nuova/sets.js` con test).
- **Elementi** da trascinare dentro e fuori: format, serata in una data, locale, genere, giorno della settimana, mese, stagione, categoria, serie. Stesso tipo si somma (Atipico o Ultravivid), tipi diversi si restringono (TooLate e sabato), le serate singole si aggiungono sempre; ogni serata si può togliere a mano. Una frase dice cosa c'è dentro ("Serate di ATIPICO, a TooLate, di sabato · 9 serate concluse")
- Trascinamento con il mouse da tutto l'elemento, con il dito dalla maniglia ⠿; da A a B per spostare, fuori per togliere. Su telefono e tablet "+ aggiungi" apre gli elementi dal basso: un tocco e l'elemento entra in quell'insieme
- **In breve**: cosa cambia tra A e B in frasi (registrati, ingressi, conversione, ultimo minuto, apertura, età, fedeltà, gente nuova, ritorni, pubblico in comune) e una tabella A/B con barra e differenza
- **Curve**: serata tipica (mediana) di A e B con fascia, singole serate in trasparenza, serate in vendita tratteggiate; giorni all'evento, dall'apertura, % del finale, ore della serata; tappe in tabella
- **Serate**: ogni serata come un punto (registrati, ingressi o conversione) e nel tempo; tocchi un punto, vedi la serata, la nota, e la togli dall'insieme
- **Pubblico**: persone solo in A, in tutti e due, solo in B (entrati o registrati), chi sono, dove vanno dopo
- **Previsione**: una serata in vendita in A stimata con le serate di B
- **Domande pronte**: il prossimo evento contro le sue edizioni, venerdì contro sabato, stagione contro stagione, commerciale contro elettronica, locale contro locale, young contro standard
- Copia link del confronto, salva come serie un insieme di serate, scambia A e B
- "Classifiche e stime" (generi, locali, brand, affidabilità delle stime, promoter) resta nella seconda scheda

---

## 6 Ottobre 2026 — Dati al 6/10 e correzione della proiezione

- Caricati gli export dal 1/9 al 6/10 (1.582 biglietti, 379 utenti): 128 registrazioni nuove, totale 43.405, nessun doppione, ingressi invariati
- Proiezione: una serata passata conta per il ritmo solo se a quel punto aveva almeno 5 registrati. Je Suis Mimì (125 oggi contro 3 al 31/12 dell'anno scorso, ×324) era stimata a ~3.166; ora ~971 (livello). Sulle serate passate gli errori non cambiano

---

## 2 Ottobre 2026 (v8) — Proiezione più precisa

- Nuovo metodo (`projectFinal` in `utils/comparisonEngine.js`, usato da tutte e due le viste, da Confronta e dalla verifica sulle serate passate): unisce il **ritmo** (registrati di oggi per il moltiplicatore mediano delle serate passate) e il **livello** (media dei registrati finali delle ultime 3). Il peso del ritmo è la radice della quota del finale che le serate passate avevano a quel punto: lontano dalla serata il ritmo moltiplica numeri piccoli e pesa poco. Mai sotto i registrati già presenti
- Verificato sulle serate passate (ognuna stimata con i soli dati di allora), errore tipico: 14 giorni da ±54% a ±42%, 7 giorni da ±46% a ±37%, 3 giorni da ±40% a ±23%, 1 giorno da ±24% a ±17%; entro ±20% il giorno prima dal 48% al 62%. La tendenza a sottostimare sparisce a 3 e 1 giorno (a 7–14 giorni ora sovrastima di circa il 15%)
- **Fascia probabile**: dagli errori passati a quella distanza, la fascia in cui sono finite 8 serate su 10 (tracker, prossimi eventi, previsione di Confronta)
- Il tracker dice come è fatta la stima: ritmo, peso e livello
- Con serate di riferimento a zero a quel punto la stima è il livello (prima nessuna stima)

---

## 2 Ottobre 2026 (v7) — Confronto rivisto

**Confronta**
- Grafici leggibili al tocco: un dito (o il mouse) sul grafico mostra il valore di ogni curva in quel punto e la differenza dalla prima; vale anche per il tracker
- Tabella "tappe" sotto le curve (−30, −14, −7, −3, −1 giorni, evento, finale) con la differenza dalla prima riga
- Nuovo asse **dall'apertura**: le curve partono dal giorno in cui si sono aperte le registrazioni; in Numeri "Registrazioni aperte X g prima"
- **Gruppi** sul tavolo come una linea (mediana tratteggiata con fascia min–max): brand per stagione, locale per stagione, locale e giorno della settimana, genere per stagione, serie. Valgono in curve, numeri, pubblico e come riferimento nella previsione
- **Stagioni** (settembre–agosto) e posizione della serata nella stagione ("1ª della stagione"), anche nella lista serate
- **Suggerimenti** da affiancare alla serata in vendita: serie, stessa serata un anno fa, prime serate di stagione nello stesso locale, ultime del brand, stesso locale e giorno
- Numeri: nuovi (mai entrati prima), tornati entro 30 giorni, note; "giorno stesso" e "anticipo" solo a serata conclusa
- Pubblico: in comune tra registrati o tra entrati; "dove va il pubblico dopo la serata" (rientri entro 60 giorni e brand)
- Previsione: **ingressi stimati** (conversione di chi si registra presto e di chi si registra dopo, dalle serate di riferimento) e affidabilità della stima
- **Copia link** del tavolo da mandare (apre le stesse serate e la stessa vista)

**Stime**
- "Quanto ci azzecca la proiezione": la proiezione rifatta sulle serate passate con i dati di allora. Oggi: errore tipico ±46% a 7 giorni, ±24% il giorno prima, con tendenza a sottostimare. Provati altri metodi (ultime 3 edizioni, media, totali, correzione della tendenza): nessuno più preciso, il metodo resta quello
- Nel tracker: ingressi stimati, errore tipico della stima a quella distanza

**Dati e catalogo**
- Numero del portale inserito a mano dal telefono (vale finché non arriva un export più recente), salvato online
- **Note sulle serate** (pioggia, ospite, serata concorrente…) in Stasera, Numeri e lista serate
- **Date degli eventi** dal sito (Dati): serate senza data, eventi in programma, correzione di serate passate; valgono anche nella vista classica (`catalog.dates`)
- **Catalogo nella nuova grafica**: nome del brand, locale, categoria, generi, esclusione, titoli delle serate; ogni modifica salva un solo campo (`patchEventConfig`)
- Tabella **per promoter** (oggi il link promoter è sul 3,7% delle registrazioni)

---

## 1 Ottobre 2026 (v6) — Serie di serate

- **Serie**: gruppi di serate scelti a mano anche tra brand diversi (es. "Opening Too Late": l'opening Atipico del 18.10.25 e l'Opening Party del 9.10.26). Si creano da Confronta: serate sul tavolo → "Salva come serie"; l'elenco "Serie salvate" le rimette sul tavolo o le elimina
- Salvate nel catalogo online (`appConfig/eventConfig.series`, nome export + giorno della serata): valgono per tutti gli account e restano anche dopo nuovi export o rinomine dei brand. Le serate restano anche nel loro brand
- Una serata in vendita che fa parte di una serie si confronta con le altre serate della serie invece che col brand: prossimi eventi, tracker, proiezione, da ricontattare, serata in corso ora per ora e suggerimenti di Confronta
- Il catalogo eventi della vista classica ora conserva i campi che non gestisce (le serie) quando salva
- Proiezione con una sola serata di riferimento: "su 1 serata" invece di un intervallo vuoto; date sotto i nomi lunghi nella lista serate

---

## 1 Ottobre 2026 (v5) — Finestra 14 / 30 / 60 giorni

- Tracker e curve con selettore **14 g · 30 g · 60 g** (giorni prima dell'evento): in Stasera, Eventi e nelle viste Curve e Previsione di Confronta. La scelta si ricorda (`nx_window`, predefinito 30)
- "Prossimi eventi" ora copre i prossimi 60 giorni (prima 45); le curve delle edizioni passate si calcolano fino a 60 giorni prima
- Stasera: toccando una riga di "Prossimi eventi" il grafico sotto mostra quell'evento (senza cambiare pagina); "torna a stasera" riporta alla serata in corso
- Se il punto di oggi è prima della finestra scelta, il grafico lo dice e suggerisce di allargarla

---

## 1 Ottobre 2026 (v4) — Nuova interfaccia

La dashboard classica resta (tag `v3.0-dashboard-classica` e tasto "Vista classica"); la nuova interfaccia è quella predefinita.

- `src/nuova/`: guscio con menu laterale (barra in basso da telefono), filtro per locale, orario dei dati, tema chiaro/scuro e link diretti alle sezioni (`#confronta`, `#eventi/<serata>`)
- **Stasera**: numeri principali, prossimi eventi contro le edizioni passate alla stessa distanza (fascia min–max, mediana, proiezione, da ricontattare), serata in corso ora per ora contro le serate dello stesso brand (o il tracker del prossimo evento), compleanni, ultime serate contro la media del brand
- **Eventi**: tracker di ogni evento in programma
- **Confronta**: libreria di tutte le serate e tavolo di confronto (trascina o "+", fino a 8): curve per giorni all'evento, % del finale o ore della serata; numeri affiancati (conversione, anticipo, ore di picco, età, donne, già venuti); pubblico in comune; previsione di una serata in vendita con le serate scelte come riferimento. Tab "Generi, locali e brand" con le tabelle di confronto
- **Andamenti**: serate nel tempo per locale, ora della notte (12→12), anticipo delle registrazioni, mappa giorno × ora
- **Persone**: pubblico, ritorni, età, sesso, compleanni (auguri e WhatsApp restano nella vista classica)
- **Dati**: caricamento export, dataset salvati (eliminazione con conferma scritta, dataset protetti), catalogo eventi
- Import degli export condiviso tra le due viste (`services/importService.js`); grafici SVG senza librerie esterne; calcoli in `nuova/model.js` con test
- Catalogo: "Villa Peggy's" unificato in "Tenuta Villa Peggy's"

---

## 1 Ottobre 2026 (v3) — Velocità di caricamento

- Formato 2 per i dataset caricati (`utils/compactFormat.js`): i campi dell'evento sono salvati una volta per evento nei metadati, le date come numeri, i campi ricavabili non si salvano. Verificato sui dati reali: 0 differenze su 43.277 registrazioni e 19.854 utenti, ~4 volte meno dati (biglietti da ~25 a 6,9 MB)
- Upload: i blocchi si scrivono in parallelo e i metadati per ultimi, così un caricamento interrotto non lascia dataset a metà
- Apertura: un'unica lettura (prima ne faceva due), dataset scaricati in parallelo e copia locale nel browser (`services/datasetCache.js`): dalla seconda apertura si scarica solo ciò che è nuovo. La copia si cancella all'uscita (logout)
- Il controllo degli eventi esclusi si fa una volta per nome evento invece che per registrazione (1 s risparmiato)
- Firebase "lite" (niente tempo reale, che l'app non usa), tolto Storage, lettore Excel, chat AI e gestione eventi caricati solo quando servono, niente source map in produzione: bundle principale da 524 a 355 kB compressi
- Rimossi `parseFile`/`processFiles` (non usati) e `hasStoredData`

---

## 1 Ottobre 2026 (v2) — Numeri del Live Tracker

### Confronto "allo stesso punto"
- Il confronto con le edizioni passate si fa all'ora dell'ultima registrazione presente nei dati ("Dati alle HH:MM", in ambra se più vecchi di 12 ore), non all'ora in cui si apre l'app: con un export delle 14 guardato alle 22 il tracker dava -64% su un'edizione in linea. Con il numero inserito a mano il riferimento resta l'ora attuale
- Il punto è un momento relativo al giorno dell'evento (es. "-2gg alle 14:10", "dopo mezzanotte alle 01:30"): dopo mezzanotte della serata il tracker dava +529%
- Confrontate solo le edizioni concluse e con data: quelle ancora in vendita (Giovedì Gelsi) abbassavano media e proiezione
- La media allo stesso punto conta come 0 le edizioni che a quel punto non avevano iscritti (anche nelle medie per anno e nella card condivisibile)
- La curva dell'edizione corrente si ferma dove finiscono i dati (non prosegue piatta nel futuro)

### Proiezione
- Un solo modello: registrazioni attuali × mediana del rapporto finale/allo-stesso-punto delle edizioni passate, con intervallo (interquartile, min-max sotto 4 edizioni) e numero di edizioni usate; "stima incerta" con meno di 3 edizioni o quando a quel punto le edizioni passate avevano meno del 20% del finale
- KPI, linea del grafico, filtri per anno e report AI usano la stessa funzione (`summarizeComparisons`)

### Altri numeri
- Giorni all'evento contati per giorni di calendario (la registrazione del giorno prima alle 18 è -1, non 0); ricalcolati anche sui dati già caricati
- Conversione e no-show solo sulle serate concluse con ingressi registrati (le serate future o senza scansioni non sono no-show); "n.d." altrimenti
- Confronto con l'edizione precedente nascosto per le edizioni ancora in vendita; crescita del brand tra edizioni concluse; generi confrontati per edizione
- "Trend per brand" non scarta più le edizioni successive alla prima; curve annuali per brand+edizione e solo edizioni concluse
- "% che si registra negli ultimi giorni" include il giorno dell'evento; tooltip delle barre annuali corretto
- Lista "da ricontattare": solo chi è entrato almeno una volta, una persona per telefono, esclusi i già registrati anche con un'altra email
- Il tracker si apre sull'edizione di stasera o la prossima; i brand sono ordinati per prossimo evento

### Test
- `utils/eventTime.js` (regole di tempo condivise) e test con orologio simulato su tracker, conversione e ricontatti; test di render della schermata del tracker. Rimosso il test di esempio di CRA, rotto dall'inizio

---

## 1 Ottobre 2026

### Export del portale da settembre 2025 a oggi
- Brand riconosciuti per parole chiave (`BRAND_REGISTRY.keywords`), non più per singola edizione: i nuovi eventi non richiedono modifiche al codice. Aggiunti Giovedì Gelsi, El Party Rico, Halftime, La Maturanda, Spaziodetox, Forever
- Edizione = data evento. Anno dedotto dalle date di registrazione (prima era fisso alla stagione 2025/26), data dagli ingressi per gli eventi senza data nel nome, `EVENT_DATE_OVERRIDES` per quelli futuri
- Tollerati i caratteri persi dall'export (`GIOVED�`, `DEC� 90`) nel riconoscimento; nomi visualizzati riparati

### Unione degli export (`utils/datasetMerge.js`)
- Export sovrapposti non contano più due volte: un biglietto è identificato dal codice
- Un ingresso registrato non si perde mai (il portale ha azzerato quelli dell'Atipico 21.02.26)
- I biglietti della vecchia piattaforma (senza email) sono collegati alle persone per telefono
- Dopo un upload vengono eliminati solo i dataset interamente contenuti nei successivi
- Eventi esclusi (test, senior, Decò 90) filtrati anche dai dataset già caricati
- Le edizioni Getfy (vecchia piattaforma, 4 Atipico 2024/25) usano l'etichetta per data come le nuove; i nomi dati alle edizioni nel catalogo (`editionRenames`, salvati col nome evento originale) si applicano anche ai dati nuovi (`utils/applyEventConfig.js`)

### Sicurezza
- Chat AI e report: il testo viene trattato come testo (escape) prima della formattazione, così un nome inserito sul portale non può eseguire codice nella sessione
- Eliminazione di un dataset: bisogna scrivere il nome del file per confermare; `ds_biglietti_21_02` (Getfy + ingressi Atipico 21.02) è protetto e non si elimina né dall'app né dalla pulizia automatica
- Header di sicurezza su Cloudflare (`public/_headers`)
- Rimossi `scripts/` (vecchi upload con percorsi del vecchio PC e scritture senza login) e `start-server.bat`; tolte le dipendenze inutilizzate lodash e csv-parse
- Regole Firestore in `firestore.rules`: solo gli account autorizzati (le regole di test erano scadute il 20/03/2026)
- Il file originale non viene più caricato su Storage
- CSV ed Excel esclusi da git

### Fix
- Rimossi import inutilizzati in `TrendsTab.js` che bloccavano la build su Vercel
- "Ricarica dal cloud" applica di nuovo la configurazione eventi
- La finestra Gestione eventi non dipende più dalle edizioni scritte nel registro

---

## 20 Febbraio 2026 (v2)

### Live Tracker — Supporto brand con 1 sola edizione
- `getBrandsWithMultipleEditions` rinominata in `getBrandsForTracker` — ora accetta brand con 1+ edizione
- Brand nuovi (mai fatti prima) appaiono nel tracker con KPI e curva cumulativa
- Se non ci sono edizioni precedenti: nascosti tabella confronto, KPI media, barra progresso
- Mantiene piena retrocompatibilita per brand con 2+ edizioni

### Rimozione DECO 90
- Aggiunto `"deco 90"` a `EXCLUDED_EVENTS` — non appare piu tra i brand analizzati

### Pagina Gestione Eventi
- Nuovo file `src/services/eventConfigService.js` — CRUD configurazione eventi su Firebase (collection `appConfig`)
- Nuovo file `src/components/screens/EventManagerModal.js` — modal fullscreen accessibile da icona ingranaggio nella top bar
- **Funzionalita:**
  - Lista tutti i brand rilevati dai dati + quelli nel registry
  - Badge "NUOVO" per brand non ancora configurati
  - Editor inline: rinomina brand, cambia categoria, multi-select generi, campo locale con autocomplete
  - Merge duplicati: seleziona 2+ brand, scegli nome principale, crea alias automatici
  - Brand esclusi: toggle per nascondere/mostrare brand dall'analisi
  - Ricerca per nome brand
  - Salva tutto su Firebase con persistenza cross-sessione

### Integrazione customConfig nel data pipeline
- `matchBrand()` in `eventNameCleaner.js` accetta parametro opzionale `customConfig`
  - Supporta alias (da merge), renames, esclusioni custom, override categoria/generi
- `processRawRows()` in `csvProcessor.js` passa `customConfig` al matching
- `App.js`: carica `eventConfig` da Firebase all'avvio, applica renames/esclusioni ai dati in-memory al salvataggio

### File modificati/creati

| File | Tipo modifica |
|------|--------------|
| `src/services/eventConfigService.js` | NUOVO — Firebase CRUD config eventi |
| `src/components/screens/EventManagerModal.js` | NUOVO — UI gestione eventi |
| `src/utils/comparisonEngine.js` | `getBrandsForTracker` (1+ ediz.) |
| `src/components/tabs/ComparisonTab.js` | Import aggiornato, testo UI, logica selezione brand |
| `src/components/comparison/WhereAreWeNow.js` | Gestione 0 comparisons (nasconde KPI non rilevanti) |
| `src/config/eventConfig.js` | Aggiunto "deco 90" a EXCLUDED_EVENTS |
| `src/utils/eventNameCleaner.js` | Supporto customConfig in matchBrand() |
| `src/utils/csvProcessor.js` | Supporto customConfig in processRawRows() |
| `src/App.js` | Icona settings, stato modal, caricamento/salvataggio config Firebase |

---

## 20 Febbraio 2026 (v1)

### Design System Completo (Prompt 1 + Prompt 6)

**Nuovo file: `src/config/designTokens.js`**
- Centralizzati tutti i token di design: `colors`, `font`, `radius`, `shadows`, `gradients`, `spacing`, `transition`, `presets`, `alpha`
- `alpha` export per tutti i valori rgba: `alpha.brand[8/15/20/30/40/50]`, `alpha.pink[8/10/30]`, `alpha.error[10/15/30]`, `alpha.success[15]`, `alpha.white[15/20/70/80]`
- Overlay dedicati: `colors.overlay.dark/medium/light`
- Eliminati TUTTI i valori rgba() e hex hardcoded da ogni componente (24 file modificati)

**CSS globale (`src/index.css`)**
- Scrollbar custom 6px con thumb arrotondato
- Font Inter, selezione testo stilizzata, focus-visible accessibile
- Rimosso `src/App.css` (duplicato)

**HTML (`public/index.html`)**
- `lang="it"`, theme-color `#0f172a`, title "Ultranalytics"

### Live Tracker - Nuove Feature

**Toggle scala Lineare/Logaritmica**
- Componente condiviso `src/components/shared/ScaleToggle.js`
- Applicato ai grafici cumulativi in `WhereAreWeNow.js` (Live Tracker)
- Applicato al grafico "Quando si registrano" in `OverviewTab.js` (Panoramica)

**Override registrazioni manuali**
- Due modalita via toggle: **"Ad ora"** (campo singolo) e **"Giorni mancanti"** (campi per-giorno)
- Modalita "Ad ora": inserisci il totale registrazioni attuali, aggiorna proiezione e curva
- Modalita "Giorni mancanti": rileva automaticamente i giorni senza dati (o con dati incompleti < 23:00), mostra un campo per ciascuno con label intuitive (Oggi, Ieri, -3gg...)
- I valori giornalieri vengono mergiati nella curva cumulativa mantenendo monotonia
- Niente viene salvato: tutto temporaneo per la sessione
- Reset automatico al cambio brand/edizione

**Fix calcolo `currentDaysBefore`**
- Confronto date a mezzanotte per evitare arrotondamenti errati dovuti all'orario
- `eventDate` a mezzanotte vs `now` nel pomeriggio non causa piu `daysBefore = 0` quando manca 1 giorno

**Fix `isEventPast`**
- Evento considerato "passato" solo dopo le 6:00 del giorno successivo
- Tiene conto delle registrazioni alla porta fino alle 3:00 di notte

**Colonna "Proiezione" nella tabella confronto**
- Rimossa la colonna "Proiezione" (mostrava valori identici per tutte le edizioni)
- Sostituita con **"% a -Xgg"**: percentuale di completamento di ogni edizione passata allo stesso punto
- KPI "Proiezione finale" nascosto quando l'evento e passato
- Proiezione non calcolata per eventi passati

### File modificati (26 file, +1086 -842 righe)

| File | Tipo modifica |
|------|--------------|
| `src/config/designTokens.js` | NUOVO - Design system centralizzato |
| `src/components/shared/ScaleToggle.js` | NUOVO - Toggle Lineare/Log |
| `src/App.css` | RIMOSSO |
| `src/utils/comparisonEngine.js` | Override registrazioni, fix daysBefore, isEventPast, missingDays, completionPercent |
| `src/components/tabs/ComparisonTab.js` | Toggle override, campi manuali, stato overrideMode/dailyCounts |
| `src/components/comparison/WhereAreWeNow.js` | ScaleToggle condiviso, indicatore override, colonna % completamento |
| `src/components/tabs/OverviewTab.js` | ScaleToggle sul grafico "quando si registrano" |
| Tutti gli altri componenti | Tokenizzazione rgba/hex → design tokens |
