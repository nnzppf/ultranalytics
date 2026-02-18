import { Upload, Plus, X, Cloud, Trash2, RefreshCw } from 'lucide-react';

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
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Header */}
      <div style={{
        width: "100%", padding: "32px 0 24px", textAlign: "center",
        background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
          Ultranalytics
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>
          Dashboard eventi &amp; registrazioni
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 520, padding: "32px 16px" }}>

        {/* Saved datasets from Firebase */}
        {hasSavedData && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Cloud size={14} color="#10b981" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>Dati salvati nel cloud</span>
              </div>
              <button
                onClick={onReloadCloud}
                style={{
                  background: "#334155", border: "none", borderRadius: 6,
                  color: "#94a3b8", fontSize: 10, padding: "4px 10px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <RefreshCw size={10} /> Ricarica
              </button>
            </div>

            {savedDatasets.map(ds => (
              <div key={ds.id} style={{
                background: "#1e293b", borderRadius: 10, padding: "10px 14px",
                border: "1px solid #334155", display: "flex", alignItems: "center", gap: 10,
                marginBottom: 6,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9" }}>{ds.fileName}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                    {ds.fileType === 'utenti' ? '👤 Utenti' : '🎫 Biglietti'} — {ds.recordCount} record
                    {ds.uploadedAt && ` — ${new Date(ds.uploadedAt.seconds * 1000).toLocaleDateString('it')}`}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteDataset(ds.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                  title="Elimina dataset"
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              </div>
            ))}

            <button
              onClick={onReloadCloud}
              style={{
                marginTop: 8, padding: "10px 0", borderRadius: 10, width: "100%",
                background: "#10b981", color: "#fff", fontWeight: 600, fontSize: 13,
                border: "none", cursor: "pointer",
              }}
            >
              Apri dashboard con dati salvati
            </button>
          </div>
        )}

        {/* Separator */}
        {hasSavedData && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 24,
            color: "#64748b", fontSize: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: "#334155" }} />
            <span>oppure carica nuovi dati</span>
            <div style={{ flex: 1, height: 1, background: "#334155" }} />
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); onDragState(true); }}
          onDragLeave={() => onDragState(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
          style={{
            border: `2px dashed ${isDragging ? "#a78bfa" : "#475569"}`,
            borderRadius: 16, padding: "40px 20px", textAlign: "center",
            cursor: "pointer", transition: "all 0.2s",
            background: isDragging ? "rgba(139,92,246,0.08)" : "transparent",
          }}
        >
          <Upload size={32} color="#8b5cf6" />
          <div style={{ color: "#f1f5f9", fontSize: 14, marginTop: 12, fontWeight: 500 }}>
            Trascina qui i file CSV / Excel
          </div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            oppure clicca per sfogliare
          </div>
          <input id="file-input" type="file" multiple accept=".csv,.tsv,.xlsx,.xls"
            style={{ display: "none" }} onChange={handleFileInput} />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {files.map((f, i) => (
              <div key={i} style={{
                background: "#1e293b", borderRadius: 10, padding: "10px 14px",
                border: "1px solid #334155", display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <input
                    value={f.eventName}
                    onChange={e => onUpdateEventName(i, e.target.value)}
                    style={{
                      background: "transparent", border: "none", color: "#f1f5f9",
                      fontSize: 13, fontWeight: 500, width: "100%", outline: "none",
                    }}
                  />
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                    {f.name} — {f.rows.length} righe
                  </div>
                </div>
                <button onClick={() => onRemoveFile(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <X size={14} color="#ef4444" />
                </button>
              </div>
            ))}

            <label style={{
              display: "flex", alignItems: "center", gap: 6, color: "#8b5cf6",
              fontSize: 12, cursor: "pointer", marginTop: 4,
            }}>
              <Plus size={14} /> Aggiungi altri file
              <input type="file" multiple accept=".csv,.tsv,.xlsx,.xls"
                style={{ display: "none" }} onChange={handleFileInput} />
            </label>

            <button onClick={onAnalyze} style={{
              marginTop: 12, padding: "12px 0", borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #ec4899)",
              color: "#fff", fontWeight: 600, fontSize: 14,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Cloud size={16} />
              Analizza e salva nel cloud ({files.length} file, {files.reduce((s, f) => s + f.rows.length, 0)} righe)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
