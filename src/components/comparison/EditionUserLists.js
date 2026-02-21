import { useState, useMemo } from 'react';
import { ChevronDown, MessageCircle, Phone, Search, X, Edit3, Send, Layers } from 'lucide-react';
import { SegmentBadge } from '../shared/Badge';
import { formatWhatsAppUrl, openWhatsAppTab, applyTemplate, RETARGET_TEMPLATES } from '../../utils/whatsapp';
import { colors, font, radius, shadows, presets, transition as tr, alpha } from '../../config/designTokens';

// ---- Retarget WhatsApp Modal ----
function WhatsAppRetargetModal({ user, brand, eventDate, eventLink, onClose }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('invito_standard');
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [showTemplateList, setShowTemplateList] = useState(false);

  const selectedTemplate = RETARGET_TEMPLATES.find(t => t.id === selectedTemplateId);
  const firstName = user.fullName ? user.fullName.split(' ')[0] : '';
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  const replacements = { nome: firstName, brand, data: formattedDate, link: eventLink || '' };

  const currentMessage = isEditing
    ? customText
    : applyTemplate(selectedTemplate?.text || '', replacements);

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
    openWhatsAppTab(url);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: colors.overlay.dark,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.bg.card, borderRadius: radius["4xl"], width: "100%", maxWidth: 520,
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
              <div style={{ fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text.inverse }}>
                Invita {firstName} a {brand}
              </div>
              <div style={{ fontSize: font.size.xs, color: alpha.white[80] }}>
                {user.phone}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: alpha.white[20], border: "none", borderRadius: radius.lg,
            padding: 6, cursor: "pointer", display: "flex",
          }}>
            <X size={16} color={colors.text.inverse} />
          </button>
        </div>

        <div style={{ padding: 20, maxHeight: "70vh", overflowY: "auto" }}>
          {/* Template selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...presets.sectionLabel, marginBottom: 8 }}>
              Scegli messaggio
            </div>
            <button
              onClick={() => setShowTemplateList(!showTemplateList)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: radius.xl,
                background: colors.bg.input, border: `1px solid ${colors.border.default}`,
                cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                color: colors.text.primary, fontSize: font.size.base, fontWeight: font.weight.semibold,
              }}
            >
              <span>{selectedTemplate?.icon} {selectedTemplate?.label}</span>
              <ChevronDown size={16} color={colors.text.disabled} style={{
                transform: showTemplateList ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }} />
            </button>

            {showTemplateList && (
              <div style={{
                marginTop: 4, borderRadius: radius.xl, overflow: "hidden",
                border: `1px solid ${colors.border.default}`, background: colors.bg.input,
              }}>
                {RETARGET_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    style={{
                      width: "100%", padding: "10px 14px",
                      background: tpl.id === selectedTemplateId ? alpha.brand[15] : "transparent",
                      border: "none", borderBottom: `1px solid ${colors.border.subtle}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                      color: tpl.id === selectedTemplateId ? colors.brand.purple : colors.text.primary,
                      fontSize: font.size.sm, textAlign: "left",
                    }}
                    onMouseEnter={e => { if (tpl.id !== selectedTemplateId) e.currentTarget.style.background = colors.bg.card; }}
                    onMouseLeave={e => { if (tpl.id !== selectedTemplateId) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 18 }}>{tpl.icon}</span>
                    <div>
                      <div style={{ fontWeight: font.weight.semibold }}>{tpl.label}</div>
                      <div style={{ fontSize: font.size.xs, color: colors.text.disabled, marginTop: 2 }}>
                        {applyTemplate(tpl.text, replacements).substring(0, 60)}...
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
              <span style={{ ...presets.sectionLabel }}>
                {isEditing ? "Modifica messaggio" : "Anteprima messaggio"}
              </span>
              {!isEditing && (
                <button
                  onClick={handleStartEditing}
                  style={{
                    background: "none", border: `1px solid ${colors.border.default}`, borderRadius: radius.md,
                    padding: "3px 10px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                    color: colors.brand.purple, fontSize: font.size.xs, fontWeight: font.weight.semibold,
                  }}
                >
                  <Edit3 size={10} /> Personalizza
                </button>
              )}
              {isEditing && (
                <button
                  onClick={() => { setIsEditing(false); setCustomText(''); }}
                  style={{
                    background: "none", border: `1px solid ${colors.border.default}`, borderRadius: radius.md,
                    padding: "3px 10px", cursor: "pointer",
                    color: colors.text.muted, fontSize: font.size.xs,
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
                  width: "100%", minHeight: 180, padding: 14, borderRadius: radius.xl,
                  background: colors.bg.input, border: `1px solid ${colors.brand.purple}`,
                  color: colors.text.primary, fontSize: font.size.base, lineHeight: font.lineHeight.relaxed,
                  resize: "vertical", outline: "none", fontFamily: "inherit",
                }}
                placeholder="Scrivi il tuo messaggio personalizzato..."
              />
            ) : (
              <div style={{
                background: colors.bg.input, borderRadius: radius.xl, padding: 14,
                border: `1px solid ${colors.border.default}`, fontSize: font.size.base, color: colors.text.secondary,
                lineHeight: font.lineHeight.relaxed, whiteSpace: "pre-wrap", maxHeight: 220,
                overflowY: "auto",
              }}>
                {currentMessage}
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!user.phone || !currentMessage.trim()}
            style={{
              width: "100%", padding: "12px 20px", borderRadius: radius.xl,
              background: !user.phone || !currentMessage.trim() ? colors.bg.elevated : colors.whatsapp,
              border: "none", cursor: !user.phone || !currentMessage.trim() ? "default" : "pointer",
              color: colors.text.inverse, fontSize: font.size.md, fontWeight: font.weight.bold,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <Send size={16} /> Invia su WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- User Row ----
function UserRow({ user, isRetarget, brand, eventDate, eventLink, userStats, onOpenRetargetModal }) {
  const segment = useMemo(() => {
    if (!userStats) return null;
    const match = userStats.find(s =>
      (s.email && user.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
      (s.name && user.fullName && s.name.toLowerCase() === user.fullName.toLowerCase())
    );
    return match?.segment || null;
  }, [user, userStats]);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 12px", borderBottom: `1px solid ${colors.border.subtle}`,
      transition: tr.fast,
    }}
      onMouseEnter={e => { e.currentTarget.style.background = colors.bg.elevated; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.fullName}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            {user.phone && (
              <span style={{ fontSize: font.size.xs, color: colors.text.disabled, display: "flex", alignItems: "center", gap: 3 }}>
                <Phone size={10} /> {user.phone}
              </span>
            )}
            {isRetarget && user.pastEditionCount && (
              <span style={{ fontSize: font.size.xs, color: colors.text.muted, background: colors.bg.page, padding: "1px 6px", borderRadius: radius.sm }}>
                {user.pastEditionCount} ediz. passate
              </span>
            )}
          </div>
        </div>
        {segment && <SegmentBadge segment={segment} />}
      </div>

      {/* WhatsApp button */}
      {user.phone && (
        isRetarget ? (
          <button
            onClick={() => onOpenRetargetModal(user)}
            style={{
              background: colors.whatsapp, color: colors.text.inverse, borderRadius: radius.lg, padding: "5px 12px",
              fontSize: font.size.xs, fontWeight: font.weight.semibold, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 8,
            }}
          >
            <MessageCircle size={13} /> Invita
          </button>
        ) : (
          <a
            href={formatWhatsAppUrl(user.phone)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: colors.whatsapp, color: colors.text.inverse, borderRadius: radius.lg, padding: "5px 12px",
              fontSize: font.size.xs, fontWeight: font.weight.semibold, textDecoration: "none", border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 8,
            }}
          >
            <MessageCircle size={13} /> WhatsApp
          </a>
        )
      )}
    </div>
  );
}

// ---- Collapsible Section ----
function CollapsibleSection({ title, count, withPhoneCount, children, defaultOpen, accentColor }) {
  const [isOpen, setIsOpen] = useState(defaultOpen || false);

  return (
    <div style={{
      background: colors.bg.card, borderRadius: radius["2xl"], border: `1px solid ${colors.border.default}`,
      overflow: "hidden",
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%", padding: "12px 16px",
          background: isOpen ? "rgba(139,92,246,0.05)" : "transparent",
          border: "none", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text.primary }}>{title}</span>
          <span style={{
            fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.inverse,
            background: accentColor || colors.brand.purple, borderRadius: radius.xl, padding: "2px 10px",
          }}>
            {count}
          </span>
          {withPhoneCount !== undefined && withPhoneCount < count && (
            <span style={{ fontSize: font.size.xs, color: colors.text.disabled }}>
              ({withPhoneCount} con telefono)
            </span>
          )}
        </div>
        <ChevronDown size={18} color={colors.text.disabled} style={{
          transform: isOpen ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }} />
      </button>

      {isOpen && (
        <div style={{ borderTop: `1px solid ${colors.border.default}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ---- Collapsible Edition Group (for "Per edizione" mode) ----
function EditionGroup({ edLabel, users, brand, eventDate, eventLink, userStats, onOpenRetargetModal }) {
  const [open, setOpen] = useState(false);
  const withPhone = users.filter(u => u.phone).length;

  return (
    <div style={{ borderBottom: `1px solid ${colors.border.default}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", padding: "10px 14px", background: colors.bg.page,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ChevronDown size={14} color={colors.text.disabled} style={{
            transform: open ? "rotate(180deg)" : "rotate(-90deg)",
            transition: "transform 0.2s",
          }} />
          <span style={{ fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text.primary }}>
            {edLabel}
          </span>
          {withPhone < users.length && (
            <span style={{ fontSize: font.size.xs, color: colors.text.disabled }}>
              ({withPhone} con tel.)
            </span>
          )}
        </div>
        <span style={{
          fontSize: font.size.xs, fontWeight: font.weight.bold, color: colors.text.inverse,
          background: colors.status.warning, borderRadius: radius.xl, padding: "1px 8px",
        }}>
          {users.length}
        </span>
      </button>
      {open && users.map((user, i) => (
        <UserRow
          key={i} user={user} isRetarget={true}
          brand={brand} eventDate={eventDate} eventLink={eventLink}
          userStats={userStats}
          onOpenRetargetModal={onOpenRetargetModal}
        />
      ))}
    </div>
  );
}

// ---- Main Component ----
export default function EditionUserLists({ registered, retarget, brand, edition, eventDate, eventLink, userStats }) {
  const [regSearch, setRegSearch] = useState('');
  const [retSearch, setRetSearch] = useState('');
  const [retargetModalUser, setRetargetModalUser] = useState(null);
  const [groupByEdition, setGroupByEdition] = useState(false);

  const filteredReg = useMemo(() => {
    if (!regSearch) return registered;
    const q = regSearch.toLowerCase();
    return registered.filter(u => u.fullName?.toLowerCase().includes(q));
  }, [registered, regSearch]);

  const filteredRet = useMemo(() => {
    if (!retSearch) return retarget;
    const q = retSearch.toLowerCase();
    return retarget.filter(u => u.fullName?.toLowerCase().includes(q));
  }, [retarget, retSearch]);

  // Group retarget users by their most recent past edition
  const retargetByEdition = useMemo(() => {
    if (!groupByEdition) return null;
    const groups = {};
    for (const user of filteredRet) {
      // Group by most recent edition (based on lastEventDate)
      // Each user has pastEditions array — pick the most recent one
      const edKey = user.pastEditions?.length === 1
        ? user.pastEditions[0]
        : (user.pastEditions || []).length > 0
          ? user.pastEditions[user.pastEditions.length - 1]
          : 'Sconosciuta';
      if (!groups[edKey]) groups[edKey] = [];
      groups[edKey].push(user);
    }
    // Sort editions by count descending
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredRet, groupByEdition]);

  const regWithPhone = registered.filter(u => u.phone).length;
  const retWithPhone = retarget.filter(u => u.phone).length;

  if (!registered.length && !retarget.length) return null;

  const searchInput = (value, onChange) => (
    <div style={{ padding: "8px 12px", borderBottom: `1px solid ${colors.border.default}` }}>
      <div style={{ position: "relative" }}>
        <Search size={14} color={colors.text.disabled} style={{ position: "absolute", left: 10, top: 8 }} />
        <input
          placeholder="Cerca nome..."
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%", padding: "6px 12px 6px 30px", borderRadius: radius.lg,
            background: colors.bg.input, border: `1px solid ${colors.border.default}`,
            color: colors.text.primary, fontSize: font.size.sm, outline: "none",
          }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Registered users */}
      <CollapsibleSection
        title="Registrati a questa edizione"
        count={registered.length}
        withPhoneCount={regWithPhone}
        defaultOpen={false}
        accentColor={colors.brand.purple}
      >
        {registered.length > 10 && searchInput(regSearch, setRegSearch)}
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {filteredReg.map((user, i) => (
            <UserRow
              key={i} user={user} isRetarget={false}
              brand={brand} eventDate={eventDate} eventLink={eventLink}
              userStats={userStats}
            />
          ))}
          {filteredReg.length === 0 && (
            <div style={{ padding: 16, textAlign: "center", fontSize: font.size.sm, color: colors.text.disabled }}>
              Nessun risultato
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Retarget users */}
      {retarget.length > 0 && (
        <CollapsibleSection
          title="Da ricontattare"
          count={retarget.length}
          withPhoneCount={retWithPhone}
          defaultOpen={false}
          accentColor={colors.status.warning}
        >
          {/* Toolbar: search + group toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${colors.border.default}` }}>
            {retarget.length > 10 && (
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={14} color={colors.text.disabled} style={{ position: "absolute", left: 10, top: 8 }} />
                <input
                  placeholder="Cerca nome..."
                  value={retSearch}
                  onChange={e => setRetSearch(e.target.value)}
                  style={{
                    width: "100%", padding: "6px 12px 6px 30px", borderRadius: radius.lg,
                    background: colors.bg.input, border: `1px solid ${colors.border.default}`,
                    color: colors.text.primary, fontSize: font.size.sm, outline: "none",
                  }}
                />
              </div>
            )}
            <button
              onClick={() => setGroupByEdition(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                borderRadius: radius.lg, fontSize: font.size.xs, fontWeight: font.weight.semibold,
                border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: groupByEdition ? colors.interactive.active : colors.interactive.inactive,
                color: groupByEdition ? colors.interactive.activeText : colors.interactive.inactiveText,
                transition: tr.normal,
              }}
            >
              <Layers size={12} /> Per edizione
            </button>
          </div>

          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {/* Flat list (default) */}
            {!groupByEdition && filteredRet.map((user, i) => (
              <UserRow
                key={i} user={user} isRetarget={true}
                brand={brand} eventDate={eventDate} eventLink={eventLink}
                userStats={userStats}
                onOpenRetargetModal={setRetargetModalUser}
              />
            ))}

            {/* Grouped by edition — collapsible sub-sections */}
            {groupByEdition && retargetByEdition && retargetByEdition.map(([edLabel, users]) => (
              <EditionGroup
                key={edLabel}
                edLabel={edLabel}
                users={users}
                brand={brand}
                eventDate={eventDate}
                eventLink={eventLink}
                userStats={userStats}
                onOpenRetargetModal={setRetargetModalUser}
              />
            ))}

            {filteredRet.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", fontSize: font.size.sm, color: colors.text.disabled }}>
                Nessun risultato
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Retarget modal */}
      {retargetModalUser && (
        <WhatsAppRetargetModal
          user={retargetModalUser}
          brand={brand}
          eventDate={eventDate}
          eventLink={eventLink}
          onClose={() => setRetargetModalUser(null)}
        />
      )}
    </div>
  );
}
