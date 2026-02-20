import { useState, useMemo } from 'react';
import { X, Search, Edit3, Save, Merge, EyeOff, Eye } from 'lucide-react';
import { BRAND_REGISTRY, GENRE_LABELS, CATEGORY_LABELS } from '../../config/eventConfig';
import { colors, font, radius, shadows, alpha, transition as tr } from '../../config/designTokens';

const GENRE_OPTIONS = Object.entries(GENRE_LABELS).map(([key, val]) => ({ key, label: val.label, color: val.color }));
const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([key, val]) => ({ key, label: val.label }));

/**
 * EventManagerModal — fullscreen overlay to manage brand configuration.
 * Props:
 *   data: all loaded records (to extract brands from data)
 *   eventConfig: current custom config from Firebase (or null)
 *   onSave: (newConfig) => void — called when user saves changes
 *   onClose: () => void
 */
export default function EventManagerModal({ data, eventConfig, onSave, onClose }) {
  const [search, setSearch] = useState('');
  const [editingBrand, setEditingBrand] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState(new Set());
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [mergePrimaryName, setMergePrimaryName] = useState('');
  const [showExcluded, setShowExcluded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Build working config from eventConfig or empty
  const [localConfig, setLocalConfig] = useState(() => ({
    brands: eventConfig?.brands || {},
    excludedBrands: eventConfig?.excludedBrands || [],
    renames: eventConfig?.renames || {},
  }));

  // Extract all brands from data + registry
  const allBrands = useMemo(() => {
    const brandMap = {};

    // From loaded data
    for (const d of data) {
      if (!d.brand) continue;
      if (!brandMap[d.brand]) {
        brandMap[d.brand] = {
          name: d.brand,
          category: d.category || 'unknown',
          genres: d.genres || [],
          venue: d.location || '',
          editions: new Set(),
          recordCount: 0,
          inRegistry: !!BRAND_REGISTRY[d.brand],
        };
      }
      if (d.editionLabel) brandMap[d.brand].editions.add(d.editionLabel);
      brandMap[d.brand].recordCount++;
    }

    // Enrich with registry info
    for (const [name, config] of Object.entries(BRAND_REGISTRY)) {
      if (!brandMap[name]) {
        brandMap[name] = {
          name,
          category: config.category,
          genres: config.genres,
          venue: '',
          editions: new Set(config.matchPatterns.map(p => p.edition)),
          recordCount: 0,
          inRegistry: true,
        };
      } else {
        brandMap[name].inRegistry = true;
        if (!brandMap[name].genres.length) brandMap[name].genres = config.genres;
        if (!brandMap[name].category || brandMap[name].category === 'unknown') brandMap[name].category = config.category;
      }
    }

    // Enrich with custom config
    for (const [name, config] of Object.entries(localConfig.brands)) {
      if (brandMap[name]) {
        if (config.displayName) brandMap[name].displayName = config.displayName;
        if (config.category) brandMap[name].category = config.category;
        if (config.genres?.length) brandMap[name].genres = config.genres;
        if (config.venue) brandMap[name].venue = config.venue;
      }
    }

    // Apply renames
    for (const [oldName, newName] of Object.entries(localConfig.renames)) {
      if (brandMap[oldName]) {
        brandMap[oldName].displayName = newName;
      }
    }

    return Object.values(brandMap).map(b => ({
      ...b,
      displayName: b.displayName || b.name,
      editions: [...b.editions],
      excluded: localConfig.excludedBrands.includes(b.name),
    })).sort((a, b) => b.recordCount - a.recordCount);
  }, [data, localConfig]);

  // Filtered brands
  const filteredBrands = useMemo(() => {
    const s = search.toLowerCase();
    return allBrands.filter(b => {
      if (showExcluded) return b.excluded;
      if (b.excluded) return false;
      return !s || b.name.toLowerCase().includes(s) || b.displayName.toLowerCase().includes(s);
    });
  }, [allBrands, search, showExcluded]);

  // Venues from data
  const venues = useMemo(() => {
    const v = new Set();
    data.forEach(d => { if (d.location) v.add(d.location); });
    return [...v].sort();
  }, [data]);

  // Start editing a brand
  const startEdit = (brand) => {
    const config = localConfig.brands[brand.name] || {};
    setEditingBrand(brand.name);
    setEditForm({
      displayName: config.displayName || brand.displayName || brand.name,
      category: config.category || brand.category || 'standard',
      genres: config.genres || brand.genres || [],
      venue: config.venue || brand.venue || '',
    });
  };

  // Save edit
  const saveEdit = () => {
    if (!editingBrand) return;
    const newConfig = { ...localConfig };
    newConfig.brands = { ...newConfig.brands };
    newConfig.brands[editingBrand] = {
      ...newConfig.brands[editingBrand],
      displayName: editForm.displayName,
      category: editForm.category,
      genres: editForm.genres,
      venue: editForm.venue,
    };

    // If displayName changed, add rename
    if (editForm.displayName !== editingBrand) {
      newConfig.renames = { ...newConfig.renames, [editingBrand]: editForm.displayName };
    }

    setLocalConfig(newConfig);
    setEditingBrand(null);
  };

  // Toggle genre in edit form
  const toggleGenre = (genreKey) => {
    setEditForm(prev => ({
      ...prev,
      genres: prev.genres.includes(genreKey)
        ? prev.genres.filter(g => g !== genreKey)
        : [...prev.genres, genreKey],
    }));
  };

  // Toggle exclude brand
  const toggleExclude = (brandName) => {
    setLocalConfig(prev => {
      const excluded = prev.excludedBrands.includes(brandName)
        ? prev.excludedBrands.filter(b => b !== brandName)
        : [...prev.excludedBrands, brandName];
      return { ...prev, excludedBrands: excluded };
    });
  };

  // Merge selected brands
  const startMerge = () => {
    if (mergeSelected.size < 2) return;
    const names = [...mergeSelected];
    // Default: pick the one with most records
    const sorted = names
      .map(n => allBrands.find(b => b.name === n))
      .filter(Boolean)
      .sort((a, b) => b.recordCount - a.recordCount);
    setMergePrimaryName(sorted[0]?.name || names[0]);
    setShowMergeConfirm(true);
  };

  const confirmMerge = () => {
    const names = [...mergeSelected];
    const others = names.filter(n => n !== mergePrimaryName);
    const newConfig = { ...localConfig };
    newConfig.brands = { ...newConfig.brands };
    newConfig.renames = { ...newConfig.renames };

    // Set aliases on the primary brand
    const primaryConfig = newConfig.brands[mergePrimaryName] || {};
    const existingAliases = primaryConfig.aliases || [];
    newConfig.brands[mergePrimaryName] = {
      ...primaryConfig,
      aliases: [...new Set([...existingAliases, ...others])],
    };

    // Create renames from others → primary
    for (const other of others) {
      newConfig.renames[other] = mergePrimaryName;
    }

    setLocalConfig(newConfig);
    setMergeSelected(new Set());
    setMergeMode(false);
    setShowMergeConfirm(false);
  };

  // Save all to Firebase
  const handleSaveAll = async () => {
    setSaving(true);
    await onSave(localConfig);
    setSaving(false);
  };

  // Styles
  const overlayStyle = {
    position: "fixed", inset: 0, zIndex: 9999,
    background: colors.overlay.dark,
    display: "flex", justifyContent: "center", alignItems: "center",
    padding: 20,
  };

  const panelStyle = {
    background: colors.bg.page,
    borderRadius: radius["4xl"],
    width: "100%", maxWidth: 900,
    maxHeight: "90vh",
    display: "flex", flexDirection: "column",
    border: `1px solid ${colors.border.default}`,
    boxShadow: shadows.xl,
    overflow: "hidden",
  };

  const headerStyle = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: `1px solid ${colors.border.default}`,
    flexShrink: 0,
  };

  const inputStyle = {
    width: "100%", padding: "8px 12px", borderRadius: radius.lg,
    background: colors.bg.input, border: `1px solid ${colors.border.default}`,
    color: colors.text.primary, fontSize: font.size.sm, outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text.primary }}>
              Gestione Eventi
            </div>
            <div style={{ fontSize: font.size.xs, color: colors.text.disabled, marginTop: 2 }}>
              Configura brand, generi, locali e unisci duplicati
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={handleSaveAll} disabled={saving} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: radius.lg,
              background: colors.brand.purple, border: "none",
              color: colors.text.inverse, fontSize: font.size.sm,
              fontWeight: font.weight.semibold, cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}>
              <Save size={14} />
              {saving ? 'Salvando...' : 'Salva tutto'}
            </button>
            <button onClick={onClose} style={{
              background: "none", border: "none", cursor: "pointer", padding: 6,
              display: "flex", alignItems: "center",
            }}>
              <X size={20} color={colors.text.muted} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{
          display: "flex", gap: 8, padding: "12px 24px", alignItems: "center",
          borderBottom: `1px solid ${colors.border.default}`, flexShrink: 0,
          flexWrap: "wrap",
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} color={colors.text.disabled} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca brand..."
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>

          {/* Toggle excluded */}
          <button onClick={() => setShowExcluded(!showExcluded)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: radius.lg, fontSize: font.size.xs,
            border: `1px solid ${showExcluded ? colors.status.error : colors.border.default}`,
            background: showExcluded ? alpha.error[10] : "transparent",
            color: showExcluded ? colors.status.error : colors.text.muted,
            cursor: "pointer",
          }}>
            <EyeOff size={12} />
            Esclusi ({localConfig.excludedBrands.length})
          </button>

          {/* Merge mode */}
          <button onClick={() => { setMergeMode(!mergeMode); setMergeSelected(new Set()); }} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: radius.lg, fontSize: font.size.xs,
            border: `1px solid ${mergeMode ? colors.brand.purple : colors.border.default}`,
            background: mergeMode ? alpha.brand[15] : "transparent",
            color: mergeMode ? colors.brand.purple : colors.text.muted,
            cursor: "pointer",
          }}>
            <Merge size={12} />
            {mergeMode ? 'Annulla merge' : 'Unisci brand'}
          </button>

          {/* Merge action */}
          {mergeMode && mergeSelected.size >= 2 && (
            <button onClick={startMerge} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 12px", borderRadius: radius.lg, fontSize: font.size.xs,
              background: colors.brand.purple, border: "none",
              color: colors.text.inverse, cursor: "pointer",
              fontWeight: font.weight.semibold,
            }}>
              Unisci {mergeSelected.size} brand
            </button>
          )}
        </div>

        {/* Brand list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: font.size.sm }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border.default}`, position: "sticky", top: 0, background: colors.bg.page, zIndex: 1 }}>
                {mergeMode && <th style={{ padding: "10px 6px", width: 30 }} />}
                <th style={{ textAlign: "left", padding: "10px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Brand</th>
                <th style={{ textAlign: "center", padding: "10px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Categoria</th>
                <th style={{ textAlign: "left", padding: "10px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Generi</th>
                <th style={{ textAlign: "left", padding: "10px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Locale</th>
                <th style={{ textAlign: "center", padding: "10px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Ediz.</th>
                <th style={{ textAlign: "center", padding: "10px 8px", color: colors.text.muted, fontWeight: font.weight.medium }}>Reg.</th>
                <th style={{ padding: "10px 8px", width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map(brand => (
                <BrandRow
                  key={brand.name}
                  brand={brand}
                  isEditing={editingBrand === brand.name}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  mergeMode={mergeMode}
                  mergeSelected={mergeSelected}
                  onToggleMerge={(name) => {
                    const next = new Set(mergeSelected);
                    next.has(name) ? next.delete(name) : next.add(name);
                    setMergeSelected(next);
                  }}
                  onStartEdit={() => startEdit(brand)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingBrand(null)}
                  onToggleExclude={() => toggleExclude(brand.name)}
                  onToggleGenre={toggleGenre}
                  venues={venues}
                  categoryOptions={CATEGORY_OPTIONS}
                  genreOptions={GENRE_OPTIONS}
                />
              ))}
            </tbody>
          </table>

          {filteredBrands.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: colors.text.disabled }}>
              {showExcluded ? 'Nessun brand escluso' : 'Nessun brand trovato'}
            </div>
          )}
        </div>

        {/* Merge confirmation modal */}
        {showMergeConfirm && (
          <MergeConfirmModal
            selected={[...mergeSelected]}
            allBrands={allBrands}
            primaryName={mergePrimaryName}
            onChangePrimary={setMergePrimaryName}
            onConfirm={confirmMerge}
            onCancel={() => setShowMergeConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}

/** Single brand row + inline editor */
function BrandRow({
  brand, isEditing, editForm, setEditForm,
  mergeMode, mergeSelected, onToggleMerge,
  onStartEdit, onSaveEdit, onCancelEdit, onToggleExclude, onToggleGenre,
  venues, categoryOptions, genreOptions,
}) {
  const rowStyle = {
    borderBottom: `1px solid ${colors.border.subtle}`,
    background: isEditing ? alpha.brand[6] : "transparent",
    transition: tr.normal,
  };

  const cellStyle = { padding: "10px 8px", verticalAlign: "middle" };

  return (
    <>
      <tr style={rowStyle}>
        {mergeMode && (
          <td style={{ ...cellStyle, textAlign: "center" }}>
            <input
              type="checkbox"
              checked={mergeSelected.has(brand.name)}
              onChange={() => onToggleMerge(brand.name)}
              style={{ cursor: "pointer", accentColor: colors.brand.purple }}
            />
          </td>
        )}
        <td style={cellStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: font.weight.semibold, color: colors.text.primary }}>
              {brand.displayName}
            </span>
            {brand.displayName !== brand.name && (
              <span style={{ fontSize: font.size.xs, color: colors.text.disabled }}>
                ({brand.name})
              </span>
            )}
            {!brand.inRegistry && (
              <span style={{
                fontSize: 9, padding: "1px 5px", borderRadius: radius.sm,
                background: alpha.brand[15], color: colors.brand.purple,
                fontWeight: font.weight.semibold,
              }}>NUOVO</span>
            )}
          </div>
        </td>
        <td style={{ ...cellStyle, textAlign: "center" }}>
          <span style={{
            fontSize: font.size.xs, padding: "2px 8px", borderRadius: radius.md,
            background: colors.bg.elevated,
            color: CATEGORY_LABELS[brand.category]?.color || colors.text.muted,
          }}>
            {CATEGORY_LABELS[brand.category]?.label || brand.category}
          </span>
        </td>
        <td style={cellStyle}>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {brand.genres.map(g => (
              <span key={g} style={{
                fontSize: 9, padding: "1px 6px", borderRadius: radius.sm,
                background: alpha.brand[8],
                color: GENRE_LABELS[g]?.color || colors.text.muted,
              }}>
                {GENRE_LABELS[g]?.label || g}
              </span>
            ))}
            {brand.genres.length === 0 && <span style={{ fontSize: font.size.xs, color: colors.text.disabled }}>—</span>}
          </div>
        </td>
        <td style={{ ...cellStyle, color: colors.text.muted, fontSize: font.size.xs }}>
          {brand.venue || '—'}
        </td>
        <td style={{ ...cellStyle, textAlign: "center", color: colors.text.muted }}>
          {brand.editions.length}
        </td>
        <td style={{ ...cellStyle, textAlign: "center", color: colors.text.primary, fontWeight: font.weight.semibold }}>
          {brand.recordCount}
        </td>
        <td style={{ ...cellStyle, textAlign: "right" }}>
          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
            {!mergeMode && (
              <>
                <button onClick={isEditing ? onCancelEdit : onStartEdit} title={isEditing ? 'Annulla' : 'Modifica'} style={{
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                }}>
                  {isEditing ? <X size={14} color={colors.text.muted} /> : <Edit3 size={14} color={colors.brand.purple} />}
                </button>
                <button onClick={onToggleExclude} title={brand.excluded ? 'Ripristina' : 'Escludi'} style={{
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                }}>
                  {brand.excluded
                    ? <Eye size={14} color={colors.status.success} />
                    : <EyeOff size={14} color={colors.text.disabled} />
                  }
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Inline editor */}
      {isEditing && (
        <tr>
          <td colSpan={mergeMode ? 9 : 8} style={{ padding: "0 8px 12px", background: alpha.brand[6] }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
              padding: 16, borderRadius: radius.xl,
              background: colors.bg.card, border: `1px solid ${alpha.brand[20]}`,
            }}>
              {/* Nome display */}
              <div>
                <label style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4, display: "block" }}>
                  Nome display
                </label>
                <input
                  value={editForm.displayName}
                  onChange={e => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                  style={{
                    width: "100%", padding: "6px 10px", borderRadius: radius.md,
                    background: colors.bg.input, border: `1px solid ${colors.border.default}`,
                    color: colors.text.primary, fontSize: font.size.sm, outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Categoria */}
              <div>
                <label style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4, display: "block" }}>
                  Categoria
                </label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: "100%", padding: "6px 10px", borderRadius: radius.md,
                    background: colors.bg.input, border: `1px solid ${colors.border.default}`,
                    color: colors.text.primary, fontSize: font.size.sm, outline: "none",
                  }}
                >
                  {categoryOptions.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Generi */}
              <div>
                <label style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4, display: "block" }}>
                  Generi
                </label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {genreOptions.map(g => {
                    const active = editForm.genres.includes(g.key);
                    return (
                      <button key={g.key} onClick={() => onToggleGenre(g.key)} style={{
                        padding: "3px 10px", borderRadius: radius.md, fontSize: font.size.xs,
                        border: `1px solid ${active ? g.color : colors.border.default}`,
                        background: active ? `${g.color}20` : "transparent",
                        color: active ? g.color : colors.text.muted,
                        cursor: "pointer", transition: tr.normal,
                      }}>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locale */}
              <div>
                <label style={{ fontSize: font.size.xs, color: colors.text.muted, marginBottom: 4, display: "block" }}>
                  Locale / Venue
                </label>
                <input
                  value={editForm.venue}
                  onChange={e => setEditForm(prev => ({ ...prev, venue: e.target.value }))}
                  list="venues-datalist"
                  placeholder="Es. Too Late, Gelsi, ..."
                  style={{
                    width: "100%", padding: "6px 10px", borderRadius: radius.md,
                    background: colors.bg.input, border: `1px solid ${colors.border.default}`,
                    color: colors.text.primary, fontSize: font.size.sm, outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <datalist id="venues-datalist">
                  {venues.map(v => <option key={v} value={v} />)}
                </datalist>
              </div>

              {/* Save/Cancel buttons */}
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button onClick={onCancelEdit} style={{
                  padding: "6px 16px", borderRadius: radius.md, fontSize: font.size.xs,
                  background: "transparent", border: `1px solid ${colors.border.default}`,
                  color: colors.text.muted, cursor: "pointer",
                }}>
                  Annulla
                </button>
                <button onClick={onSaveEdit} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "6px 16px", borderRadius: radius.md, fontSize: font.size.xs,
                  background: colors.brand.purple, border: "none",
                  color: colors.text.inverse, cursor: "pointer",
                  fontWeight: font.weight.semibold,
                }}>
                  <Save size={12} /> Applica
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/** Merge confirmation modal */
function MergeConfirmModal({ selected, allBrands, primaryName, onChangePrimary, onConfirm, onCancel }) {
  const selectedBrands = selected.map(n => allBrands.find(b => b.name === n)).filter(Boolean);
  const totalRecords = selectedBrands.reduce((s, b) => s + b.recordCount, 0);

  return (
    <div style={{
      position: "absolute", inset: 0, background: colors.overlay.medium,
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 10,
    }}>
      <div style={{
        background: colors.bg.card, borderRadius: radius["3xl"], padding: 24,
        maxWidth: 420, width: "100%",
        border: `1px solid ${colors.border.default}`, boxShadow: shadows.lg,
      }}>
        <div style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary, marginBottom: 12 }}>
          Conferma unione brand
        </div>
        <div style={{ fontSize: font.size.sm, color: colors.text.muted, marginBottom: 16 }}>
          Unire <strong>{selected.length}</strong> brand in uno ({totalRecords} registrazioni totali).
          Seleziona il nome principale:
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {selectedBrands.map(b => (
            <label key={b.name} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: radius.lg, cursor: "pointer",
              background: primaryName === b.name ? alpha.brand[15] : colors.bg.page,
              border: `1px solid ${primaryName === b.name ? colors.brand.purple : colors.border.default}`,
            }}>
              <input
                type="radio"
                name="mergePrimary"
                checked={primaryName === b.name}
                onChange={() => onChangePrimary(b.name)}
                style={{ accentColor: colors.brand.purple }}
              />
              <span style={{ color: colors.text.primary, fontWeight: font.weight.semibold }}>
                {b.displayName}
              </span>
              <span style={{ color: colors.text.disabled, fontSize: font.size.xs, marginLeft: "auto" }}>
                {b.recordCount} reg. / {b.editions.length} ediz.
              </span>
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "8px 16px", borderRadius: radius.md, fontSize: font.size.sm,
            background: "transparent", border: `1px solid ${colors.border.default}`,
            color: colors.text.muted, cursor: "pointer",
          }}>
            Annulla
          </button>
          <button onClick={onConfirm} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "8px 16px", borderRadius: radius.md, fontSize: font.size.sm,
            background: colors.brand.purple, border: "none",
            color: colors.text.inverse, cursor: "pointer",
            fontWeight: font.weight.semibold,
          }}>
            <Merge size={14} /> Unisci
          </button>
        </div>
      </div>
    </div>
  );
}
