# Changelog - Ultranalytics

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
