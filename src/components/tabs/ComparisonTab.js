import { useState, useMemo, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import WhereAreWeNow from '../comparison/WhereAreWeNow';
import EditionUserLists from '../comparison/EditionUserLists';
import BrandComparison from '../comparison/BrandComparison';
import GenreComparison from '../comparison/GenreComparison';
import LocationComparison from '../comparison/LocationComparison';
import { Link2 } from 'lucide-react';
import { compareBrands, compareGenres, compareLocations, computeWhereAreWeNow, computeCrossBrandComparison, getBrandsWithMultipleEditions, computeEditionUserLists } from '../../utils/comparisonEngine';
import { getUserStats } from '../../utils/dataTransformers';
import { GENRE_LABELS } from '../../config/eventConfig';

export default function ComparisonTab({ data, filtered, selectedBrand: topSelectedBrand, selectedCategory }) {
  const [view, setView] = useState('genre'); // genre | brand | location | tracker
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedEdition, setSelectedEdition] = useState(null);

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
  const multiEditionBrands = useMemo(() => getBrandsWithMultipleEditions(baseData), [baseData]);

  // Cross-brand mode: user explicitly opted to compare against another brand
  const [crossBrandTarget, setCrossBrandTarget] = useState(null);
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

  // Manual event link input — user pastes the registration URL
  const [eventLinkInput, setEventLinkInput] = useState('');

  const trackerData = useMemo(() => {
    const brand = selectedBrand || (view === 'tracker' ? highlightBrand : null);
    if (!brand) return null;
    // Cross-brand comparison (explicitly selected)
    if (crossBrandTarget) {
      return computeCrossBrandComparison(baseData, brand, crossBrandTarget);
    }
    // Normal single-brand tracker (needs edition selected)
    if (!selectedEdition) return null;
    return computeWhereAreWeNow(baseData, brand, selectedEdition);
  }, [baseData, selectedBrand, highlightBrand, view, selectedEdition, crossBrandTarget]);

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
  breadcrumb.push({ label: 'Confronti', action: () => { setSelectedGenre(null); setSelectedBrand(null); setSelectedEdition(null); } });
  if (selectedGenre) {
    breadcrumb.push({ label: GENRE_LABELS[selectedGenre]?.label || selectedGenre, action: () => { setSelectedBrand(null); setSelectedEdition(null); } });
  }
  if (selectedBrand) {
    breadcrumb.push({ label: selectedBrand, action: () => { setSelectedEdition(null); } });
  }
  if (selectedEdition) {
    breadcrumb.push({ label: selectedEdition, action: null });
  }

  const handleSelectGenre = (genre) => {
    setSelectedGenre(genre);
    setSelectedBrand(null);
    setSelectedEdition(null);
    setView('brand');
  };

  const handleSelectBrand = (brand) => {
    setSelectedBrand(brand);
    setSelectedEdition(null);
    setCrossBrandTarget(null);
    const brandInfo = multiEditionBrands.find(b => b.brand === brand);
    if (brandInfo && brandInfo.editions.length >= 2) {
      setSelectedEdition(brandInfo.editions[brandInfo.editions.length - 1]);
      setView('tracker');
    }
  };

  // The effective brand for the tracker: selectedBrand or auto from top bar
  const effectiveBrand = selectedBrand || (view === 'tracker' && highlightBrand) || null;

  // Auto-select latest edition when entering tracker with a brand from top bar
  useEffect(() => {
    if (view === 'tracker' && highlightBrand && !selectedBrand && !selectedEdition) {
      const brandInfo = multiEditionBrands.find(b => b.brand === highlightBrand);
      if (brandInfo && brandInfo.editions.length > 0) {
        setSelectedEdition(brandInfo.editions[brandInfo.editions.length - 1]);
      }
    }
  }, [view, highlightBrand, selectedBrand, selectedEdition, multiEditionBrands]);

  const tabs = [
    { key: 'genre', label: 'Per Genere' },
    { key: 'brand', label: 'Per Brand' },
    { key: 'location', label: 'Per Location' },
    { key: 'tracker', label: 'Live Tracker', highlight: true },
  ];

  return (
    <div>
      {/* Context banner when a brand is selected in top bar */}
      {highlightBrand && (
        <div style={{
          background: "linear-gradient(90deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))",
          borderRadius: 10, padding: "10px 16px", marginBottom: 14,
          border: "1px solid rgba(139,92,246,0.3)",
          display: "flex", alignItems: "center", gap: 8, fontSize: 12,
        }}>
          <span style={{ color: "#94a3b8" }}>Confronti in evidenza per</span>
          <span style={{ color: "#8b5cf6", fontWeight: 700 }}>{highlightBrand}</span>
          <span style={{ color: "#64748b" }}>vs tutti i brand</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => {
            setView(t.key);
            setCrossBrandTarget(null);
            if (t.key === 'genre') { setSelectedGenre(null); setSelectedBrand(null); setSelectedEdition(null); }
            if (t.key === 'brand') { setSelectedBrand(null); setSelectedEdition(null); }
            if (t.key === 'tracker') { setSelectedBrand(null); setSelectedEdition(null); }
          }} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, border: "none", cursor: "pointer",
            background: view === t.key ? (t.highlight ? "linear-gradient(135deg, #7c3aed, #ec4899)" : "#8b5cf6") : "#1e293b",
            color: view === t.key ? "#fff" : "#94a3b8", fontWeight: view === t.key ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Breadcrumb */}
      {(selectedGenre || selectedBrand) && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14, fontSize: 12 }}>
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <ChevronRight size={12} color="#475569" />}
              {b.action ? (
                <button onClick={b.action} style={{
                  background: "none", border: "none", color: "#8b5cf6", cursor: "pointer",
                  fontSize: 12, padding: 0, textDecoration: "underline",
                }}>{b.label}</button>
              ) : (
                <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{b.label}</span>
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
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                Seleziona un brand con più edizioni per vedere il Live Tracker:
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {multiEditionBrands.map(b => (
                  <button key={b.brand} onClick={() => handleSelectBrand(b.brand)} style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 12,
                    border: "1px solid #334155",
                    cursor: "pointer", background: "#1e293b",
                    color: "#f1f5f9",
                  }}>
                    {b.brand} <span style={{ color: "#64748b" }}>({b.editions.length} edizioni)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Edition selector + cross-brand option */}
          {effectiveBrand && !isCrossBrandMode && (() => {
            const brandInfo = multiEditionBrands.find(b => b.brand === effectiveBrand);
            const editions = brandInfo?.editions || [];
            // Auto-select latest edition if none selected
            const activeEdition = selectedEdition || (editions.length > 0 ? editions[editions.length - 1] : null);
            // Sync state if auto-selected
            if (activeEdition && !selectedEdition) {
              // Will be set via effect below
            }
            return (
              <div>
                {editions.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#64748b", marginRight: 4 }}>Edizione:</span>
                    {editions.map(ed => (
                      <button key={ed} onClick={() => { setSelectedEdition(ed); setCrossBrandTarget(null); }} style={{
                        padding: "5px 12px", borderRadius: 6, fontSize: 11, border: "none", cursor: "pointer",
                        background: (selectedEdition || activeEdition) === ed ? "#8b5cf6" : "#334155",
                        color: (selectedEdition || activeEdition) === ed ? "#fff" : "#94a3b8",
                      }}>{ed}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Cross-brand comparison section */}
          {effectiveBrand && isCrossBrandMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                Confronto: <strong style={{ color: "#8b5cf6" }}>{effectiveBrand}</strong> vs <strong style={{ color: "#ec4899" }}>{crossBrandTarget}</strong>
              </span>
              <button onClick={() => setCrossBrandTarget(null)} style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 10, border: "1px solid #334155",
                background: "transparent", color: "#94a3b8", cursor: "pointer",
              }}>
                Torna alle edizioni
              </button>
            </div>
          )}

          {trackerData && <WhereAreWeNow comparisonData={trackerData} />}

          {/* Event link input + Edition user lists (single-brand mode only) */}
          {editionUsers && !isCrossBrandMode && (
            <>
              {/* Event registration link input */}
              <div style={{
                background: "#1e293b", borderRadius: 12, padding: 16,
                border: "1px solid #334155",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Link2 size={14} color="#8b5cf6" />
                  <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>
                    Link registrazione evento
                  </span>
                </div>
                <input
                  type="url"
                  placeholder="Incolla qui il link dell'evento (es. https://www.creazionisrl.it/toolate/...)"
                  value={eventLinkInput}
                  onChange={e => setEventLinkInput(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8,
                    background: "#0f172a", border: "1px solid #334155",
                    color: "#f1f5f9", fontSize: 12, outline: "none",
                    fontFamily: "inherit",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#8b5cf6"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#334155"; }}
                />
                {eventLinkInput && (
                  <div style={{ fontSize: 10, color: "#10b981", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    ✓ Il link verrà incluso nei messaggi WhatsApp di invito
                  </div>
                )}
                {!eventLinkInput && (
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>
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

          {/* Cross-brand option: show only in single-brand mode with data loaded */}
          {effectiveBrand && !isCrossBrandMode && trackerData && (
            <div style={{
              background: "#0f172a", borderRadius: 12, padding: 16,
              border: "1px solid #334155",
            }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
                Confronta con altro brand
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {allBrandStats
                  .filter(b => b.brand !== effectiveBrand)
                  .map(b => (
                    <button key={b.brand} onClick={() => setCrossBrandTarget(b.brand)} style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 11,
                      border: "1px solid #334155",
                      cursor: "pointer", background: "#1e293b",
                      color: "#f1f5f9",
                    }}>
                      {b.brand} <span style={{ color: "#64748b" }}>({b.editionCount} ediz.)</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
