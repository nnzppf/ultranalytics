import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, Link2, Users, Calendar } from 'lucide-react';
import Dropdown from '../shared/Dropdown';
import WhereAreWeNow from '../comparison/WhereAreWeNow';
import EditionUserLists from '../comparison/EditionUserLists';
import BrandComparison from '../comparison/BrandComparison';
import GenreComparison from '../comparison/GenreComparison';
import LocationComparison from '../comparison/LocationComparison';
import { compareBrands, compareGenres, compareLocations, computeWhereAreWeNow, computeCrossBrandComparison, getBrandsForTracker, computeEditionUserLists } from '../../utils/comparisonEngine';
import { getUserStats } from '../../utils/dataTransformers';
import { GENRE_LABELS } from '../../config/eventConfig';
import { colors, font, radius, gradients, alpha, transition as tr } from '../../config/designTokens';

export default function ComparisonTab({ data, filtered, selectedBrand: topSelectedBrand, selectedCategory, selectedEdition: topSelectedEdition }) {
  const [view, setView] = useState('tracker'); // genre | brand | location | tracker
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [localSelectedEdition, setLocalSelectedEdition] = useState(null);

  // If the top bar has a specific edition selected, use it; otherwise fall back to local state
  const topEditionActive = topSelectedEdition && topSelectedEdition !== 'all';
  const selectedEdition = topEditionActive ? topSelectedEdition : localSelectedEdition;

  // Use all non-senior data for comparisons (so we always have something to compare against)
  const baseData = useMemo(() => data.filter(d => d.category !== 'senior'), [data]);

  // If a brand is selected in the top bar, highlight it in comparisons
  const highlightBrand = topSelectedBrand !== 'all' ? topSelectedBrand : null;

  // Genre stats: exclude selected brand so comparisons are fair
  const genreStats = useMemo(() => compareGenres(baseData, highlightBrand), [baseData, highlightBrand]);

  // Brand stats: filter by genre if drilled down, always from full data
  const allBrandStats = useMemo(() => compareBrands(baseData), [baseData]);

  const filteredBrandStats = useMemo(() => {
    if (!selectedGenre) return allBrandStats;
    return allBrandStats.filter(b => b.genres?.includes(selectedGenre));
  }, [allBrandStats, selectedGenre]);

  const locationStats = useMemo(() => compareLocations(baseData), [baseData]);
  const trackerBrands = useMemo(() => getBrandsForTracker(baseData), [baseData]);

  // Map edition → year tag (e.g. "'24") for display
  const editionYearMap = useMemo(() => {
    const map = {};
    for (const d of baseData) {
      if (d.editionLabel && d.eventDate && !map[d.editionLabel]) {
        map[d.editionLabel] = "'" + String(d.eventDate.getFullYear()).slice(-2);
      }
    }
    return map;
  }, [baseData]);

  // Cross-brand mode: user explicitly opted to compare against another brand
  const [crossBrandTarget, setCrossBrandTarget] = useState(null);
  const [crossBrandEdition, setCrossBrandEdition] = useState(null); // specific edition of cross-brand target
  const isCrossBrandMode = !!crossBrandTarget;

  // Edition user lists (registered + retarget) — uses effectiveBrand
  const editionUsers = useMemo(() => {
    const brand = selectedBrand || highlightBrand;
    if (!brand || !selectedEdition || isCrossBrandMode) return null;
    return computeEditionUserLists(baseData, brand, selectedEdition);
  }, [baseData, selectedBrand, highlightBrand, selectedEdition, isCrossBrandMode]);

  // User stats for segment badges in edition lists
  const userStatsForBrand = useMemo(() => {
    const brand = selectedBrand || highlightBrand;
    if (!brand) return null;
    const brandData = baseData.filter(d => d.brand === brand);
    return getUserStats(brandData);
  }, [baseData, selectedBrand, highlightBrand]);

  // Manual override: 'now' = single total, 'daily' = per-day cumulative values
  const [overrideMode, setOverrideMode] = useState('now');
  const [manualCount, setManualCount] = useState('');
  const [dailyCounts, setDailyCounts] = useState({});

  // Manual event link input — user pastes the registration URL
  const [eventLinkInput, setEventLinkInput] = useState('');

  // Build overrides object for engine
  const overrides = useMemo(() => {
    if (overrideMode === 'now') {
      const val = manualCount ? parseInt(manualCount, 10) : null;
      return val ? { mode: 'now', value: val } : null;
    }
    // daily mode: convert dailyCounts { daysBefore: "55" } → { daysBefore: 55 }
    const days = {};
    let hasAny = false;
    for (const [d, v] of Object.entries(dailyCounts)) {
      const parsed = v ? parseInt(v, 10) : null;
      if (parsed && parsed > 0) { days[Number(d)] = parsed; hasAny = true; }
    }
    return hasAny ? { mode: 'daily', days } : null;
  }, [overrideMode, manualCount, dailyCounts]);

  const trackerData = useMemo(() => {
    const brand = selectedBrand || (view === 'tracker' ? highlightBrand : null);
    if (!brand) return null;
    // Cross-brand comparison (explicitly selected)
    if (crossBrandTarget) {
      return computeCrossBrandComparison(baseData, brand, crossBrandTarget, crossBrandEdition);
    }
    // Normal single-brand tracker (needs edition selected)
    if (!selectedEdition) return null;
    return computeWhereAreWeNow(baseData, brand, selectedEdition, overrides);
  }, [baseData, selectedBrand, highlightBrand, view, selectedEdition, crossBrandTarget, crossBrandEdition, overrides]);

  // Stats of the highlighted brand (for brand-vs-genre comparison)
  const highlightBrandStats = useMemo(() => {
    if (!highlightBrand) return null;
    return allBrandStats.find(b => b.brand === highlightBrand) || null;
  }, [highlightBrand, allBrandStats]);

  // Auto-detect genre of highlighted brand for genre comparison
  const highlightGenres = useMemo(() => {
    if (!highlightBrandStats) return [];
    return highlightBrandStats.genres || [];
  }, [highlightBrandStats]);

  // Auto-detect location of highlighted brand
  const highlightLocation = useMemo(() => {
    if (!highlightBrand) return null;
    const brandRow = baseData.find(d => d.brand === highlightBrand);
    return brandRow?.location || null;
  }, [highlightBrand, baseData]);

  const breadcrumb = [];
  breadcrumb.push({ label: 'Confronti', action: () => { setSelectedGenre(null); setSelectedBrand(null); setLocalSelectedEdition(null); } });
  if (selectedGenre) {
    breadcrumb.push({ label: GENRE_LABELS[selectedGenre]?.label || selectedGenre, action: () => { setSelectedBrand(null); setLocalSelectedEdition(null); } });
  }
  if (selectedBrand) {
    breadcrumb.push({ label: selectedBrand, action: () => { setLocalSelectedEdition(null); } });
  }
  if (selectedEdition) {
    breadcrumb.push({ label: selectedEdition, action: null });
  }

  const handleSelectGenre = (genre) => {
    setSelectedGenre(genre);
    setSelectedBrand(null);
    setLocalSelectedEdition(null);
    setView('brand');
  };

  const handleSelectBrand = (brand) => {
    setSelectedBrand(brand);
    setLocalSelectedEdition(null);
    setCrossBrandTarget(null);
    setCrossBrandEdition(null);
    setManualCount('');
    setDailyCounts({});
    const brandInfo = trackerBrands.find(b => b.brand === brand);
    if (brandInfo && brandInfo.editions.length >= 1) {
      setLocalSelectedEdition(brandInfo.editions[brandInfo.editions.length - 1]);
      setView('tracker');
    }
  };

  // The effective brand for the tracker: selectedBrand or auto from top bar
  const effectiveBrand = selectedBrand || (view === 'tracker' && highlightBrand) || null;

  // Auto-select latest edition when entering tracker with a brand from top bar
  useEffect(() => {
    if (view === 'tracker' && highlightBrand && !selectedBrand && !selectedEdition) {
      const brandInfo = trackerBrands.find(b => b.brand === highlightBrand);
      if (brandInfo && brandInfo.editions.length > 0) {
        setLocalSelectedEdition(brandInfo.editions[brandInfo.editions.length - 1]);
      }
    }
  }, [view, highlightBrand, selectedBrand, selectedEdition, trackerBrands]);

  const tabs = [
    { key: 'tracker', label: 'Live Tracker', highlight: true },
    { key: 'genre', label: 'Per Genere' },
    { key: 'brand', label: 'Per Brand' },
    { key: 'location', label: 'Per Location' },
  ];

  return (
    <div>
      {/* Context banner when a brand is selected in top bar */}
      {highlightBrand && (
        <div style={{
          background: gradients.highlight,
          borderRadius: radius.xl, padding: "10px 16px", marginBottom: 14,
          border: `1px solid ${alpha.brand[30]}`,
          display: "flex", alignItems: "center", gap: 8, fontSize: font.size.sm,
        }}>
          <span style={{ color: colors.text.muted }}>Confronti in evidenza per</span>
          <span style={{ color: colors.brand.purple, fontWeight: font.weight.bold }}>{highlightBrand}</span>
          <span style={{ color: colors.text.disabled }}>vs tutti i brand</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="comparison-sub-tabs" style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => {
            setView(t.key);
            setCrossBrandTarget(null);
            setCrossBrandEdition(null);
            if (t.key === 'genre') { setSelectedGenre(null); setSelectedBrand(null); setLocalSelectedEdition(null); }
            if (t.key === 'brand') { setSelectedBrand(null); setLocalSelectedEdition(null); }
            if (t.key === 'tracker') { setSelectedBrand(null); setLocalSelectedEdition(null); }
          }} style={{
            padding: "6px 14px", borderRadius: radius.lg, fontSize: font.size.sm, border: "none", cursor: "pointer",
            background: view === t.key ? (t.highlight ? gradients.brand : colors.interactive.active) : colors.bg.card,
            color: view === t.key ? colors.interactive.activeText : colors.interactive.inactiveText,
            fontWeight: view === t.key ? font.weight.semibold : font.weight.medium,
            transition: tr.normal,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Breadcrumb */}
      {(selectedGenre || selectedBrand) && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14, fontSize: 12 }}>
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <ChevronRight size={12} color={colors.border.strong} />}
              {b.action ? (
                <button onClick={b.action} style={{
                  background: "none", border: "none", color: colors.brand.purple, cursor: "pointer",
                  fontSize: font.size.sm, padding: 0, textDecoration: "underline",
                }}>{b.label}</button>
              ) : (
                <span style={{ color: colors.text.primary, fontWeight: font.weight.semibold }}>{b.label}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      {view === 'genre' && !selectedGenre && (
        <GenreComparison genreStats={genreStats} onSelectGenre={handleSelectGenre} highlightGenres={highlightGenres} highlightBrand={highlightBrand} highlightBrandStats={highlightBrandStats} />
      )}

      {view === 'brand' && (
        <BrandComparison brandStats={filteredBrandStats} onSelectBrand={handleSelectBrand} highlightBrand={highlightBrand} />
      )}

      {view === 'location' && (
        <LocationComparison locationStats={locationStats} highlightLocation={highlightLocation} highlightBrand={highlightBrand} />
      )}

      {view === 'tracker' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Brand selector: only when no brand is selected (neither from top bar nor manually) */}
          {!effectiveBrand && (
            <div>
              <div style={{ fontSize: font.size.sm, color: colors.text.muted, marginBottom: 8 }}>
                Seleziona un brand per vedere il Live Tracker:
              </div>
              {/* Desktop: buttons */}
              <div className="tracker-brand-buttons" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...trackerBrands].sort((a, b) => a.brand.localeCompare(b.brand)).map(b => (
                  <button key={b.brand} onClick={() => handleSelectBrand(b.brand)} style={{
                    padding: "8px 16px", borderRadius: radius.lg, fontSize: font.size.sm,
                    border: `1px solid ${colors.border.default}`,
                    cursor: "pointer", background: colors.bg.card,
                    color: colors.text.primary,
                  }}>
                    {b.brand} <span style={{ color: colors.text.disabled }}>({b.editions.length} edizioni)</span>
                  </button>
                ))}
              </div>
              {/* Mobile: dropdown */}
              <div className="tracker-brand-dropdown" style={{ display: "none" }}>
                <Dropdown
                  value={null}
                  onChange={(brand) => handleSelectBrand(brand)}
                  placeholder="Seleziona brand..."
                  options={[...trackerBrands].sort((a, b) => a.brand.localeCompare(b.brand)).map(b => ({ value: b.brand, label: b.brand, count: b.editions.length }))}
                />
              </div>
            </div>
          )}

          {/* Edition selector + cross-brand option */}
          {effectiveBrand && !isCrossBrandMode && (() => {
            const brandInfo = trackerBrands.find(b => b.brand === effectiveBrand);
            const editions = brandInfo?.editions || [];
            // Auto-select latest edition if none selected
            const activeEdition = selectedEdition || (editions.length > 0 ? editions[editions.length - 1] : null);
            // Sync state if auto-selected
            if (activeEdition && !selectedEdition) {
              // Will be set via effect below
            }
            return (
              <div>
                {editions.length > 0 && !topEditionActive && (
                  <>
                    {/* Desktop: edition buttons — hidden when top bar has a specific edition */}
                    <div className="tracker-edition-buttons" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                      <span style={{ fontSize: font.size.xs, color: colors.text.disabled, marginRight: 4 }}>Edizione:</span>
                      {editions.map(ed => (
                        <button key={ed} onClick={() => { setLocalSelectedEdition(ed); setCrossBrandTarget(null); setManualCount(''); setDailyCounts({}); }} style={{
                          padding: "5px 12px", borderRadius: radius.md, fontSize: font.size.xs, border: "none", cursor: "pointer",
                          background: (selectedEdition || activeEdition) === ed ? colors.interactive.active : colors.interactive.inactive,
                          color: (selectedEdition || activeEdition) === ed ? colors.interactive.activeText : colors.interactive.inactiveText,
                          transition: tr.normal,
                        }}>{ed}{editionYearMap[ed] && <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 3 }}>{editionYearMap[ed]}</span>}</button>
                      ))}
                    </div>
                    {/* Mobile: edition dropdown */}
                    <div className="tracker-edition-dropdown" style={{ display: "none", marginBottom: 8 }}>
                      <Dropdown
                        value={selectedEdition || activeEdition}
                        onChange={(ed) => { setLocalSelectedEdition(ed); setCrossBrandTarget(null); setManualCount(''); setDailyCounts({}); }}
                        placeholder="Edizione"
                        options={editions.map(ed => ({ value: ed, label: editionYearMap[ed] ? `${ed} ${editionYearMap[ed]}` : ed }))}
                      />
                    </div>
                  </>
                )}
                {/* Confronta con altro brand — compact row */}
                {/* Desktop: buttons */}
                <div className="tracker-compare-buttons" style={{
                  display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
                  marginTop: 8, padding: "8px 12px",
                  background: alpha.pink[8], borderRadius: radius.lg,
                  border: `1px solid ${alpha.pink[20]}`,
                }}>
                  <span style={{ fontSize: font.size.xs, color: colors.text.muted, fontWeight: font.weight.semibold, marginRight: 2, whiteSpace: "nowrap" }}>
                    Confronta con:
                  </span>
                  {allBrandStats
                    .filter(b => b.brand !== effectiveBrand)
                    .sort((a, b) => a.brand.localeCompare(b.brand))
                    .map(b => (
                      <button key={b.brand} onClick={() => { setCrossBrandTarget(b.brand); setCrossBrandEdition(null); }} style={{
                        padding: "4px 10px", borderRadius: radius.md, fontSize: font.size.xs,
                        border: `1px solid ${alpha.pink[30]}`,
                        cursor: "pointer", background: "transparent",
                        color: colors.text.primary, transition: tr.normal,
                      }}>
                        {b.brand}
                      </button>
                    ))}
                </div>
                {/* Mobile: dropdown */}
                <div className="tracker-compare-dropdown" style={{
                  display: "none", marginTop: 8, padding: "8px 12px",
                  background: alpha.pink[8], borderRadius: radius.lg,
                  border: `1px solid ${alpha.pink[20]}`,
                  alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: font.size.xs, color: colors.text.muted, fontWeight: font.weight.semibold, whiteSpace: "nowrap" }}>
                    Confronta con:
                  </span>
                  <Dropdown
                    value={null}
                    onChange={(brand) => { setCrossBrandTarget(brand); setCrossBrandEdition(null); }}
                    placeholder="Seleziona brand..."
                    options={allBrandStats.filter(b => b.brand !== effectiveBrand).sort((a, b) => a.brand.localeCompare(b.brand)).map(b => ({ value: b.brand, label: b.brand }))}
                  />
                </div>
              </div>
            );
          })()}

          {/* Cross-brand comparison section */}
          {effectiveBrand && isCrossBrandMode && (() => {
            const targetBrandInfo = trackerBrands.find(b => b.brand === crossBrandTarget);
            const targetEditions = targetBrandInfo?.editions || [];
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: font.size.sm, color: colors.text.muted }}>
                    Confronto: <strong style={{ color: colors.brand.purple }}>{effectiveBrand}</strong> vs <strong style={{ color: colors.brand.pink }}>{crossBrandTarget}</strong>
                    {crossBrandEdition && <span style={{ color: colors.brand.pink }}> ({crossBrandEdition})</span>}
                  </span>
                  <button onClick={() => { setCrossBrandTarget(null); setCrossBrandEdition(null); }} style={{
                    padding: "3px 10px", borderRadius: radius.md, fontSize: font.size.xs, border: `1px solid ${colors.border.default}`,
                    background: "transparent", color: colors.text.muted, cursor: "pointer",
                  }}>
                    Torna alle edizioni
                  </button>
                </div>
                {/* Edition filter for cross-brand target */}
                {targetEditions.length > 1 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: font.size.xs, color: colors.text.disabled, marginRight: 4 }}>
                      Edizione {crossBrandTarget}:
                    </span>
                    <button onClick={() => setCrossBrandEdition(null)} style={{
                      padding: "4px 10px", borderRadius: radius.md, fontSize: font.size.xs, border: "none", cursor: "pointer",
                      background: !crossBrandEdition ? colors.brand.pink : colors.interactive.inactive,
                      color: !crossBrandEdition ? colors.text.inverse : colors.interactive.inactiveText,
                      transition: tr.normal,
                    }}>Tutte</button>
                    {targetEditions.map(ed => (
                      <button key={ed} onClick={() => setCrossBrandEdition(ed)} style={{
                        padding: "4px 10px", borderRadius: radius.md, fontSize: font.size.xs, border: "none", cursor: "pointer",
                        background: crossBrandEdition === ed ? colors.brand.pink : colors.interactive.inactive,
                        color: crossBrandEdition === ed ? colors.text.inverse : colors.interactive.inactiveText,
                        transition: tr.normal,
                      }}>{ed}{editionYearMap[ed] && <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 3 }}>{editionYearMap[ed]}</span>}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Manual registration override — only for upcoming events */}
          {effectiveBrand && selectedEdition && !isCrossBrandMode && trackerData && !trackerData.isEventPast && (
            <div style={{
              background: colors.bg.card, borderRadius: radius.xl, padding: "12px 16px",
              border: `1px solid ${overrides ? colors.brand.purple : colors.border.default}`,
              transition: tr.normal,
            }}>
              {/* Mode toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: overrideMode === 'daily' || manualCount ? 10 : 0 }}>
                <div style={{ display: "inline-flex", borderRadius: radius.lg, overflow: "hidden", border: `1px solid ${colors.border.default}` }}>
                  {[{ key: 'now', label: 'Ad ora', icon: Users }, { key: 'daily', label: 'Giorni mancanti', icon: Calendar }].map(({ key, label, icon: Icon }) => {
                    const active = overrideMode === key;
                    return (
                      <button key={key} onClick={() => setOverrideMode(key)} style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 12px", fontSize: font.size.xs, fontWeight: font.weight.semibold,
                        border: "none", cursor: "pointer", transition: tr.normal,
                        background: active ? colors.brand.purple : "transparent",
                        color: active ? colors.text.inverse : colors.text.muted,
                      }}>
                        <Icon size={11} />
                        {label}
                      </button>
                    );
                  })}
                </div>
                {overrides && (
                  <button onClick={() => { setManualCount(''); setDailyCounts({}); }} style={{
                    padding: "3px 8px", borderRadius: radius.md, fontSize: font.size.xs,
                    border: "none", cursor: "pointer",
                    background: alpha.brand[15], color: colors.brand.purple,
                  }}>
                    Reset
                  </button>
                )}
                <span style={{ fontSize: 10, color: colors.text.disabled, marginLeft: "auto" }}>
                  Aggiorna solo la proiezione
                </span>
              </div>

              {/* "Ad ora" mode — single input */}
              {overrideMode === 'now' && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: font.size.xs, color: colors.text.muted, whiteSpace: "nowrap" }}>
                    Registrazioni totali ad ora:
                  </span>
                  <input
                    type="number" min="0"
                    placeholder={String(trackerData.dataRegistrations)}
                    value={manualCount}
                    onChange={e => setManualCount(e.target.value)}
                    style={{
                      width: 80, padding: "5px 10px", borderRadius: radius.md,
                      background: colors.bg.input, border: `1px solid ${colors.border.default}`,
                      color: colors.text.primary, fontSize: font.size.sm, outline: "none",
                      fontFamily: "inherit", textAlign: "center",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = colors.brand.purple; }}
                    onBlur={e => { e.currentTarget.style.borderColor = colors.border.default; }}
                  />
                </div>
              )}

              {/* "Giorni mancanti" mode — one input per missing day */}
              {overrideMode === 'daily' && trackerData.missingDays && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 2 }}>
                    Inserisci le registrazioni <strong>cumulative</strong> (totali) per ogni giorno:
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {trackerData.missingDays.map(d => {
                      const dayLabel = d === trackerData.currentDaysBefore ? 'Oggi'
                        : d === trackerData.currentDaysBefore + 1 ? 'Ieri'
                        : `-${d}gg`;
                      return (
                        <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <span style={{ fontSize: 10, color: colors.text.disabled }}>{dayLabel}</span>
                          <input
                            type="number" min="0"
                            placeholder="-"
                            value={dailyCounts[d] || ''}
                            onChange={e => setDailyCounts(prev => ({ ...prev, [d]: e.target.value }))}
                            style={{
                              width: 64, padding: "5px 6px", borderRadius: radius.md,
                              background: colors.bg.input, border: `1px solid ${colors.border.default}`,
                              color: colors.text.primary, fontSize: font.size.sm, outline: "none",
                              fontFamily: "inherit", textAlign: "center",
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = colors.brand.purple; }}
                            onBlur={e => { e.currentTarget.style.borderColor = colors.border.default; }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {trackerData.missingDays.length === 0 && (
                    <span style={{ fontSize: font.size.xs, color: colors.status.success }}>
                      Nessun giorno mancante — i dati sono aggiornati
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {trackerData && <WhereAreWeNow comparisonData={trackerData} />}

          {/* Event link input + Edition user lists (single-brand mode only) */}
          {editionUsers && !isCrossBrandMode && (
            <>
              {/* Event registration link input */}
              <div style={{
                background: colors.bg.card, borderRadius: radius["2xl"], padding: 16,
                border: `1px solid ${colors.border.default}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Link2 size={14} color={colors.brand.purple} />
                  <span style={{ fontSize: font.size.xs, color: colors.text.muted, textTransform: "uppercase", fontWeight: font.weight.semibold }}>
                    Link registrazione evento
                  </span>
                </div>
                <input
                  type="url"
                  placeholder="Incolla qui il link dell'evento (es. https://www.creazionisrl.it/toolate/...)"
                  value={eventLinkInput}
                  onChange={e => setEventLinkInput(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: radius.lg,
                    background: colors.bg.input, border: `1px solid ${colors.border.default}`,
                    color: colors.text.primary, fontSize: font.size.sm, outline: "none",
                    fontFamily: "inherit",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = colors.brand.purple; }}
                  onBlur={e => { e.currentTarget.style.borderColor = colors.border.default; }}
                />
                {eventLinkInput && (
                  <div style={{ fontSize: font.size.xs, color: colors.status.success, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    ✓ Il link verrà incluso nei messaggi WhatsApp di invito
                  </div>
                )}
                {!eventLinkInput && (
                  <div style={{ fontSize: font.size.xs, color: colors.text.disabled, marginTop: 6 }}>
                    Incolla il link dal sito per includerlo automaticamente nei messaggi WhatsApp
                  </div>
                )}
              </div>

              <EditionUserLists
                registered={editionUsers.registered}
                retarget={editionUsers.retarget}
                brand={effectiveBrand}
                edition={selectedEdition}
                eventDate={editionUsers.eventDate}
                eventLink={eventLinkInput || 'https://www.creazionisrl.it'}
                userStats={userStatsForBrand}
              />
            </>
          )}

          {/* Empty state when cross-brand comparison has no data */}
          {isCrossBrandMode && !trackerData && (
            <div style={{
              background: colors.bg.card, borderRadius: radius["2xl"], padding: 24, textAlign: "center",
              border: `1px solid ${colors.border.default}`,
            }}>
              <div style={{ fontSize: font.size.sm, color: colors.text.muted }}>
                Nessun dato disponibile per il confronto tra <strong style={{ color: colors.brand.purple }}>{effectiveBrand}</strong> e <strong style={{ color: colors.brand.pink }}>{crossBrandTarget}</strong>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
