# Ultranalytics — Club Analytics Dashboard

## Progetto
Web app React per analisi dati eventi/serate di club (Studios Club & Co). Deployata su Vercel da `nnzppf/ultranalytics`, branch `main`. Ogni push su main triggera deploy automatico.

## Stack
- React 18 (CRA), Recharts per grafici, Lucide React per icone
- Firebase: Firestore (config eventi, dati) + Auth (Google login) + Storage
- Vercel: hosting + deploy automatico
- Nessun CSS framework — tutto inline styles con design tokens centralizzati

## Struttura Chiave

```
src/
├── App.js                          # Root: auth, data loading, tab routing, eventConfig boot
├── config/
│   ├── designTokens.js             # colors, alpha, font, radius, gradients, presets, spacing
│   ├── eventConfig.js              # BRAND_REGISTRY, EXCLUDED_EVENTS, GENRE_LABELS
│   ├── firebase.js                 # Firebase init (progetto: ultranalytics-8582c)
│   └── constants.js                # TOOLTIP_STYLE, ecc.
├── utils/
│   ├── comparisonEngine.js         # Core analytics: WhereAreWeNow, cross-brand, genre/brand/location comparison
│   ├── csvProcessor.js             # Parsing CSV upload → record strutturati
│   ├── eventNameCleaner.js         # Normalizzazione nomi eventi → brand + edizione
│   ├── dataTransformers.js         # getUserStats, fasce orarie, heatmap, trends
│   ├── whatsapp.js                 # URL WhatsApp, templates retarget con {nome}/{brand}/{data}/{link}
│   └── dateParser.js               # Parsing date italiane
├── services/
│   ├── eventConfigService.js       # Firestore: load/save eventConfig (appConfig/eventConfig)
│   ├── firebaseDataService.js      # Persistenza dati su Firestore
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
- `computeWhereAreWeNow(allData, brand, edition, overrides)` — tracker singolo brand con confronto edizioni precedenti
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
- `npm run build` deve passare a zero errori/warning prima di push
- Test su Vercel deploy (PC + iPhone)
- Git tag per stati stabili (es. `v2.1-stable`)
- Commit message in inglese, UI in italiano
