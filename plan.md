# Piano UI Improvements — Ultranalytics

**Stato salvato:** `v2.5-stable` (commit `7cc8fa7`)
**Se qualcosa va storto:** `git reset --hard v2.5-stable`

---

## Modifica 1 — Empty state per filtri senza risultati (5 min)

**Obiettivo:** Mostrare un messaggio chiaro quando un filtro non restituisce dati.

**Il componente `EmptyState.js` esiste già ma non è mai usato!**

### File coinvolti:
- `src/App.js` — Check globale `filtered.length === 0` prima di renderizzare i tab

### Implementazione:
- Prima di `<TabTransition>`, se `filtered.length === 0` → mostra `<EmptyState>` con icona SearchX, titolo "Nessun dato trovato", descrizione "Prova a cambiare i filtri", bottone "Resetta filtri" che chiama una funzione `resetAllFilters()`
- Anche in `ComparisonTab.js` (riga 586-596) sostituire il div manuale con `<EmptyState />`

### Rischio: Basso — è un wrapper condizionale, non tocca logica esistente

---

## Modifica 2 — Micro-insight sotto i chart di OverviewTab (15 min)

**Obiettivo:** Una riga di testo automatico sotto ogni chart che spiega il dato chiave.

### File coinvolti:
- `src/components/tabs/OverviewTab.js` — 3 punti di inserzione (il chart orario ha già il "Picco")

### Insight previsti:

| Chart | Insight | Esempio |
|-------|---------|---------|
| Andamento per anno | Anno migliore + delta vs precedente | "Anno migliore: 2025 con 1.234 reg. (+18% vs 2024)" |
| Per giorno settimana | Giorno più forte + delta vs media | "Il venerdì è il giorno più forte — 34% sopra la media" |
| Quando si registrano | % ultimi 3 giorni | "Il 68% si registra negli ultimi 3 giorni" |

### Stile:
- Stesso pattern del "Picco" già presente (riga 277 OverviewTab)
- `fontSize: font.size.xs`, `color: colors.text.muted`
- Icona Lightbulb 12px + testo, numeri in `<strong>` con `color: colors.text.primary`
- Calcolati con `useMemo` dai props già disponibili, nessun nuovo transformer

### Rischio: Basso — aggiunge solo elementi visuali, non modifica dati

---

## Modifica 3 — Unire Heatmap + Fasce + Trend → "Analisi Temporale" (15 min)

**Obiettivo:** Ridurre da 7 a 5 tab principali, raggruppando le 3 tab temporali.

### File coinvolti:
- `src/App.js` — Modifica tabs array + rendering
- `src/components/tabs/AnalisiTemporaleTab.js` — **NUOVO** componente wrapper

### Cosa cambia in App.js:
```
PRIMA: overview, heatmap, fasce, trends, confronti, utenti, compleanni (7 tab)
DOPO:  overview, analisi-temporale, confronti, utenti, compleanni (5 tab)
```

### Nuovo componente `AnalisiTemporaleTab.js`:
- Sub-tab buttons: **Heatmap** | **Fasce Orarie** | **Trend** (stesso stile di ComparisonTab)
- Dropdown su mobile (<600px)
- Default su "Heatmap"
- Riceve tutti i props dei 3 tab e li passa al sotto-componente attivo
- I 3 tab originali (`HeatmapTab`, `FasceTab`, `TrendsTab`) restano intatti e vengono renderizzati dentro il wrapper

### Rischio: Medio — riorganizza la navigazione, richiede test su mobile

---

## Ordine di implementazione

| Step | Cosa | Rischio | Tempo |
|------|------|---------|-------|
| 1 | Empty state globale | Basso | 5 min |
| 2 | Micro-insight OverviewTab | Basso | 15 min |
| 3 | Unire tab → Analisi Temporale | Medio | 15 min |

**Totale stimato: ~35 minuti**

Dopo ogni step: build + verifica preview.
Alla fine: test completo → push su Vercel.
