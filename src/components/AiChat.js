import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Sparkles, Loader, Trash2 } from 'lucide-react';
import { askGemini, isGeminiConfigured } from '../services/geminiService';
import { buildDataSummary } from '../utils/dataSummarizer';
import { colors, font, radius, gradients, shadows, transition as tr, alpha } from '../config/designTokens';

const SUGGESTED_QUESTIONS = [
  "Qual è il giorno migliore per pubblicizzare un evento sui social?",
  "Qual è il brand con le migliori performance?",
  "Quale fascia d'età ha il tasso di conversione più alto?",
  "Quali utenti dovremmo ricontattare perché non vengono più?",
  "Confronta le performance tra genere commerciale ed elettronica",
  "Quali giorni della settimana funzionano meglio?",
];

export default function AiChat({ data, analytics, userStats }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const configured = isGeminiConfigured();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback(async (question) => {
    const q = question || input.trim();
    if (!q || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setIsLoading(true);

    try {
      const summary = buildDataSummary(data, analytics, userStats);
      const answer = await askGemini(q, summary);
      setMessages(prev => [...prev, { role: 'ai', text: answer }]);
    } catch (err) {
      const errMsg = err.message?.includes('API_KEY')
        ? 'API key non configurata. Aggiungi REACT_APP_GEMINI_API_KEY nel file .env e riavvia il server.'
        : `Errore: ${err.message}`;
      setMessages(prev => [...prev, { role: 'ai', text: errMsg, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, data, analytics, userStats]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render markdown-like formatting (bold, bullets, newlines)
  const formatMessage = (text) => {
    if (!text) return '';
    return text
      .split('\n')
      .map((line, i) => {
        // Bold
        let formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (formatted.startsWith('- ') || formatted.startsWith('* ')) {
          formatted = `<span style="color:${colors.brand.purple};margin-right:6px">•</span>${formatted.slice(2)}`;
          return `<div style="padding-left:12px;margin:2px 0" key="${i}">${formatted}</div>`;
        }
        // Headers
        if (formatted.startsWith('## ')) {
          return `<div style="font-weight:${font.weight.bold};color:${colors.text.secondary};margin-top:8px;margin-bottom:4px" key="${i}">${formatted.slice(3)}</div>`;
        }
        if (formatted.startsWith('# ')) {
          return `<div style="font-weight:${font.weight.bold};color:${colors.text.primary};font-size:${font.size.md}px;margin-top:8px;margin-bottom:4px" key="${i}">${formatted.slice(2)}</div>`;
        }
        return formatted ? `<div key="${i}">${formatted}</div>` : '<div style="height:8px"></div>';
      })
      .join('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9000,
          width: 56, height: 56, borderRadius: '50%',
          background: gradients.brandAlt,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: shadows.brand,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = shadows.brandHover; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = shadows.brand; }}
        title="Assistente AI"
      >
        <Sparkles size={24} color={colors.text.inverse} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9000,
      width: 420, height: 560, maxHeight: 'calc(100vh - 48px)',
      background: colors.bg.page, borderRadius: radius["4xl"],
      border: `1px solid ${colors.border.default}`,
      boxShadow: shadows.xl,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: gradients.brandAlt,
        padding: '14px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} color={colors.text.inverse} />
          <div>
            <div style={{ fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text.inverse }}>Assistente AI</div>
            <div style={{ fontSize: font.size.xs, color: alpha.white[70] }}>Powered by Gemini</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} style={{
              background: alpha.white[15], border: 'none', borderRadius: radius.lg,
              padding: 6, cursor: 'pointer', display: 'flex',
            }} title="Cancella conversazione">
              <Trash2 size={14} color={colors.text.inverse} />
            </button>
          )}
          <button onClick={() => setIsOpen(false)} style={{
            background: alpha.white[15], border: 'none', borderRadius: radius.lg,
            padding: 6, cursor: 'pointer', display: 'flex',
          }}>
            <X size={14} color={colors.text.inverse} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {!configured && (
          <div style={{
            background: alpha.error[10], border: `1px solid ${alpha.error[30]}`,
            borderRadius: radius.xl, padding: 14, fontSize: font.size.sm, color: colors.status.errorLight,
          }}>
            <strong>API key non configurata.</strong><br />
            Crea un file <code style={{ background: colors.bg.card, padding: '1px 4px', borderRadius: radius.sm }}>.env</code> nella root del progetto con:<br />
            <code style={{ background: colors.bg.card, padding: '2px 6px', borderRadius: radius.sm, display: 'inline-block', marginTop: 6 }}>
              REACT_APP_GEMINI_API_KEY=la_tua_key
            </code>
          </div>
        )}

        {messages.length === 0 && configured && (
          <>
            <div style={{
              textAlign: 'center', padding: '20px 0 10px', color: colors.text.disabled, fontSize: font.size.sm,
            }}>
              Chiedimi qualsiasi cosa sui dati del club
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  style={{
                    background: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl,
                    padding: '10px 14px', cursor: 'pointer',
                    color: colors.brand.lavender, fontSize: font.size.sm, textAlign: 'left',
                    transition: tr.normal,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = colors.bg.elevated; e.currentTarget.style.borderColor = colors.brand.purple; }}
                  onMouseLeave={e => { e.currentTarget.style.background = colors.bg.card; e.currentTarget.style.borderColor = colors.border.default; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? `${radius["3xl"]}px ${radius["3xl"]}px ${radius.sm}px ${radius["3xl"]}px` : `${radius["3xl"]}px ${radius["3xl"]}px ${radius["3xl"]}px ${radius.sm}px`,
              background: msg.role === 'user' ? colors.brand.violet : msg.isError ? alpha.error[15] : colors.bg.card,
              color: msg.role === 'user' ? colors.text.inverse : msg.isError ? colors.status.errorLight : colors.text.secondary,
              fontSize: font.size.base, lineHeight: font.lineHeight.normal,
              border: msg.role === 'ai' ? `1px solid ${colors.border.default}` : 'none',
            }}>
              {msg.role === 'user' ? (
                msg.text
              ) : (
                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: `${radius["3xl"]}px ${radius["3xl"]}px ${radius["3xl"]}px ${radius.sm}px`,
              background: colors.bg.card, border: `1px solid ${colors.border.default}`,
              display: 'flex', alignItems: 'center', gap: 8,
              color: colors.text.muted, fontSize: font.size.base,
            }}>
              <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Sto analizzando i dati...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', borderTop: `1px solid ${colors.border.default}`,
        display: 'flex', gap: 8, flexShrink: 0,
        background: colors.bg.page,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Chiedimi qualcosa sui dati..."
          disabled={!configured || isLoading}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: radius.xl,
            background: colors.bg.card, border: `1px solid ${colors.border.default}`,
            color: colors.text.primary, fontSize: font.size.base, outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading || !configured}
          style={{
            padding: '10px 14px', borderRadius: radius.xl,
            background: !input.trim() || isLoading ? colors.bg.elevated : gradients.brandAlt,
            border: 'none', cursor: !input.trim() || isLoading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.text.inverse,
          }}
        >
          <Send size={16} />
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
