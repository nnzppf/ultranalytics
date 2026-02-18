import { useState, useMemo } from 'react';
import { Gift, ChevronLeft, ChevronRight, Phone, Mail, MessageCircle } from 'lucide-react';
import Section from '../shared/Section';
import { SegmentBadge } from '../shared/Badge';

// Format phone for WhatsApp (Italian numbers: add 39 prefix)
function formatWhatsAppUrl(phone, message) {
  if (!phone) return null;
  let num = phone.replace(/[\s\-()./]/g, '');
  // If starts with +, remove it
  if (num.startsWith('+')) num = num.slice(1);
  // If starts with 00, remove it
  if (num.startsWith('00')) num = num.slice(2);
  // If starts with 3 (Italian mobile without prefix), add 39
  if (num.startsWith('3') && num.length === 10) num = '39' + num;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${num}?text=${encoded}`;
}

function buildBirthdayMessage(userName) {
  const firstName = userName ? userName.split(' ')[0] : '';
  return `Ciao ${firstName}! 🎂 Tanti auguri di buon compleanno da parte di tutto lo staff! 🥳🎉 Ti aspettiamo presto per festeggiare insieme!`;
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
  const [timeRange, setTimeRange] = useState('week'); // week | month | custom

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

      // Find user stats if available
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

  // Total users with birthdays
  const totalWithBirthday = useMemo(() => {
    return Object.values(birthdayMap).reduce((sum, arr) => sum + arr.length, 0);
  }, [birthdayMap]);

  // Calendar data for the selected month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const days = [];

    // Padding for start
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

  // Users for selected day
  const selectedUsers = selectedDay ? (birthdayMap[selectedDay] || []) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div style={{ background: "#1e293b", borderRadius: 12, padding: "14px 16px", border: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Gift size={14} color="#ec4899" />
            <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>Utenti con compleanno</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>{totalWithBirthday}</div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 12, padding: "14px 16px", border: "1px solid #334155" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Prossimi 7 giorni</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#ec4899" }}>
            {upcomingBirthdays.filter(u => u.daysFromNow < 7).reduce((s, u) => s + u.users.length, 0)}
          </div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 12, padding: "14px 16px", border: "1px solid #334155" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Oggi</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b" }}>
            {upcomingBirthdays.filter(u => u.daysFromNow === 0).reduce((s, u) => s + u.users.length, 0)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Calendar */}
        <Section title="Calendario compleanni">
          {/* Month navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <ChevronLeft size={18} color="#94a3b8" />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>
              {MESI_NOMI[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <ChevronRight size={18} color="#94a3b8" />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {GIORNI_NOMI.map(g => (
              <div key={g} style={{ textAlign: "center", fontSize: 10, color: "#64748b", padding: 4 }}>{g}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {calendarDays.map((cell, i) => {
              if (!cell) return <div key={`pad-${i}`} />;
              const isSelected = selectedDay === cell.bdKey;
              return (
                <div
                  key={i}
                  onClick={() => cell.count > 0 && setSelectedDay(isSelected ? null : cell.bdKey)}
                  style={{
                    position: "relative", textAlign: "center", padding: "6px 2px",
                    borderRadius: 6, cursor: cell.count > 0 ? "pointer" : "default",
                    background: isSelected ? "#8b5cf6" : cell.isToday ? "#334155" : "transparent",
                    border: cell.isToday ? "1px solid #8b5cf6" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (cell.count > 0 && !isSelected) e.currentTarget.style.background = "#334155"; }}
                  onMouseLeave={e => { if (!isSelected && !cell.isToday) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontSize: 12, color: isSelected ? "#fff" : cell.isToday ? "#8b5cf6" : "#f1f5f9" }}>
                    {cell.day}
                  </div>
                  {cell.count > 0 && (
                    <div style={{
                      fontSize: 8, fontWeight: 700, color: isSelected ? "#fff" : "#ec4899",
                      marginTop: 1,
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
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { key: 'week', label: '7 giorni' },
                { key: 'month', label: '30 giorni' },
              ].map(t => (
                <button key={t.key} onClick={() => setTimeRange(t.key)} style={{
                  padding: "3px 10px", borderRadius: 6, fontSize: 10, border: "none", cursor: "pointer",
                  background: timeRange === t.key ? "#8b5cf6" : "#334155",
                  color: timeRange === t.key ? "#fff" : "#94a3b8",
                }}>{t.label}</button>
              ))}
            </div>
          }
        >
          {upcomingBirthdays.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", fontSize: 12, padding: 20 }}>
              Nessun compleanno nei prossimi {timeRange === 'week' ? '7' : '30'} giorni
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
              {upcomingBirthdays.map((group, gi) => (
                <div key={gi}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 6,
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: group.daysFromNow === 0 ? "#f59e0b" : "#94a3b8",
                    }}>
                      {group.dateStr}
                    </span>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 6,
                      background: group.daysFromNow === 0 ? "#f59e0b" : group.daysFromNow <= 2 ? "#ef4444" : "#334155",
                      color: "#fff", fontWeight: 600,
                    }}>
                      {group.label}
                    </span>
                  </div>
                  {group.users.map((u, ui) => (
                    <UserBirthdayCard key={ui} user={u} compact />
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
              <UserBirthdayCard key={i} user={u} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function UserBirthdayCard({ user, compact }) {
  if (compact) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 10px", background: "#0f172a", borderRadius: 8, marginBottom: 4,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9" }}>
            🎂 {user.name}
            {user.age > 0 && user.age < 100 && (
              <span style={{ color: "#64748b", fontWeight: 400 }}> — {user.age} anni</span>
            )}
          </div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
            {user.eventCount} eventi · {user.totalParticipated} presenze
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {user.phone && (
            <a
              href={formatWhatsAppUrl(user.phone, buildBirthdayMessage(user.name))}
              target="_blank" rel="noopener noreferrer"
              style={{
                background: "#25D366", borderRadius: 6, padding: "3px 8px",
                display: "flex", alignItems: "center", gap: 4,
                textDecoration: "none", color: "#fff", fontSize: 10, fontWeight: 600,
              }}
              title="Invia auguri su WhatsApp"
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
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
          <a
            href={formatWhatsAppUrl(user.phone, buildBirthdayMessage(user.name))}
            target="_blank" rel="noopener noreferrer"
            style={{
              background: "#25D366", borderRadius: 6, padding: "4px 10px",
              display: "flex", alignItems: "center", gap: 4,
              textDecoration: "none", color: "#fff", fontSize: 11, fontWeight: 600,
            }}
            title="Invia auguri su WhatsApp"
          >
            <MessageCircle size={13} /> Auguri WhatsApp
          </a>
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
