import { Upload, Plus, X, Cloud, Trash2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { colors, font, radius, gradients, transition as tr, alpha, glass, shadows } from '../../config/designTokens';

export default function UploadScreen({
  files, isDragging, onFilesAdded, onRemoveFile, onUpdateEventName, onAnalyze, onDragState,
  cloudStatus, savedDatasets, onReloadCloud, onDeleteDataset
}) {

  const handleDrop = (e) => {
    e.preventDefault();
    onDragState(false);
    if (e.dataTransfer.files.length) onFilesAdded(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    if (e.target.files.length) onFilesAdded(e.target.files);
    e.target.value = '';
  };

  const hasSavedData = savedDatasets && savedDatasets.length > 0;

  return (
    <div style={{
      minHeight: "100vh", background: colors.bg.page,
      display: "flex", flexDirection: "column", alignItems: "center",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: "-5%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 200,
        background: "radial-gradient(ellipse, rgba(13,148,136,0.1) 0%, transparent 70%)",
        filter: "blur(40px)", pointerEvents: "none",
      }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: "100%", padding: "28px 0 20px", textAlign: "center" }}
      >
        <div style={{
          fontSize: 28, fontWeight: font.weight.black, letterSpacing: "-0.02em",
          background: gradients.brand,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Ultranalytics
        </div>
        <div style={{ color: colors.text.muted, fontSize: font.size.base, marginTop: 4 }}>
          Dashboard eventi &amp; registrazioni
        </div>
      </motion.div>

      <div style={{ width: "100%", maxWidth: 520, padding: "16px 16px 40px", position: "relative", zIndex: 1 }}>

        {/* Saved datasets from Firebase */}
        {hasSavedData && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ marginBottom: 24 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Cloud size={14} color={colors.status.success} />
                <span style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text.primary }}>Dati salvati nel cloud</span>
              </div>
              <button
                onClick={onReloadCloud}
                style={{
                  background: colors.bg.elevated, border: "none", borderRadius: radius.md,
                  color: colors.text.muted, fontSize: font.size.xs, padding: "4px 10px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <RefreshCw size={10} /> Ricarica
              </button>
            </div>

            {savedDatasets.map((ds, i) => (
              <motion.div
                key={ds.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                style={{
                  background: colors.bg.card, borderRadius: radius.xl, padding: "10px 14px",
                  border: `1px solid ${colors.border.default}`, display: "flex", alignItems: "center", gap: 10,
                  marginBottom: 6, ...glass.light,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: font.size.base, fontWeight: font.weight.medium, color: colors.text.primary }}>{ds.fileName}</div>
                  <div style={{ fontSize: font.size.xs, color: colors.text.disabled, marginTop: 2 }}>
                    {ds.fileType === 'utenti' ? 'Utenti' : 'Biglietti'} — {ds.recordCount} record
                    {ds.uploadedAt && ` — ${new Date(ds.uploadedAt.seconds * 1000).toLocaleDateString('it')}`}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteDataset(ds.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                  title="Elimina dataset"
                >
                  <Trash2 size={14} color={colors.status.error} />
                </button>
              </motion.div>
            ))}

            <motion.button
              whileHover={{ scale: 1.01, boxShadow: shadows.brand }}
              whileTap={{ scale: 0.98 }}
              onClick={onReloadCloud}
              style={{
                marginTop: 10, padding: "11px 0", borderRadius: radius.xl, width: "100%",
                background: colors.status.success, color: colors.text.inverse,
                fontWeight: font.weight.semibold, fontSize: font.size.base,
                border: "none", cursor: "pointer",
              }}
            >
              Apri dashboard con dati salvati
            </motion.button>
          </motion.div>
        )}

        {/* Separator */}
        {hasSavedData && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 24,
            color: colors.text.disabled, fontSize: font.size.sm,
          }}>
            <div style={{ flex: 1, height: 1, background: colors.border.default }} />
            <span>oppure carica nuovi dati</span>
            <div style={{ flex: 1, height: 1, background: colors.border.default }} />
          </div>
        )}

        {/* Drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: hasSavedData ? 0.3 : 0.1 }}
          onDragOver={e => { e.preventDefault(); onDragState(true); }}
          onDragLeave={() => onDragState(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
          style={{
            border: `2px dashed ${isDragging ? colors.brand.lilac : colors.border.strong}`,
            borderRadius: radius["4xl"], padding: "40px 20px", textAlign: "center",
            cursor: "pointer", transition: tr.slow,
            background: isDragging ? alpha.brand[8] : "transparent",
          }}
        >
          <Upload size={32} color={colors.brand.purple} />
          <div style={{ color: colors.text.primary, fontSize: font.size.md, marginTop: 12, fontWeight: font.weight.medium }}>
            Trascina qui i file CSV / Excel
          </div>
          <div style={{ color: colors.text.disabled, fontSize: font.size.sm, marginTop: 4 }}>
            oppure clicca per sfogliare
          </div>
          <input id="file-input" type="file" multiple accept=".csv,.tsv,.xlsx,.xls"
            style={{ display: "none" }} onChange={handleFileInput} />
        </motion.div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {files.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  background: colors.bg.card, borderRadius: radius.xl, padding: "10px 14px",
                  border: `1px solid ${colors.border.default}`, display: "flex", alignItems: "center", gap: 10,
                  ...glass.light,
                }}
              >
                <div style={{ flex: 1 }}>
                  <input
                    value={f.eventName}
                    onChange={e => onUpdateEventName(i, e.target.value)}
                    style={{
                      background: "transparent", border: "none", color: colors.text.primary,
                      fontSize: font.size.base, fontWeight: font.weight.medium, width: "100%", outline: "none",
                    }}
                  />
                  <div style={{ fontSize: font.size.xs, color: colors.text.disabled, marginTop: 2 }}>
                    {f.name} — {f.rows.length} righe
                  </div>
                </div>
                <button onClick={() => onRemoveFile(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <X size={14} color={colors.status.error} />
                </button>
              </motion.div>
            ))}

            <label style={{
              display: "flex", alignItems: "center", gap: 6, color: colors.brand.purple,
              fontSize: font.size.sm, cursor: "pointer", marginTop: 4,
            }}>
              <Plus size={14} /> Aggiungi altri file
              <input type="file" multiple accept=".csv,.tsv,.xlsx,.xls"
                style={{ display: "none" }} onChange={handleFileInput} />
            </label>

            <motion.button
              whileHover={{ scale: 1.01, boxShadow: shadows.brand }}
              whileTap={{ scale: 0.98 }}
              onClick={onAnalyze}
              style={{
                marginTop: 12, padding: "12px 0", borderRadius: radius.xl,
                background: gradients.brand,
                color: colors.text.inverse, fontWeight: font.weight.semibold, fontSize: font.size.md,
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Cloud size={16} />
              Analizza e salva nel cloud ({files.length} file, {files.reduce((s, f) => s + f.rows.length, 0)} righe)
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
