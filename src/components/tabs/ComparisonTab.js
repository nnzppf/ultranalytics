import { useState, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import WhereAreWeNow from '../comparison/WhereAreWeNow';
import BrandComparison from '../comparison/BrandComparison';
import GenreComparison from '../comparison/GenreComparison';
import LocationComparison from '../comparison/LocationComparison';
import { compareBrands, compareGenres, compareLocations, computeWhereAreWeNow, getBrandsWithMultipleEditions } from '../../utils/comparisonEngine';
import { GENRE_LABELS } from '../../config/eventConfig';

export default function ComparisonTab({ data }) {
  const [view, setView] = useState('genre'); // genre | brand | location | tracker
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedEdition, setSelectedEdition] = useState(null);

  const genreStats = useMemo(() => compareGenres(data), [data]);
  const allBrandStats = useMemo(() => compareBrands(data), [data]);
  const locationStats = useMemo(() => compareLocations(data), [data]);
  const multiEditionBrands = useMemo(() => getBrandsWithMultipleEditions(data), [data]);

  const filteredBrandStats = useMemo(() => {
    if (!selectedGenre) return allBrandStats;
    return allBrandStats.filter(b => b.genres?.includes(selectedGenre));
  }, [allBrandStats, selectedGenre]);

  const trackerData = useMemo(() => {
    if (!selectedBrand || !selectedEdition) return null;
    return computeWhereAreWeNow(data, selectedBrand, selectedEdition);
  }, [data, selectedBrand, selectedEdition]);

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
        <GenreComparison genreStats={genreStats} onSelectGenre={handleSelectGenre} />
      )}

      {view === 'brand' && (
        <BrandComparison brandStats={filteredBrandStats} onSelectBrand={handleSelectBrand} />
      )}

      {view === 'location' && (
        <LocationComparison locationStats={locationStats} />
      )}

      {view === 'tracker' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Edition / brand selector for tracker */}
          {!selectedBrand && (
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                Seleziona un brand con più edizioni per vedere il Live Tracker:
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {multiEditionBrands.map(b => (
                  <button key={b.brand} onClick={() => handleSelectBrand(b.brand)} style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 12, border: "1px solid #334155",
                    cursor: "pointer", background: "#1e293b", color: "#f1f5f9",
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
