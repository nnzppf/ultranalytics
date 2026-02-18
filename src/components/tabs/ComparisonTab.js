import { useState, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import WhereAreWeNow from '../comparison/WhereAreWeNow';
import BrandComparison from '../comparison/BrandComparison';
import GenreComparison from '../comparison/GenreComparison';
import LocationComparison from '../comparison/LocationComparison';
import { compareBrands, compareGenres, compareLocations, computeWhereAreWeNow, getBrandsWithMultipleEditions } from '../../utils/comparisonEngine';
import { GENRE_LABELS } from '../../config/eventConfig';

export default function ComparisonTab({ data, filtered, selectedBrand: topSelectedBrand, selectedCategory }) {
  const [view, setView] = useState('genre'); // genre | brand | location | tracker
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedEdition, setSelectedEdition] = useState(null);

  // Use all non-senior data for comparisons (so we always have something to compare against)
  const baseData = useMemo(() => data.filter(d => d.category !== 'senior'), [data]);

  // Genre stats: always from full data, highlight the selected brand's genre
  const genreStats = useMemo(() => compareGenres(baseData), [baseData]);

  // Brand stats: filter by genre if drilled down, always from full data
  const allBrandStats = useMemo(() => compareBrands(baseData), [baseData]);

  const filteredBrandStats = useMemo(() => {
    if (!selectedGenre) return allBrandStats;
    return allBrandStats.filter(b => b.genres?.includes(selectedGenre));
  }, [allBrandStats, selectedGenre]);

  const locationStats = useMemo(() => compareLocations(baseData), [baseData]);
  const multiEditionBrands = useMemo(() => getBrandsWithMultipleEditions(baseData), [baseData]);

  const trackerData = useMemo(() => {
    if (!selectedBrand || !selectedEdition) return null;
    return computeWhereAreWeNow(baseData, selectedBrand, selectedEdition);
  }, [baseData, selectedBrand, selectedEdition]);

  // If a brand is selected in the top bar, highlight it in comparisons
  const highlightBrand = topSelectedBrand !== 'all' ? topSelectedBrand : null;

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
    const brandInfo = multiEditionBrands.find(b => b.brand === brand);
    if (brandInfo && brandInfo.editions.length >= 2) {
      setSelectedEdition(brandInfo.editions[brandInfo.editions.length - 1]);
      setView('tracker');
    }
  };

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
            if (t.key === 'genre') { setSelectedGenre(null); setSelectedBrand(null); setSelectedEdition(null); }
            if (t.key === 'brand') { setSelectedBrand(null); setSelectedEdition(null); }
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
          {!selectedBrand && (
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                Seleziona un brand con più edizioni per vedere il Live Tracker:
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {multiEditionBrands.map(b => (
                  <button key={b.brand} onClick={() => handleSelectBrand(b.brand)} style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 12,
                    border: b.brand === highlightBrand ? "2px solid #8b5cf6" : "1px solid #334155",
                    cursor: "pointer", background: b.brand === highlightBrand ? "rgba(139,92,246,0.1)" : "#1e293b",
                    color: "#f1f5f9",
                  }}>
                    {b.brand} <span style={{ color: "#64748b" }}>({b.editions.length} edizioni)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedBrand && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {(() => {
                const brandInfo = multiEditionBrands.find(b => b.brand === selectedBrand);
                if (!brandInfo) return null;
                return brandInfo.editions.map(ed => (
                  <button key={ed} onClick={() => setSelectedEdition(ed)} style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 11, border: "none", cursor: "pointer",
                    background: selectedEdition === ed ? "#8b5cf6" : "#334155",
                    color: selectedEdition === ed ? "#fff" : "#94a3b8",
                  }}>{ed}</button>
                ));
              })()}
            </div>
          )}

          {trackerData && <WhereAreWeNow comparisonData={trackerData} />}
        </div>
      )}
    </div>
  );
}
