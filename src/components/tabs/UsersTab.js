import { useState, useMemo } from 'react';
import { SegmentBadge } from '../shared/Badge';

export default function UsersTab({ userStats }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('totalRegs');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedUser, setSelectedUser] = useState(null);

  const segments = [
    { key: 'all', label: 'Tutti' },
    { key: 'vip', label: '\ud83d\udc51 VIP' },
    { key: 'fedeli', label: '\ud83d\udd04 Fedeli' },
    { key: 'occasionali', label: '\ud83c\udfaf Occasionali' },
    { key: 'ghost', label: '\ud83d\udc7b Ghost' },
  ];

  const filtered = useMemo(() => {
    let list = userStats || [];
    if (segmentFilter !== 'all') list = list.filter(u => u.segment === segmentFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      const aVal = a[sortBy] || 0, bVal = b[sortBy] || 0;
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [userStats, segmentFilter, searchTerm, sortBy, sortDir]);

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const sortIcon = (key) => sortBy === key ? (sortDir === 'asc' ? ' \u25b2' : ' \u25bc') : '';

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {segments.map(s => (
          <button key={s.key} onClick={() => setSegmentFilter(s.key)} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 11, border: "none", cursor: "pointer",
            background: segmentFilter === s.key ? "#8b5cf6" : "#1e293b",
            color: segmentFilter === s.key ? "#fff" : "#94a3b8",
          }}>{s.label}</button>
        ))}
        <input
          placeholder="Cerca nome..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
            padding: "5px 12px", color: "#f1f5f9", fontSize: 12, outline: "none", marginLeft: "auto",
          }}
        />
      </div>

      {/* Count */}
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
        {filtered.length} utenti trovati
      </div>

      {/* Table */}
      <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              <th onClick={() => toggleSort('name')} style={{ textAlign: "left", padding: "10px 12px", color: "#94a3b8", cursor: "pointer", fontWeight: 500 }}>
                Nome{sortIcon('name')}
              </th>
              <th style={{ padding: "10px 8px", color: "#94a3b8", fontWeight: 500 }}>Segmento</th>
              <th onClick={() => toggleSort('totalRegs')} style={{ textAlign: "center", padding: "10px 8px", color: "#94a3b8", cursor: "pointer", fontWeight: 500 }}>
                Registrazioni{sortIcon('totalRegs')}
              </th>
              <th onClick={() => toggleSort('totalParticipated')} style={{ textAlign: "center", padding: "10px 8px", color: "#94a3b8", cursor: "pointer", fontWeight: 500 }}>
                Presenze{sortIcon('totalParticipated')}
              </th>
              <th onClick={() => toggleSort('conversion')} style={{ textAlign: "center", padding: "10px 8px", color: "#94a3b8", cursor: "pointer", fontWeight: 500 }}>
                Conv.{sortIcon('conversion')}
              </th>
              <th style={{ textAlign: "center", padding: "10px 8px", color: "#94a3b8", fontWeight: 500 }}>Eventi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((u, i) => (
              <tr
                key={i}
                onClick={() => setSelectedUser(u)}
                style={{
                  borderBottom: "1px solid #0f172a", cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#334155"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "8px 12px", color: "#f1f5f9", fontWeight: 500 }}>{u.name}</td>
                <td style={{ padding: "8px", textAlign: "center" }}><SegmentBadge segment={u.segment} /></td>
                <td style={{ padding: "8px", textAlign: "center", color: "#f1f5f9" }}>{u.totalRegs}</td>
                <td style={{ padding: "8px", textAlign: "center", color: "#f1f5f9" }}>{u.totalParticipated}</td>
                <td style={{ padding: "8px", textAlign: "center", color: u.conversion >= 70 ? "#10b981" : u.conversion >= 40 ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>
                  {u.conversion}%
                </td>
                <td style={{ padding: "8px", textAlign: "center", color: "#94a3b8" }}>{u.eventCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div style={{ padding: 12, textAlign: "center", fontSize: 11, color: "#64748b" }}>
            Mostrati 100 di {filtered.length} utenti
          </div>
        )}
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <div
          onClick={() => setSelectedUser(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1e293b", borderRadius: 16, padding: 24, maxWidth: 500, width: "90%",
            border: "1px solid #334155", maxHeight: "80vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>{selectedUser.name}</div>
                <SegmentBadge segment={selectedUser.segment} />
              </div>
              <button onClick={() => setSelectedUser(null)} style={{
                background: "#334155", border: "none", borderRadius: 8, padding: "6px 12px",
                color: "#f1f5f9", cursor: "pointer", fontSize: 12,
              }}>Chiudi</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Registrazioni", value: selectedUser.totalRegs },
                { label: "Presenze", value: selectedUser.totalParticipated },
                { label: "Conversione", value: `${selectedUser.conversion}%` },
                { label: "Eventi", value: selectedUser.eventCount },
              ].map(k => (
                <div key={k.label} style={{ background: "#0f172a", borderRadius: 8, padding: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#64748b" }}>{k.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{k.value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
              Dettaglio eventi
            </div>
            {selectedUser.events.map((ev, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid #334155", fontSize: 12,
              }}>
                <span style={{ color: "#f1f5f9" }}>{ev.event}</span>
                <span style={{ color: "#94a3b8" }}>
                  {ev.count} reg. / {ev.participated} pres.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
