import { useState, useMemo, useEffect } from 'react';
import { Phone, Mail, MessageCircle, Calendar } from 'lucide-react';
import { SegmentBadge } from '../shared/Badge';
import { formatWhatsAppUrl } from '../../utils/whatsapp';
import { Th } from '../shared/SortableTable';
import DataCards from '../shared/DataCards';
import { colors, font, radius, presets, transition as tr } from '../../config/designTokens';

function formatBirthDate(d) {
  if (!d || !(d instanceof Date)) return null;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calculateAge(birthDate) {
  if (!birthDate || !(birthDate instanceof Date)) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

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

  // Pagination — reset to first page when filters change
  const [page, setPage] = useState(0);
  const pageSize = 50;
  useEffect(() => { setPage(0); }, [segmentFilter, searchTerm, sortBy, sortDir]);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedUsers = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {segments.map(s => (
          <button key={s.key} onClick={() => setSegmentFilter(s.key)} style={{
            ...presets.filterButton,
            background: segmentFilter === s.key ? colors.interactive.active : colors.bg.card,
            color: segmentFilter === s.key ? colors.interactive.activeText : colors.interactive.inactiveText,
          }}>{s.label}</button>
        ))}
        <input
          placeholder="Cerca nome..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            background: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg,
            padding: "5px 12px", color: colors.text.primary, fontSize: font.size.sm, outline: "none", marginLeft: "auto",
          }}
        />
      </div>

      {/* Count */}
      <div style={{ fontSize: font.size.xs, color: colors.text.disabled, marginBottom: 8 }}>
        {filtered.length} utenti trovati
      </div>

      {/* Table — desktop */}
      <div className="desktop-table" style={{ background: colors.bg.card, borderRadius: radius["2xl"], border: `1px solid ${colors.border.default}`, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: font.size.sm }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border.default}` }}>
              <Th columnKey="name" sortKey={sortBy} sortDir={sortDir} onSort={toggleSort} style={{ paddingLeft: 12 }}>Nome</Th>
              <Th align="center">Segmento</Th>
              <Th columnKey="totalRegs" sortKey={sortBy} sortDir={sortDir} onSort={toggleSort} align="center">Registrazioni</Th>
              <Th columnKey="totalParticipated" sortKey={sortBy} sortDir={sortDir} onSort={toggleSort} align="center">Presenze</Th>
              <Th columnKey="conversion" sortKey={sortBy} sortDir={sortDir} onSort={toggleSort} align="center">Conv.</Th>
              <Th align="center">Eventi</Th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((u, i) => (
              <tr
                key={i}
                onClick={() => setSelectedUser(u)}
                style={{
                  borderBottom: `1px solid ${colors.bg.page}`, cursor: "pointer",
                  transition: tr.fast,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = colors.bg.elevated; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "8px 12px", color: colors.text.primary, fontWeight: font.weight.medium }}>{u.name}</td>
                <td style={{ padding: "8px", textAlign: "center" }}><SegmentBadge segment={u.segment} /></td>
                <td style={{ padding: "8px", textAlign: "center", color: colors.text.primary }}>{u.totalRegs}</td>
                <td style={{ padding: "8px", textAlign: "center", color: colors.text.primary }}>{u.totalParticipated}</td>
                <td style={{ padding: "8px", textAlign: "center", color: u.conversion >= 70 ? colors.status.success : u.conversion >= 40 ? colors.status.warning : colors.status.error, fontWeight: font.weight.semibold }}>
                  {u.conversion}%
                </td>
                <td style={{ padding: "8px", textAlign: "center", color: colors.text.muted }}>{u.eventCount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "10px 12px", borderTop: `1px solid ${colors.border.default}`,
          }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                background: colors.bg.elevated, border: "none", borderRadius: radius.md,
                padding: "4px 10px", fontSize: font.size.xs, color: colors.text.muted,
                cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1,
              }}
            >← Prec.</button>
            <span style={{ fontSize: font.size.xs, color: colors.text.disabled }}>
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} di {filtered.length}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                background: colors.bg.elevated, border: "none", borderRadius: radius.md,
                padding: "4px 10px", fontSize: font.size.xs, color: colors.text.muted,
                cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1,
              }}
            >Succ. →</button>
          </div>
        )}
      </div>

      {/* Cards — mobile */}
      <DataCards
        items={paginatedUsers}
        onItemClick={(u) => setSelectedUser(u)}
        keyExtractor={(u, i) => u.name + i}
        fields={[
          { key: 'name', label: 'Nome', primary: true },
          { key: 'segment', label: 'Segmento', badge: true, render: u => <SegmentBadge segment={u.segment} /> },
          { key: 'totalRegs', label: 'Registrazioni' },
          { key: 'totalParticipated', label: 'Presenze' },
          { key: 'conversion', label: 'Conv.', render: u => `${u.conversion}%`, color: u => u.conversion >= 70 ? colors.status.success : u.conversion >= 40 ? colors.status.warning : colors.status.error },
          { key: 'eventCount', label: 'Eventi' },
        ]}
      />

      {/* Pagination — mobile (shared) */}
      {totalPages > 1 && (
        <div className="mobile-cards" style={{
          display: "none", justifyContent: "center", alignItems: "center", gap: 8, paddingTop: 8,
        }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ background: colors.bg.elevated, border: "none", borderRadius: radius.md, padding: "6px 14px", fontSize: font.size.xs, color: colors.text.muted, cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1 }}>
            ← Prec.
          </button>
          <span style={{ fontSize: font.size.xs, color: colors.text.disabled }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} di {filtered.length}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ background: colors.bg.elevated, border: "none", borderRadius: radius.md, padding: "6px 14px", fontSize: font.size.xs, color: colors.text.muted, cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
            Succ. →
          </button>
        </div>
      )}

      {/* User detail modal */}
      {selectedUser && (
        <div
          onClick={() => setSelectedUser(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: colors.bg.solid, borderRadius: radius["4xl"], padding: 24, maxWidth: 500, width: "90%",
            border: `1px solid ${colors.border.default}`, maxHeight: "80vh", overflowY: "auto",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text.primary }}>{selectedUser.name}</div>
                <SegmentBadge segment={selectedUser.segment} />
              </div>
              <button onClick={() => setSelectedUser(null)} style={{
                background: colors.bg.elevated, border: "none", borderRadius: radius.lg, padding: "6px 12px",
                color: colors.text.primary, cursor: "pointer", fontSize: font.size.sm,
              }}>Chiudi</button>
            </div>

            {/* Contact info */}
            <div style={{ background: colors.bg.page, borderRadius: radius.xl, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedUser.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Phone size={14} color={colors.brand.purple} />
                    <span style={{ fontSize: font.size.base, color: colors.text.primary }}>{selectedUser.phone}</span>
                  </div>
                )}
                {selectedUser.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Mail size={14} color={colors.brand.purple} />
                    <span style={{ fontSize: font.size.base, color: colors.text.primary }}>{selectedUser.email}</span>
                  </div>
                )}
                {selectedUser.birthDate && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Calendar size={14} color={colors.brand.purple} />
                    <span style={{ fontSize: font.size.base, color: colors.text.primary }}>
                      {formatBirthDate(selectedUser.birthDate)}
                      {calculateAge(selectedUser.birthDate) != null && (
                        <span style={{ color: colors.text.muted, marginLeft: 6 }}>({calculateAge(selectedUser.birthDate)} anni)</span>
                      )}
                    </span>
                  </div>
                )}
                {!selectedUser.phone && !selectedUser.email && !selectedUser.birthDate && (
                  <div style={{ fontSize: font.size.sm, color: colors.text.disabled, fontStyle: "italic" }}>Nessun dato di contatto disponibile</div>
                )}
              </div>

              {/* WhatsApp button */}
              {selectedUser.phone && (
                <a
                  href={formatWhatsAppUrl(selectedUser.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12,
                    background: colors.whatsapp, color: colors.text.inverse, borderRadius: radius.xl, padding: "8px 18px",
                    fontSize: font.size.base, fontWeight: font.weight.semibold, textDecoration: "none", border: "none", cursor: "pointer",
                  }}
                >
                  <MessageCircle size={16} />
                  Scrivi su WhatsApp
                </a>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Registrazioni", value: selectedUser.totalRegs },
                { label: "Presenze", value: selectedUser.totalParticipated },
                { label: "Conversione", value: `${selectedUser.conversion}%` },
                { label: "Eventi", value: selectedUser.eventCount },
              ].map(k => (
                <div key={k.label} style={{ background: colors.bg.page, borderRadius: radius.lg, padding: 10, textAlign: "center" }}>
                  <div style={presets.statLabel}>{k.label}</div>
                  <div style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text.primary }}>{k.value}</div>
                </div>
              ))}
            </div>

            <div style={{ ...presets.sectionLabel, marginBottom: 8 }}>
              Dettaglio eventi
            </div>
            {selectedUser.events.map((ev, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: `1px solid ${colors.border.default}`, fontSize: font.size.sm,
              }}>
                <span style={{ color: colors.text.primary }}>{ev.event}</span>
                <span style={{ color: colors.text.muted }}>
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
