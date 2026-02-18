import { useState, useMemo } from 'react';
import { ChevronDown, MessageCircle, Phone, Search, X, Edit3, Send } from 'lucide-react';
import { SegmentBadge } from '../shared/Badge';
import { formatWhatsAppUrl, applyTemplate, RETARGET_TEMPLATES } from '../../utils/whatsapp';

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
                Invita {firstName} a {brand}
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

        <div style={{ padding: 20, maxHeight: "70vh", overflowY: "auto" }}>
          {/* Template selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
              Scegli messaggio
            </div>
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

            {showTemplateList && (
              <div style={{
                marginTop: 4, borderRadius: 10, overflow: "hidden",
                border: "1px solid #334155", background: "#0f172a",
              }}>
                {RETARGET_TEMPLATES.map(tpl => (
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
      padding: "8px 12px", borderBottom: "1px solid #1e293b",
      transition: "background 0.1s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "#334155"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.fullName}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            {user.phone && (
              <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
                <Phone size={10} /> {user.phone}
              </span>
            )}
            {isRetarget && user.pastEditionCount && (
              <span style={{ fontSize: 10, color: "#94a3b8", background: "#0f172a", padding: "1px 6px", borderRadius: 4 }}>
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
              background: "#25d366", color: "#fff", borderRadius: 8, padding: "5px 12px",
              fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
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
              background: "#25d366", color: "#fff", borderRadius: 8, padding: "5px 12px",
              fontSize: 11, fontWeight: 600, textDecoration: "none", border: "none", cursor: "pointer",
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
      background: "#1e293b", borderRadius: 12, border: "1px solid #334155",
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
          <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{title}</span>
          <span style={{
            fontSize: 12, fontWeight: 700, color: "#fff",
            background: accentColor || "#8b5cf6", borderRadius: 10, padding: "2px 10px",
          }}>
            {count}
          </span>
          {withPhoneCount !== undefined && withPhoneCount < count && (
            <span style={{ fontSize: 11, color: "#64748b" }}>
              ({withPhoneCount} con telefono)
            </span>
          )}
        </div>
        <ChevronDown size={18} color="#64748b" style={{
          transform: isOpen ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }} />
      </button>

      {isOpen && (
        <div style={{ borderTop: "1px solid #334155" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ---- Main Component ----
export default function EditionUserLists({ registered, retarget, brand, edition, eventDate, eventLink, userStats }) {
  const [regSearch, setRegSearch] = useState('');
  const [retSearch, setRetSearch] = useState('');
  const [retargetModalUser, setRetargetModalUser] = useState(null);

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

  const regWithPhone = registered.filter(u => u.phone).length;
  const retWithPhone = retarget.filter(u => u.phone).length;

  if (!registered.length && !retarget.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Registered users */}
      <CollapsibleSection
        title="Registrati a questa edizione"
        count={registered.length}
        withPhoneCount={regWithPhone}
        defaultOpen={false}
        accentColor="#8b5cf6"
      >
        {registered.length > 10 && (
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #334155" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} color="#64748b" style={{ position: "absolute", left: 10, top: 8 }} />
              <input
                placeholder="Cerca nome..."
                value={regSearch}
                onChange={e => setRegSearch(e.target.value)}
                style={{
                  width: "100%", padding: "6px 12px 6px 30px", borderRadius: 8,
                  background: "#0f172a", border: "1px solid #334155",
                  color: "#f1f5f9", fontSize: 12, outline: "none",
                }}
              />
            </div>
          </div>
        )}
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {filteredReg.map((user, i) => (
            <UserRow
              key={i} user={user} isRetarget={false}
              brand={brand} eventDate={eventDate} eventLink={eventLink}
              userStats={userStats}
            />
          ))}
          {filteredReg.length === 0 && (
            <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#64748b" }}>
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
          accentColor="#f59e0b"
        >
          {retarget.length > 10 && (
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #334155" }}>
              <div style={{ position: "relative" }}>
                <Search size={14} color="#64748b" style={{ position: "absolute", left: 10, top: 8 }} />
                <input
                  placeholder="Cerca nome..."
                  value={retSearch}
                  onChange={e => setRetSearch(e.target.value)}
                  style={{
                    width: "100%", padding: "6px 12px 6px 30px", borderRadius: 8,
                    background: "#0f172a", border: "1px solid #334155",
                    color: "#f1f5f9", fontSize: 12, outline: "none",
                  }}
                />
              </div>
            </div>
          )}
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {filteredRet.map((user, i) => (
              <UserRow
                key={i} user={user} isRetarget={true}
                brand={brand} eventDate={eventDate} eventLink={eventLink}
                userStats={userStats}
                onOpenRetargetModal={setRetargetModalUser}
              />
            ))}
            {filteredRet.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#64748b" }}>
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
