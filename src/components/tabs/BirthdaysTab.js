import { useState, useMemo, useCallback } from 'react';
import { Gift, ChevronLeft, ChevronRight, Phone, Mail, MessageCircle, X, Edit3, Send, ChevronDown, ChevronUp, Calendar, Save, RotateCcw, ChevronsUpDown } from 'lucide-react';
import Section from '../shared/Section';
import { SegmentBadge } from '../shared/Badge';
import { formatWhatsAppUrl, openWhatsAppTab } from '../../utils/whatsapp';
import { colors, alpha, shadows } from '../../config/designTokens';
import { BRAND_REGISTRY, GENRE_LABELS, CATEGORY_LABELS } from '../../config/eventConfig';

// {nome} placeholder gets replaced with user's first name
const OPT_OUT = `Invia STOP per non ricevere più messaggi promozionali.`;

const MESSAGE_TEMPLATES = [
  {
    id: 'auguri_promo',
    label: 'Auguri + Promo 3x2',
    icon: '🎁',
    text: `Ciao {nome}! 🎂🥳

Tanti auguri di buon compleanno da parte di tutto lo staff!

Per festeggiare insieme abbiamo una promozione esclusiva per te: prenota un tavolo per il prossimo evento e con l'acquisto di 2 bottiglie, la terza te la offriamo noi! 🍾🍾🍾

Scrivici per prenotare, ti aspettiamo! 🎉

— Studios Club & Co
${OPT_OUT}`,
  },
  {
    id: 'auguri_semplice',
    label: 'Auguri semplici',
    icon: '🎂',
    text: `Ciao {nome}! 🎂

Tanti auguri di buon compleanno da parte di tutto lo staff! 🥳🎉

Ti aspettiamo presto per festeggiare insieme!

— Studios Club & Co
${OPT_OUT}`,
  },
  {
    id: 'auguri_tavolo',
    label: 'Auguri + Tavolo VIP',
    icon: '🥂',
    text: `Ciao {nome}! 🎂🥳

Tantissimi auguri di buon compleanno!

Per il tuo giorno speciale ti riserviamo un trattamento VIP: prenota un tavolo per il prossimo evento e riceverai un upgrade gratuito con area riservata! 🥂✨

Scrivici per prenotare il tuo tavolo birthday! 🎉

— Studios Club & Co
${OPT_OUT}`,
  },
  {
    id: 'auguri_lista',
    label: 'Auguri + Lista omaggio',
    icon: '🎟️',
    text: `Ciao {nome}! 🎂

Tanti auguri di buon compleanno da tutto lo staff! 🥳

Per festeggiare ti offriamo l'ingresso omaggio + un drink di benvenuto al prossimo evento! 🍸🎉

Scrivici il tuo nome per la lista birthday!

— Studios Club & Co
${OPT_OUT}`,
  },
];

function applyTemplate(template, userName) {
  const firstName = userName ? userName.split(' ')[0] : '';
  return template.replace(/{nome}/g, firstName);
}

// Load saved custom templates from localStorage
function getSavedTemplates() {
  try {
    return JSON.parse(localStorage.getItem('ultranalytics_custom_templates') || '{}');
  } catch { return {}; }
}

function saveCustomTemplate(templateId, text) {
  const saved = getSavedTemplates();
  saved[templateId] = text;
  localStorage.setItem('ultranalytics_custom_templates', JSON.stringify(saved));
}

function removeSavedTemplate(templateId) {
  const saved = getSavedTemplates();
  delete saved[templateId];
  localStorage.setItem('ultranalytics_custom_templates', JSON.stringify(saved));
}

// ---- WhatsApp Message Modal ----
function WhatsAppModal({ user, onClose }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('auguri_promo');
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState(() => getSavedTemplates());

  const selectedTemplate = MESSAGE_TEMPLATES.find(t => t.id === selectedTemplateId);
  const firstName = user.name ? user.name.split(' ')[0] : '';

  // Check if current template has a saved custom version
  const hasSavedCustom = !!savedTemplates[selectedTemplateId];

  // The message to display/send
  const currentMessage = isEditing
    ? customText
    : hasSavedCustom
      ? applyTemplate(savedTemplates[selectedTemplateId], user.name)
      : applyTemplate(selectedTemplate?.text || '', user.name);

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setIsEditing(false);
    setCustomText('');
    setShowTemplateList(false);
  };

  const handleStartEditing = () => {
    // Edit from the raw template (with {nome} placeholder), not the applied version
    const rawText = hasSavedCustom
      ? savedTemplates[selectedTemplateId]
      : selectedTemplate?.text || '';
    setCustomText(rawText);
    setIsEditing(true);
  };

  const handleSave = () => {
    saveCustomTemplate(selectedTemplateId, customText);
    setSavedTemplates(getSavedTemplates());
    setIsEditing(false);
  };

  const handleRestore = () => {
    removeSavedTemplate(selectedTemplateId);
    setSavedTemplates(getSavedTemplates());
    setIsEditing(false);
    setCustomText('');
  };

  const handleSend = () => {
    const url = formatWhatsAppUrl(user.phone, currentMessage);
    openWhatsAppTab(url);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: colors.overlay.dark,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 20,
    }} onClick={onClose}>
      <div
        className="wa-modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.bg.card, borderRadius: 16, width: "100%", maxWidth: 520,
          border: `1px solid ${colors.border.default}`, overflow: "hidden",
          boxShadow: shadows.xl,
        }}
      >
        {/* Header */}
        <div style={{
          background: colors.whatsapp, padding: "14px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MessageCircle size={20} color={colors.text.inverse} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text.inverse }}>
                WhatsApp a {firstName}
              </div>
              <div style={{ fontSize: 11, color: alpha.white[80] }}>
                {user.phone}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: alpha.white[20], border: "none", borderRadius: 8,
            padding: 6, cursor: "pointer", display: "flex",
          }}>
            <X size={16} color={colors.text.inverse} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Template selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: colors.text.muted, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
              Scegli messaggio
            </div>

            {/* Current template button (dropdown toggle) */}
            <button
              onClick={() => setShowTemplateList(!showTemplateList)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                background: colors.bg.page, border: `1px solid ${colors.border.default}`,
                cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                color: colors.text.primary, fontSize: 13, fontWeight: 600,
              }}
            >
              <span>{selectedTemplate?.icon} {selectedTemplate?.label}{hasSavedCustom ? ' ✏️' : ''}</span>
              <ChevronDown size={16} color={colors.text.disabled} style={{
                transform: showTemplateList ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }} />
            </button>

            {/* Template list dropdown */}
            {showTemplateList && (
              <div style={{
                marginTop: 4, borderRadius: 10, overflow: "hidden",
                border: `1px solid ${colors.border.default}`, background: colors.bg.page,
              }}>
                {MESSAGE_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    style={{
                      width: "100%", padding: "10px 14px",
                      background: tpl.id === selectedTemplateId ? alpha.brand[15] : "transparent",
                      border: "none", borderBottom: `1px solid ${colors.border.subtle}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                      color: tpl.id === selectedTemplateId ? colors.brand.purple : colors.text.primary,
                      fontSize: 12, textAlign: "left",
                    }}
                    onMouseEnter={e => { if (tpl.id !== selectedTemplateId) e.currentTarget.style.background = colors.bg.card; }}
                    onMouseLeave={e => { if (tpl.id !== selectedTemplateId) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 18 }}>{tpl.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {tpl.label}
                        {savedTemplates[tpl.id] && <span style={{ color: colors.status.warning, fontSize: 11, marginLeft: 6 }}>✏️ personalizzato</span>}
                      </div>
                      <div style={{ fontSize: 11, color: colors.text.disabled, marginTop: 2 }}>
                        {applyTemplate(savedTemplates[tpl.id] || tpl.text, user.name).substring(0, 60)}...
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
              <span style={{ fontSize: 11, color: colors.text.muted, textTransform: "uppercase", fontWeight: 600 }}>
                {isEditing ? "Modifica messaggio" : hasSavedCustom ? "Anteprima (personalizzato)" : "Anteprima messaggio"}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {!isEditing && hasSavedCustom && (
                  <button
                    onClick={handleRestore}
                    style={{
                      background: "none", border: `1px solid ${colors.border.default}`, borderRadius: 6,
                      padding: "3px 10px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                      color: colors.status.warning, fontSize: 11, fontWeight: 600,
                    }}
                    title="Ripristina il messaggio originale"
                  >
                    <RotateCcw size={10} /> Ripristina originale
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={handleStartEditing}
                    style={{
                      background: "none", border: `1px solid ${colors.border.default}`, borderRadius: 6,
                      padding: "3px 10px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                      color: colors.brand.purple, fontSize: 11, fontWeight: 600,
                    }}
                  >
                    <Edit3 size={10} /> Personalizza
                  </button>
                )}
                {isEditing && (
                  <>
                    <button
                      onClick={handleSave}
                      style={{
                        background: alpha.success[15], border: `1px solid ${colors.status.success}`, borderRadius: 6,
                        padding: "3px 10px", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4,
                        color: colors.status.success, fontSize: 11, fontWeight: 600,
                      }}
                      title="Salva come template personalizzato"
                    >
                      <Save size={10} /> Salva
                    </button>
                    <button
                      onClick={() => { setIsEditing(false); setCustomText(''); }}
                      style={{
                        background: "none", border: `1px solid ${colors.border.default}`, borderRadius: 6,
                        padding: "3px 10px", cursor: "pointer",
                        color: colors.text.muted, fontSize: 11,
                      }}
                    >
                      Annulla
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                style={{
                  width: "100%", minHeight: 180, padding: 14, borderRadius: 10,
                  background: colors.bg.page, border: `1px solid ${colors.brand.purple}`,
                  color: colors.text.primary, fontSize: 13, lineHeight: 1.6,
                  resize: "vertical", outline: "none", fontFamily: "inherit",
                }}
                placeholder="Scrivi il tuo messaggio personalizzato..."
              />
            ) : (
              <div style={{
                background: colors.bg.page, borderRadius: 10, padding: 14,
                border: `1px solid ${colors.border.default}`, fontSize: 13, color: colors.text.secondary,
                lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 220,
                overflowY: "auto",
              }}>
                {currentMessage}
              </div>
            )}

            {isEditing && (
              <div style={{ fontSize: 11, color: colors.text.disabled, marginTop: 6 }}>
                Usa <strong style={{ color: colors.brand.purple }}>{'{nome}'}</strong> dove vuoi inserire il nome dell'utente. Clicca <strong>Salva</strong> per mantenere le modifiche per le prossime volte.
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!user.phone || !currentMessage.trim()}
            style={{
              width: "100%", padding: "12px 20px", borderRadius: 10,
              background: !user.phone || !currentMessage.trim() ? colors.bg.elevated : colors.whatsapp,
              border: "none", cursor: !user.phone || !currentMessage.trim() ? "default" : "pointer",
              color: colors.text.inverse, fontSize: 14, fontWeight: 700,
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

export default function BirthdaysTab({ data, allData, userStats, selectedCategory, selectedGenre }) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const [whatsappUser, setWhatsappUser] = useState(null); // user for modal
  const [browseStartDate, setBrowseStartDate] = useState(null); // null = today
  const [collapseKey, setCollapseKey] = useState(0); // increment to collapse all expanded cards

  // Build a lookup: for each user key -> count of participations in selected genre/category
  const filterRelevanceMap = useMemo(() => {
    if ((!selectedCategory || selectedCategory === 'all') && (!selectedGenre || selectedGenre === 'all')) return null;
    const relevance = {};
    const sourceData = allData || data;
    for (const d of sourceData) {
      if (!d.attended) continue;
      const userKey = (d.email || d.fullName || d.name || '').toLowerCase().trim();
      if (!userKey) continue;

      let matches = true;
      if (selectedCategory && selectedCategory !== 'all') {
        if (d.category !== selectedCategory) matches = false;
      }
      if (selectedGenre && selectedGenre !== 'all') {
        // Check genres on the record, or fallback to BRAND_REGISTRY
        let genres = d.genres;
        if (!genres || !Array.isArray(genres) || genres.length === 0) {
          const config = BRAND_REGISTRY[d.brand];
          genres = config?.genres || [];
        }
        if (!genres.includes(selectedGenre)) matches = false;
      }

      if (matches) {
        relevance[userKey] = (relevance[userKey] || 0) + 1;
      }
    }
    return relevance;
  }, [allData, data, selectedCategory, selectedGenre]);

  // Helper to get relevance score for a user
  const getRelevance = useCallback((user) => {
    if (!filterRelevanceMap) return 0;
    const key1 = (user.email || '').toLowerCase().trim();
    const key2 = (user.name || '').toLowerCase().trim();
    return (key1 && filterRelevanceMap[key1]) || (key2 && filterRelevanceMap[key2]) || 0;
  }, [filterRelevanceMap]);

  // Sort users within a list by relevance to selected genre/category
  const sortByRelevance = useCallback((users) => {
    if (!filterRelevanceMap) return users;
    return [...users].sort((a, b) => getRelevance(b) - getRelevance(a));
  }, [filterRelevanceMap, getRelevance]);

  // Active filter label for display
  const activeFilterLabel = useMemo(() => {
    const parts = [];
    if (selectedCategory && selectedCategory !== 'all') {
      const cat = CATEGORY_LABELS[selectedCategory];
      parts.push(cat?.label || selectedCategory);
    }
    if (selectedGenre && selectedGenre !== 'all') {
      const gen = GENRE_LABELS[selectedGenre];
      parts.push(gen?.label || selectedGenre);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [selectedCategory, selectedGenre]);

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

    // Sort each day's users by relevance if a filter is active
    if (filterRelevanceMap) {
      for (const key of Object.keys(map)) {
        map[key] = sortByRelevance(map[key]);
      }
    }

    return map;
  }, [data, userStats, today, filterRelevanceMap, sortByRelevance]);

  // Upcoming birthdays — start from browseStartDate if set, otherwise today
  const startDate = browseStartDate || today;
  const isBrowsing = browseStartDate !== null;

  const upcomingBirthdays = useMemo(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 7;
    const upcoming = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const bdKey = `${mm}-${dd}`;
      const users = birthdayMap[bdKey];
      if (users && users.length) {
        // Compute days from today for label
        const diffMs = d.setHours(0,0,0,0) - new Date(today).setHours(0,0,0,0);
        const daysFromToday = Math.round(diffMs / 86400000);
        const label = daysFromToday === 0 ? 'OGGI' : daysFromToday === 1 ? 'Domani'
          : daysFromToday === -1 ? 'Ieri' : daysFromToday < 0 ? `${Math.abs(daysFromToday)} giorni fa`
          : `Tra ${daysFromToday} giorni`;
        upcoming.push({
          date: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i),
          dateStr: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
            .toLocaleDateString('it', { weekday: 'short', day: 'numeric', month: 'short' }),
          daysFromNow: i,
          daysFromToday,
          label,
          users,
        });
      }
    }
    return upcoming;
  }, [birthdayMap, timeRange, startDate, today]);

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

      {/* Active filter banner */}
      {activeFilterLabel && (
        <div style={{
          background: alpha.brand[8], border: `1px solid ${alpha.brand[30]}`,
          borderRadius: 10, padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 12, color: colors.brand.purple,
        }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          Ordinamento per presenze: <strong style={{ color: colors.brand.purple }}>{activeFilterLabel}</strong>
          <span style={{ color: colors.text.disabled, fontSize: 11 }}> — gli utenti con più presenze in questa categoria appaiono per primi</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="bday-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={{ background: colors.bg.card, borderRadius: 14, padding: "18px 20px", border: `1px solid ${colors.border.default}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Gift size={18} color={colors.brand.pink} />
            <span style={{ fontSize: 12, color: colors.text.muted, textTransform: "uppercase", fontWeight: 500 }}>Utenti con compleanno</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: colors.text.primary }}>{totalWithBirthday}</div>
        </div>
        <div style={{ background: colors.bg.card, borderRadius: 14, padding: "18px 20px", border: `1px solid ${colors.border.default}` }}>
          <div style={{ fontSize: 12, color: colors.text.muted, textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>Prossimi 7 giorni</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: colors.brand.pink }}>
            {upcomingBirthdays.filter(u => u.daysFromNow < 7).reduce((s, u) => s + u.users.length, 0)}
          </div>
        </div>
        <div style={{ background: colors.bg.card, borderRadius: 14, padding: "18px 20px", border: `1px solid ${colors.border.default}` }}>
          <div style={{ fontSize: 12, color: colors.text.muted, textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>Oggi</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: colors.status.warning }}>
            {upcomingBirthdays.filter(u => u.daysFromNow === 0).reduce((s, u) => s + u.users.length, 0)}
          </div>
        </div>
      </div>

      <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Calendar */}
        <Section title="Calendario compleanni">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: colors.bg.page, border: `1px solid ${colors.border.default}`, borderRadius: 8, cursor: "pointer", padding: "6px 10px", display: "flex" }}>
              <ChevronLeft size={20} color={colors.text.muted} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 700, color: colors.text.primary, letterSpacing: "0.02em" }}>
              {MESI_NOMI[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ background: colors.bg.page, border: `1px solid ${colors.border.default}`, borderRadius: 8, cursor: "pointer", padding: "6px 10px", display: "flex" }}>
              <ChevronRight size={20} color={colors.text.muted} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {GIORNI_NOMI.map(g => (
              <div key={g} style={{ textAlign: "center", fontSize: 12, color: colors.text.disabled, padding: "6px 0", fontWeight: 600 }}>{g}</div>
            ))}
          </div>

          <div className="calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {calendarDays.map((cell, i) => {
              if (!cell) return <div key={`pad-${i}`} />;
              const isSelected = selectedDay === cell.bdKey;
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (cell.count > 0) {
                      const clickedDate = new Date(viewYear, viewMonth, cell.day);
                      setSelectedDay(isSelected ? null : cell.bdKey);
                      // Shift "Prossimi compleanni" to start from clicked date
                      setBrowseStartDate(isSelected ? null : clickedDate);
                    }
                  }}
                  style={{
                    position: "relative", textAlign: "center", padding: "10px 4px",
                    borderRadius: 8, cursor: cell.count > 0 ? "pointer" : "default",
                    background: isSelected ? colors.brand.purple : cell.isToday ? colors.bg.elevated : "transparent",
                    border: cell.isToday ? `2px solid ${colors.brand.purple}` : "2px solid transparent",
                    transition: "all 0.15s",
                    minHeight: 48,
                  }}
                  onMouseEnter={e => { if (cell.count > 0 && !isSelected) e.currentTarget.style.background = colors.bg.elevated; }}
                  onMouseLeave={e => { if (!isSelected && !cell.isToday) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontSize: 15, fontWeight: 500, color: isSelected ? colors.text.inverse : cell.isToday ? colors.brand.purple : colors.text.primary }}>
                    {cell.day}
                  </div>
                  {cell.count > 0 && (
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: isSelected ? colors.text.inverse : colors.brand.pink,
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
          title={isBrowsing
            ? `Compleanni dal ${startDate.toLocaleDateString('it', { day: 'numeric', month: 'short' })}`
            : "Prossimi compleanni"
          }
          extra={
            <div className="bday-extra-controls" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {isBrowsing && (
                <button onClick={() => { setBrowseStartDate(null); setSelectedDay(null); setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }} style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 11, border: `1px solid ${colors.brand.purple}`, cursor: "pointer",
                  background: alpha.brand[15], color: colors.brand.purple, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Calendar size={12} /> Torna a oggi
                </button>
              )}
              <button onClick={() => setCollapseKey(k => k + 1)} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11, border: `1px solid ${colors.border.default}`, cursor: "pointer",
                background: "transparent", color: colors.text.muted, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
              }}
                title="Chiudi tutti gli utenti espansi"
              >
                <ChevronsUpDown size={12} /> Chiudi tutti
              </button>
              {[
                { key: 'week', label: '7 giorni' },
                { key: 'month', label: '30 giorni' },
              ].map(t => (
                <button key={t.key} onClick={() => setTimeRange(t.key)} style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 11, border: "none", cursor: "pointer",
                  background: timeRange === t.key ? colors.brand.purple : colors.bg.elevated,
                  color: timeRange === t.key ? colors.text.inverse : colors.text.muted,
                  fontWeight: 600,
                }}>{t.label}</button>
              ))}
            </div>
          }
        >
          {upcomingBirthdays.length === 0 ? (
            <div style={{ textAlign: "center", color: colors.text.disabled, fontSize: 13, padding: 30 }}>
              Nessun compleanno {isBrowsing ? 'in questo periodo' : `nei prossimi ${timeRange === 'week' ? '7' : '30'} giorni`}
            </div>
          ) : (
            <div className="bday-upcoming-list" style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 520, overflowY: "auto" }}>
              {upcomingBirthdays.map((group, gi) => (
                <div key={gi}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${colors.border.default}`,
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: group.daysFromToday === 0 ? colors.status.warning : colors.text.secondary,
                    }}>
                      {group.dateStr}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 8,
                      background: group.daysFromToday === 0 ? colors.status.warning : group.daysFromToday > 0 && group.daysFromToday <= 2 ? colors.status.error : colors.bg.elevated,
                      color: colors.text.inverse, fontWeight: 700,
                    }}>
                      {group.label}
                    </span>
                  </div>
                  {group.users.map((u, ui) => (
                    <UserBirthdayCard key={`${ui}-${collapseKey}`} user={u} compact onWhatsApp={openWhatsApp} relevance={getRelevance(u)} activeFilter={activeFilterLabel} />
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
          <div className="selected-day-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
            {selectedUsers.map((u, i) => (
              <UserBirthdayCard key={`sel-${i}-${collapseKey}`} user={u} onWhatsApp={openWhatsApp} relevance={getRelevance(u)} activeFilter={activeFilterLabel} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function UserBirthdayCard({ user, compact, onWhatsApp, relevance, activeFilter }) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div style={{
        background: colors.bg.page, borderRadius: 10, marginBottom: 6,
        borderLeft: relevance > 0 ? `3px solid ${colors.brand.purple}` : "3px solid transparent",
        overflow: "hidden",
      }}>
        {/* Compact header — always visible */}
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = colors.bg.card; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text.primary, display: "flex", alignItems: "center", gap: 6 }}>
              🎂 {user.name}
              {user.age > 0 && user.age < 100 && (
                <span style={{ color: colors.text.disabled, fontWeight: 400 }}> — {user.age} anni</span>
              )}
              {user.segment && <SegmentBadge segment={user.segment} />}
            </div>
            <div style={{ fontSize: 11, color: colors.text.disabled, marginTop: 3 }}>
              {user.eventCount} eventi · {user.totalParticipated} presenze
              {relevance > 0 && activeFilter && (
                <span style={{ color: colors.brand.purple, fontWeight: 600 }}> · {relevance} presenze {activeFilter}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {user.phone && (
              <button
                onClick={(e) => { e.stopPropagation(); onWhatsApp(user); }}
                style={{
                  background: colors.whatsapp, borderRadius: 6, padding: "3px 8px",
                  display: "flex", alignItems: "center", gap: 4,
                  border: "none", cursor: "pointer",
                  color: colors.text.inverse, fontSize: 11, fontWeight: 600,
                }}
                title="Scegli messaggio WhatsApp"
              >
                <MessageCircle size={12} /> WhatsApp
              </button>
            )}
            {user.phone && (
              <a href={`tel:${user.phone}`} style={{ color: colors.brand.purple }} title={user.phone} onClick={e => e.stopPropagation()}>
                <Phone size={14} />
              </a>
            )}
            {user.email && (
              <a href={`mailto:${user.email}`} style={{ color: colors.brand.purple }} title={user.email} onClick={e => e.stopPropagation()}>
                <Mail size={14} />
              </a>
            )}
            {expanded ? <ChevronUp size={14} color={colors.text.disabled} /> : <ChevronDown size={14} color={colors.text.disabled} />}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${colors.border.default}` }}>
            {/* Contact info */}
            <div style={{ display: "flex", gap: 12, padding: "10px 0", fontSize: 11, flexWrap: "wrap", alignItems: "center" }}>
              {user.phone && (
                <span style={{ color: colors.text.muted, display: "flex", alignItems: "center", gap: 4 }}>
                  <Phone size={11} color={colors.brand.purple} /> {user.phone}
                </span>
              )}
              {user.email && (
                <span style={{ color: colors.text.muted, display: "flex", alignItems: "center", gap: 4 }}>
                  <Mail size={11} color={colors.brand.purple} /> {user.email}
                </span>
              )}
              {user.birthDate && (
                <span style={{ color: colors.text.muted, display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={11} color={colors.brand.purple} /> {user.birthDate.toLocaleDateString('it', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>

            {/* Stats grid */}
            <div className="user-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
              <div style={{ background: colors.bg.card, borderRadius: 6, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: colors.text.disabled }}>Registrazioni</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.text.primary }}>{user.totalRegs}</div>
              </div>
              <div style={{ background: colors.bg.card, borderRadius: 6, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: colors.text.disabled }}>Presenze</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.status.success }}>{user.totalParticipated}</div>
              </div>
              <div style={{ background: colors.bg.card, borderRadius: 6, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: colors.text.disabled }}>Eventi</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.brand.purple }}>{user.eventCount}</div>
              </div>
            </div>

            {/* Events attended */}
            {user.events && user.events.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: colors.text.disabled, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
                  Eventi frequentati
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {user.events.map((ev, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "5px 8px", borderRadius: 6, background: colors.bg.card, fontSize: 11,
                    }}>
                      <span style={{ color: colors.text.primary }}>{ev.event}</span>
                      <span style={{ color: colors.text.muted, fontSize: 10 }}>
                        {ev.count} reg. / {ev.participated} pres.
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: colors.bg.page, borderRadius: 10, padding: 14,
      border: `1px solid ${colors.border.default}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text.primary }}>
            🎂 {user.name}
          </div>
          {user.age > 0 && user.age < 100 && (
            <div style={{ fontSize: 11, color: colors.text.muted }}>Compie {user.age} anni</div>
          )}
        </div>
        {user.segment && <SegmentBadge segment={user.segment} />}
      </div>

      {/* Contact */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 11, flexWrap: "wrap", alignItems: "center" }}>
        {user.phone && (
          <a href={`tel:${user.phone}`} style={{ color: colors.brand.purple, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
            <Phone size={12} /> {user.phone}
          </a>
        )}
        {user.email && (
          <a href={`mailto:${user.email}`} style={{ color: colors.brand.purple, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
            <Mail size={12} /> {user.email}
          </a>
        )}
        {user.phone && (
          <button
            onClick={() => onWhatsApp(user)}
            style={{
              background: colors.whatsapp, borderRadius: 6, padding: "4px 10px",
              display: "flex", alignItems: "center", gap: 4,
              border: "none", cursor: "pointer",
              color: colors.text.inverse, fontSize: 11, fontWeight: 600,
            }}
            title="Scegli messaggio WhatsApp"
          >
            <MessageCircle size={13} /> Auguri WhatsApp
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="user-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <div style={{ background: colors.bg.card, borderRadius: 6, padding: 8, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: colors.text.disabled }}>Registrazioni</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text.primary }}>{user.totalRegs}</div>
        </div>
        <div style={{ background: colors.bg.card, borderRadius: 6, padding: 8, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: colors.text.disabled }}>Presenze</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.status.success }}>{user.totalParticipated}</div>
        </div>
        <div style={{ background: colors.bg.card, borderRadius: 6, padding: 8, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: colors.text.disabled }}>Eventi</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.brand.purple }}>{user.eventCount}</div>
        </div>
      </div>

      {/* Events attended */}
      {user.events.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: colors.text.disabled, textTransform: "uppercase", marginBottom: 4 }}>Eventi frequentati</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {user.events.map((ev, i) => (
              <span key={i} style={{
                background: colors.bg.card, borderRadius: 4, padding: "2px 6px",
                fontSize: 11, color: colors.text.muted,
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
