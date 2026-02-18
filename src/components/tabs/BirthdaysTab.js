import { useState, useMemo, useCallback } from 'react';
import { Gift, ChevronLeft, ChevronRight, Phone, Mail, MessageCircle, X, Edit3, Send, ChevronDown } from 'lucide-react';
import Section from '../shared/Section';
import { SegmentBadge } from '../shared/Badge';

// Format phone for WhatsApp (Italian numbers: add 39 prefix)
function formatWhatsAppUrl(phone, message) {
  if (!phone) return null;
  let num = phone.replace(/[\s\-()./]/g, '');
  if (num.startsWith('+')) num = num.slice(1);
  if (num.startsWith('00')) num = num.slice(2);
  if (num.startsWith('3') && num.length === 10) num = '39' + num;
  // Use api.whatsapp.com/send for better emoji support across platforms
  const encoded = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${num}&text=${encoded}`;
}

// {nome} placeholder gets replaced with user's first name
const MESSAGE_TEMPLATES = [
  {
    id: 'auguri_promo',
    label: 'Auguri + Promo 3x2',
    icon: '🎁',
    text: `Ciao {nome}! 🎂🥳

Tanti auguri di buon compleanno da parte di tutto lo staff!

Per festeggiare insieme abbiamo una promozione esclusiva per te: prenota un tavolo per il prossimo evento e con l'acquisto di 2 bottiglie, la terza te la offriamo noi! 🍾🍾🍾

Scrivici per prenotare, ti aspettiamo! 🎉

— Studios Club & Co`,
  },
  {
    id: 'auguri_semplice',
    label: 'Auguri semplici',
    icon: '🎂',
    text: `Ciao {nome}! 🎂

Tanti auguri di buon compleanno da parte di tutto lo staff! 🥳🎉

Ti aspettiamo presto per festeggiare insieme!

— Studios Club & Co`,
  },
  {
    id: 'auguri_tavolo',
    label: 'Auguri + Tavolo VIP',
    icon: '🥂',
    text: `Ciao {nome}! 🎂🥳

Tantissimi auguri di buon compleanno!

Per il tuo giorno speciale ti riserviamo un trattamento VIP: prenota un tavolo per il prossimo evento e riceverai un upgrade gratuito con area riservata! 🥂✨

Scrivici per prenotare il tuo tavolo birthday! 🎉

— Studios Club & Co`,
  },
  {
    id: 'auguri_lista',
    label: 'Auguri + Lista omaggio',
    icon: '🎟️',
    text: `Ciao {nome}! 🎂

Tanti auguri di buon compleanno da tutto lo staff! 🥳

Per festeggiare ti offriamo l'ingresso omaggio + un drink di benvenuto al prossimo evento! 🍸🎉

Scrivici il tuo nome per la lista birthday!

— Studios Club & Co`,
  },
];

function applyTemplate(template, userName) {
  const firstName = userName ? userName.split(' ')[0] : '';
  return template.replace(/{nome}/g, firstName);
}

// ---- WhatsApp Message Modal ----
function WhatsAppModal({ user, onClose }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('auguri_promo');
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [showTemplateList, setShowTemplateList] = useState(false);

  const selectedTemplate = MESSAGE_TEMPLATES.find(t => t.id === selectedTemplateId);
  const firstName = user.name ? user.name.split(' ')[0] : '';

  // The message to display/send: custom if editing, otherwise from template
  const currentMessage = isEditing
    ? customText
    : applyTemplate(selectedTemplate?.text || '', user.name);

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setIsEditing(false);
    setCustomText('');
    setShowTemplateList(false);
  };

  const handleStartEditing = () => {
    setCustomText(currentMessage);
    setIsEditing(true);
  };

  const handleSend = () => {
    const url = formatWhatsAppUrl(user.phone, currentMessage);
    if (url) window.open(url, '_blank');
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1e293b", borderRadius: 16, width: "100%", maxWidth: 520,
          border: "1px solid #334155", overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{
          background: "#25D366", padding: "14px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MessageCircle size={20} color="#fff" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                WhatsApp a {firstName}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                {user.phone}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8,
            padding: 6, cursor: "pointer", display: "flex",
          }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Template selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
              Scegli messaggio
            </div>

            {/* Current template button (dropdown toggle) */}
            <button
              onClick={() => setShowTemplateList(!showTemplateList)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                background: "#0f172a", border: "1px solid #334155",
                cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                color: "#f1f5f9", fontSize: 13, fontWeight: 600,
              }}
            >
              <span>{selectedTemplate?.icon} {selectedTemplate?.label}</span>
              <ChevronDown size={16} color="#64748b" style={{
                transform: showTemplateList ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }} />
            </button>

            {/* Template list dropdown */}
            {showTemplateList && (
              <div style={{
                marginTop: 4, borderRadius: 10, overflow: "hidden",
                border: "1px solid #334155", background: "#0f172a",
              }}>
                {MESSAGE_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    style={{
                      width: "100%", padding: "10px 14px",
                      background: tpl.id === selectedTemplateId ? "rgba(139,92,246,0.15)" : "transparent",
                      border: "none", borderBottom: "1px solid #1e293b",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                      color: tpl.id === selectedTemplateId ? "#8b5cf6" : "#f1f5f9",
                      fontSize: 12, textAlign: "left",
                    }}
                    onMouseEnter={e => { if (tpl.id !== selectedTemplateId) e.currentTarget.style.background = "#1e293b"; }}
                    onMouseLeave={e => { if (tpl.id !== selectedTemplateId) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 18 }}>{tpl.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{tpl.label}</div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                        {applyTemplate(tpl.text, user.name).substring(0, 60)}...
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message preview / editor */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
            }}>
              <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>
                {isEditing ? "Modifica messaggio" : "Anteprima messaggio"}
              </span>
              {!isEditing && (
                <button
                  onClick={handleStartEditing}
                  style={{
                    background: "none", border: "1px solid #334155", borderRadius: 6,
                    padding: "3px 10px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                    color: "#8b5cf6", fontSize: 10, fontWeight: 600,
                  }}
                >
                  <Edit3 size={10} /> Personalizza
                </button>
              )}
              {isEditing && (
                <button
                  onClick={() => { setIsEditing(false); setCustomText(''); }}
                  style={{
                    background: "none", border: "1px solid #334155", borderRadius: 6,
                    padding: "3px 10px", cursor: "pointer",
                    color: "#94a3b8", fontSize: 10,
                  }}
                >
                  Annulla modifiche
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                style={{
                  width: "100%", minHeight: 180, padding: 14, borderRadius: 10,
                  background: "#0f172a", border: "1px solid #8b5cf6",
                  color: "#f1f5f9", fontSize: 13, lineHeight: 1.6,
                  resize: "vertical", outline: "none", fontFamily: "inherit",
                }}
                placeholder="Scrivi il tuo messaggio personalizzato..."
              />
            ) : (
              <div style={{
                background: "#0f172a", borderRadius: 10, padding: 14,
                border: "1px solid #334155", fontSize: 13, color: "#e2e8f0",
                lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 220,
                overflowY: "auto",
              }}>
                {currentMessage}
              </div>
            )}

            {isEditing && (
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>
                Il nome "{firstName}" viene inserito automaticamente tramite il template. Se modifichi il testo, assicurati di includere il nome dove vuoi.
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!user.phone || !currentMessage.trim()}
            style={{
              width: "100%", padding: "12px 20px", borderRadius: 10,
              background: !user.phone || !currentMessage.trim() ? "#334155" : "#25D366",
              border: "none", cursor: !user.phone || !currentMessage.trim() ? "default" : "pointer",
              color: "#fff", fontSize: 14, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={e => { if (user.phone && currentMessage.trim()) e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <Send size={16} /> Invia su WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

const MESI_NOMI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const GIORNI_NOMI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export default function BirthdaysTab({ data, userStats }) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const [whatsappUser, setWhatsappUser] = useState(null); // user for modal

  // Build birthday lookup: { "MM-DD": [users] }
  const birthdayMap = useMemo(() => {
    const map = {};
    const seen = new Set();

    for (const d of data) {
      if (!d.birthDate || !(d.birthDate instanceof Date)) continue;
      const key = d.email || d.fullName;
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const mm = String(d.birthDate.getMonth() + 1).padStart(2, '0');
      const dd = String(d.birthDate.getDate()).padStart(2, '0');
      const bdKey = `${mm}-${dd}`;

      if (!map[bdKey]) map[bdKey] = [];

      const stats = userStats?.find(u => (u.email && u.email === d.email) || u.name === d.fullName);

      map[bdKey].push({
        name: d.fullName || d.name,
        email: d.email,
        phone: d.phone,
        birthDate: d.birthDate,
        age: today.getFullYear() - d.birthDate.getFullYear(),
        gender: d.gender,
        segment: stats?.segment || null,
        totalRegs: stats?.totalRegs || 0,
        totalParticipated: stats?.totalParticipated || 0,
        events: stats?.events || [],
        eventCount: stats?.eventCount || 0,
      });
    }

    return map;
  }, [data, userStats, today]);

  // Upcoming birthdays
  const upcomingBirthdays = useMemo(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 7;
    const upcoming = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const bdKey = `${mm}-${dd}`;
      const users = birthdayMap[bdKey];
      if (users && users.length) {
        upcoming.push({
          date: new Date(d),
          dateStr: d.toLocaleDateString('it', { weekday: 'short', day: 'numeric', month: 'short' }),
          daysFromNow: i,
          label: i === 0 ? 'OGGI' : i === 1 ? 'Domani' : `Tra ${i} giorni`,
          users,
        });
      }
    }
    return upcoming;
  }, [birthdayMap, timeRange, today]);

  const totalWithBirthday = useMemo(() => {
    return Object.values(birthdayMap).reduce((sum, arr) => sum + arr.length, 0);
  }, [birthdayMap]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startPad = firstDay.getDay();
    const days = [];

    for (let i = 0; i < startPad; i++) days.push(null);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const bdKey = `${mm}-${dd}`;
      const users = birthdayMap[bdKey] || [];
      const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
      days.push({ day: d, users, count: users.length, isToday, bdKey });
    }

    return days;
  }, [viewMonth, viewYear, birthdayMap, today]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectedUsers = selectedDay ? (birthdayMap[selectedDay] || []) : [];

  const openWhatsApp = useCallback((user) => {
    setWhatsappUser(user);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* WhatsApp Modal */}
      {whatsappUser && (
        <WhatsAppModal user={whatsappUser} onClose={() => setWhatsappUser(null)} />
      )}

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={{ background: "#1e293b", borderRadius: 14, padding: "18px 20px", border: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Gift size={18} color="#ec4899" />
            <span style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", fontWeight: 500 }}>Utenti con compleanno</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9" }}>{totalWithBirthday}</div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 14, padding: "18px 20px", border: "1px solid #334155" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>Prossimi 7 giorni</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ec4899" }}>
            {upcomingBirthdays.filter(u => u.daysFromNow < 7).reduce((s, u) => s + u.users.length, 0)}
          </div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 14, padding: "18px 20px", border: "1px solid #334155" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>Oggi</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>
            {upcomingBirthdays.filter(u => u.daysFromNow === 0).reduce((s, u) => s + u.users.length, 0)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Calendar */}
        <Section title="Calendario compleanni">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", padding: "6px 10px", display: "flex" }}>
              <ChevronLeft size={20} color="#94a3b8" />
            </button>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.02em" }}>
              {MESI_NOMI[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", padding: "6px 10px", display: "flex" }}>
              <ChevronRight size={20} color="#94a3b8" />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {GIORNI_NOMI.map(g => (
              <div key={g} style={{ textAlign: "center", fontSize: 12, color: "#64748b", padding: "6px 0", fontWeight: 600 }}>{g}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {calendarDays.map((cell, i) => {
              if (!cell) return <div key={`pad-${i}`} />;
              const isSelected = selectedDay === cell.bdKey;
              return (
                <div
                  key={i}
                  onClick={() => cell.count > 0 && setSelectedDay(isSelected ? null : cell.bdKey)}
                  style={{
                    position: "relative", textAlign: "center", padding: "10px 4px",
                    borderRadius: 8, cursor: cell.count > 0 ? "pointer" : "default",
                    background: isSelected ? "#8b5cf6" : cell.isToday ? "#334155" : "transparent",
                    border: cell.isToday ? "2px solid #8b5cf6" : "2px solid transparent",
                    transition: "all 0.15s",
                    minHeight: 48,
                  }}
                  onMouseEnter={e => { if (cell.count > 0 && !isSelected) e.currentTarget.style.background = "#334155"; }}
                  onMouseLeave={e => { if (!isSelected && !cell.isToday) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontSize: 15, fontWeight: 500, color: isSelected ? "#fff" : cell.isToday ? "#8b5cf6" : "#f1f5f9" }}>
                    {cell.day}
                  </div>
                  {cell.count > 0 && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: isSelected ? "#fff" : "#ec4899",
                      marginTop: 2,
                    }}>
                      {cell.count} 🎂
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* Upcoming list */}
        <Section
          title="Prossimi compleanni"
          extra={
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { key: 'week', label: '7 giorni' },
                { key: 'month', label: '30 giorni' },
              ].map(t => (
                <button key={t.key} onClick={() => setTimeRange(t.key)} style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 11, border: "none", cursor: "pointer",
                  background: timeRange === t.key ? "#8b5cf6" : "#334155",
                  color: timeRange === t.key ? "#fff" : "#94a3b8",
                  fontWeight: 600,
                }}>{t.label}</button>
              ))}
            </div>
          }
        >
          {upcomingBirthdays.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", fontSize: 13, padding: 30 }}>
              Nessun compleanno nei prossimi {timeRange === 'week' ? '7' : '30'} giorni
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 520, overflowY: "auto" }}>
              {upcomingBirthdays.map((group, gi) => (
                <div key={gi}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #334155",
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: group.daysFromNow === 0 ? "#f59e0b" : "#e2e8f0",
                    }}>
                      {group.dateStr}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 8,
                      background: group.daysFromNow === 0 ? "#f59e0b" : group.daysFromNow <= 2 ? "#ef4444" : "#334155",
                      color: "#fff", fontWeight: 700,
                    }}>
                      {group.label}
                    </span>
                  </div>
                  {group.users.map((u, ui) => (
                    <UserBirthdayCard key={ui} user={u} compact onWhatsApp={openWhatsApp} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Selected day detail */}
      {selectedDay && selectedUsers.length > 0 && (
        <Section title={`Compleanni il ${selectedDay.split('-').reverse().join('/')}`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
            {selectedUsers.map((u, i) => (
              <UserBirthdayCard key={i} user={u} onWhatsApp={openWhatsApp} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function UserBirthdayCard({ user, compact, onWhatsApp }) {
  if (compact) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", background: "#0f172a", borderRadius: 10, marginBottom: 6,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
            🎂 {user.name}
            {user.age > 0 && user.age < 100 && (
              <span style={{ color: "#64748b", fontWeight: 400 }}> — {user.age} anni</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
            {user.eventCount} eventi · {user.totalParticipated} presenze
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {user.phone && (
            <button
              onClick={() => onWhatsApp(user)}
              style={{
                background: "#25D366", borderRadius: 6, padding: "3px 8px",
                display: "flex", alignItems: "center", gap: 4,
                border: "none", cursor: "pointer",
                color: "#fff", fontSize: 10, fontWeight: 600,
              }}
              title="Scegli messaggio WhatsApp"
            >
              <MessageCircle size={12} /> WhatsApp
            </button>
          )}
          {user.phone && (
            <a href={`tel:${user.phone}`} style={{ color: "#8b5cf6" }} title={user.phone}>
              <Phone size={14} />
            </a>
          )}
          {user.email && (
            <a href={`mailto:${user.email}`} style={{ color: "#8b5cf6" }} title={user.email}>
              <Mail size={14} />
            </a>
          )}
        </div>
        {user.segment && <SegmentBadge segment={user.segment} />}
      </div>
    );
  }

  return (
    <div style={{
      background: "#0f172a", borderRadius: 10, padding: 14,
      border: "1px solid #334155",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
            🎂 {user.name}
          </div>
          {user.age > 0 && user.age < 100 && (
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Compie {user.age} anni</div>
          )}
        </div>
        {user.segment && <SegmentBadge segment={user.segment} />}
      </div>

      {/* Contact */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 11, flexWrap: "wrap", alignItems: "center" }}>
        {user.phone && (
          <a href={`tel:${user.phone}`} style={{ color: "#8b5cf6", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
            <Phone size={12} /> {user.phone}
          </a>
        )}
        {user.email && (
          <a href={`mailto:${user.email}`} style={{ color: "#8b5cf6", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
            <Mail size={12} /> {user.email}
          </a>
        )}
        {user.phone && (
          <button
            onClick={() => onWhatsApp(user)}
            style={{
              background: "#25D366", borderRadius: 6, padding: "4px 10px",
              display: "flex", alignItems: "center", gap: 4,
              border: "none", cursor: "pointer",
              color: "#fff", fontSize: 11, fontWeight: 600,
            }}
            title="Scegli messaggio WhatsApp"
          >
            <MessageCircle size={13} /> Auguri WhatsApp
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <div style={{ background: "#1e293b", borderRadius: 6, padding: 8, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#64748b" }}>Registrazioni</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{user.totalRegs}</div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 6, padding: 8, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#64748b" }}>Presenze</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>{user.totalParticipated}</div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 6, padding: 8, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#64748b" }}>Eventi</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#8b5cf6" }}>{user.eventCount}</div>
        </div>
      </div>

      {/* Events attended */}
      {user.events.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Eventi frequentati</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {user.events.map((ev, i) => (
              <span key={i} style={{
                background: "#1e293b", borderRadius: 4, padding: "2px 6px",
                fontSize: 10, color: "#94a3b8",
              }}>
                {ev.event}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
