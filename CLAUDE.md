# Ultranalytics — Club Analytics Dashboard

## Progetto
Web app React per analisi dati eventi/serate di club (Studios Club & Co). Pubblicata su Cloudflare Workers (static assets, `wrangler.jsonc`) da `nnzppf/ultranalytics`, branch `main`: https://ultranalytics.filzantrade.workers.dev. Ogni push su main triggera il deploy automatico (Workers Builds). Il vecchio deploy Vercel (ultranalytics.vercel.app) è da dismettere: il piano Hobby non consente uso commerciale.

## Stack
- React 18 (CRA), Recharts per grafici, Lucide React per icone
- Firebase: Firestore (config eventi, dati) + Auth (Google login). Database in `europe-west1` (Belgio). Storage non usato
- Cloudflare Workers: hosting + deploy automatico. `REACT_APP_GEMINI_API_KEY` va impostata come *build variable* nel progetto Cloudflare
- Il dominio del sito deve essere tra i domini autorizzati di Firebase Auth, altrimenti il login Google fallisce
- Nessun CSS framework — tutto inline styles con design tokens centralizzati

## Struttura Chiave

```
src/
├── App.js                          # Root: auth, data loading, tab routing, eventConfig boot
├── config/
│   ├── designTokens.js             # colors, alpha, font, radius, gradients, presets, spacing
│   ├── eventConfig.js              # BRAND_REGISTRY (keywords per brand), EVENT_DATE_OVERRIDES, EXCLUDED_EVENTS, GENRE_LABELS
│   ├── firebase.js                 # Firebase init (progetto: ultranalytics-8582c)
│   └── constants.js                # TOOLTIP_STYLE, ecc.
├── utils/
│   ├── comparisonEngine.js         # Core analytics: WhereAreWeNow, cross-brand, genre/brand/location comparison
│   ├── csvProcessor.js             # Parsing CSV upload → record strutturati
│   ├── eventNameCleaner.js         # Nome evento → brand, data evento, etichetta edizione (tollera i "�" dell'export)
│   ├── datasetMerge.js             # Unione export sovrapposti: dedup per codice, ingressi mai persi, persone per telefono
│   ├── dataTransformers.js         # getUserStats, fasce orarie, heatmap, trends
│   ├── whatsapp.js                 # URL WhatsApp, templates retarget con {nome}/{brand}/{data}/{link}
│   └── dateParser.js               # Parsing date italiane
├── services/
│   ├── eventConfigService.js       # Firestore: load/save eventConfig (appConfig/eventConfig)
│   ├── firebaseDataService.js      # Persistenza dati su Firestore, load con merge, pulizia export superati
│   └── geminiService.js            # AI chat con Gemini
├── components/
│   ├── tabs/
│   │   ├── OverviewTab.js          # Panoramica: KPI, curva registrazioni, log scale
│   │   ├── ComparisonTab.js        # Live Tracker + confronti genere/brand/location
│   │   ├── BirthdaysTab.js         # Compleanni + messaggi WhatsApp
│   │   ├── UsersTab.js             # Dettaglio utenti
│   │   ├── FasceTab.js             # Fasce orarie registrazione
│   │   ├── HeatmapTab.js           # Heatmap giorno/ora
│   │   └── TrendsTab.js            # Trend temporali
│   ├── comparison/
│   │   ├── WhereAreWeNow.js        # SingleBrandView + CrossBrandView (grafici Recharts)
│   │   ├── EditionUserLists.js     # Liste registrati + retarget per edizione
│   │   ├── BrandComparison.js      # Tabella confronto brand
│   │   ├── GenreComparison.js      # Confronto per genere
│   │   └── LocationComparison.js   # Confronto per locale
│   ├── screens/
│   │   ├── EventManagerModal.js    # Gestione eventi: rename, categorie, generi, venue
│   │   ├── LoginScreen.js          # Login Google
│   │   └── UploadScreen.js         # Upload CSV
│   └── shared/                     # Badge, KPI, ScaleToggle, Heatmap, Section
└── contexts/
    └── AuthContext.js              # Auth context Firebase
```

## Dati e privacy
- I dati arrivano dagli export del portale creazioni (`biglietti_*.csv`, `utenti_*.csv`, separatore `;`) caricati dalla UI. Contengono dati personali: **mai committare CSV/Excel** (sono in `.gitignore`).
- Accesso al database: `firestore.rules` (solo gli account di `AuthContext.js`). Le regole si pubblicano a mano dalla console Firebase (Firestore > Regole): tenere il file allineato.
- Export sovrapposti: `loadAllData()` unisce tutti i dataset con le regole di `datasetMerge.js`. Un biglietto = un codice; la copia più recente vince ma un ingresso non si perde mai (il portale ha perso gli ingressi dell'Atipico 21.02.26, salvati solo nel dataset di febbraio). Gli export di feb e ott 2026 differiscono di 1h sugli orari invernali.
- Dopo un upload, `pruneSupersededDatasets()` elimina solo i dataset interamente contenuti nei successivi, ingressi compresi. `ds_biglietti_21_02` contiene anche i 4 Atipico 2024/25 della vecchia piattaforma (senza email, collegati alle persone per telefono): non va cancellato.
- Edizione = data evento (`DD.MM.YY`). La data viene dal nome (anno dedotto dalle registrazioni), altrimenti dalla notte con più ingressi, altrimenti da `EVENT_DATE_OVERRIDES` (da aggiornare per eventi futuri senza data nel nome).

## Pattern Importanti

### Design Tokens
Tutto lo styling usa `designTokens.js`. Import: `{ colors, alpha, font, radius, gradients, presets, spacing, transition }`. Mai usare colori hardcoded.

### Event Config (Firebase)
Document Firestore `appConfig/eventConfig`:
```js
{ brands: { "BRAND": { displayName, category, genres, venue, aliases } },
  excludedBrands: [...], renames: { "OLD": "NEW" },
  editionRenames: { "BRAND": { "old_edition": "new_edition" } } }
```
Caricato al boot con `Promise.all([loadEventConfig(), hasStoredData()])`, applicato ai record tramite `applyEventConfig()` in App.js.

### Live Tracker (comparisonEngine.js)
- `computeWhereAreWeNow(allData, brand, edition, overrides, { now, dataAsOf })` — tracker singolo brand con confronto edizioni precedenti. Il punto di confronto è l'ora dell'ultima registrazione nei dati (l'ora attuale se c'è un override), come momento relativo al giorno evento; solo edizioni concluse e con data
- `summarizeComparisons(comps, current, isPast)` — media allo stesso punto, media finale e proiezione (mediana dei rapporti + intervallo): unica fonte per KPI, grafico, filtri per anno e report AI
- Regole di tempo in `utils/eventTime.js`: giorni all'evento per calendario, edizione conclusa alle 6 del giorno dopo, `conversionOf` solo su serate concluse con ingressi
- `computeCrossBrandComparison(allData, brandA, brandB, specificEditionB?)` — confronto tra brand
- `buildCumulativeCurve(rows)` — curva cumulativa registrazioni per daysBefore
- Override: `{ mode: 'now', value }` o `{ mode: 'daily', days: { daysBefore: cumulative } }`

### Chart Styling (WhereAreWeNow.js)
- Edizione corrente: solid purple (`colors.brand.purple`), strokeWidth 3
- Edizioni passate: grey con opacity decrescente `rgba(148, 163, 184, ${opacity})`
- Proiezione: green dashed (`colors.status.success`)
- Legend clickabile: `hiddenLines` Set per toggle visibilità linee
- Log scale: zeri → null, domain min 1, `connectNulls`

### KPI Differenziati (past vs future)
`isEventPast` determina label e metriche mostrate:
- Past: "Registrazioni totali", "Presenze", "Conversione", "Media finale altre edizioni"
- Future: "Registrazioni attuali", "Media allo stesso punto", "Proiezione finale"

### WhatsApp Templates
In `whatsapp.js` (retarget) e `BirthdaysTab.js` (compleanni). Tutti includono disclaimer OPT_OUT: "Invia STOP per non ricevere più messaggi promozionali."

## Convenzioni
- UI tutta in italiano
- `npm run build` deve passare a zero errori/warning prima di push (la build in CI tratta i warning come errori)
- Test: `npx react-scripts test --watchAll=false`
- Test sul deploy Cloudflare (PC + iPhone)
- Git tag per stati stabili (es. `v2.1-stable`)
- Commit message in inglese, UI in italiano
