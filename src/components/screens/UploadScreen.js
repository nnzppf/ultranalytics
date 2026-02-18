import { Upload, Plus, X } from 'lucide-react';

export default function UploadScreen({ files, isDragging, onFilesAdded, onRemoveFile, onUpdateEventName, onAnalyze, onDragState }) {

  const handleDrop = (e) => {
    e.preventDefault();
    onDragState(false);
    if (e.dataTransfer.files.length) onFilesAdded(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    if (e.target.files.length) onFilesAdded(e.target.files);
    e.target.value = '';
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Header */}
      <div style={{
        width: "100%", padding: "32px 0 24px", textAlign: "center",
        background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
          Club Analytics
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>
          Dashboard eventi &amp; registrazioni
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 520, padding: "32px 16px" }}>
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
            }}>
              Analizza {files.length} file ({files.reduce((s, f) => s + f.rows.length, 0)} righe)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
