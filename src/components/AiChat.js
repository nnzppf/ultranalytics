import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Sparkles, Loader, Trash2 } from 'lucide-react';
import { askGemini, isGeminiConfigured } from '../services/geminiService';
import { buildDataSummary } from '../utils/dataSummarizer';

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
          formatted = `<span style="color:#8b5cf6;margin-right:6px">•</span>${formatted.slice(2)}`;
          return `<div style="padding-left:12px;margin:2px 0" key="${i}">${formatted}</div>`;
        }
        // Headers
        if (formatted.startsWith('## ')) {
          return `<div style="font-weight:700;color:#e2e8f0;margin-top:8px;margin-bottom:4px" key="${i}">${formatted.slice(3)}</div>`;
        }
        if (formatted.startsWith('# ')) {
          return `<div style="font-weight:700;color:#f1f5f9;font-size:14px;margin-top:8px;margin-bottom:4px" key="${i}">${formatted.slice(2)}</div>`;
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
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(124,58,237,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)'; }}
        title="Assistente AI"
      >
        <Sparkles size={24} color="#fff" />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9000,
      width: 420, height: 560, maxHeight: 'calc(100vh - 48px)',
      background: '#0f172a', borderRadius: 16,
      border: '1px solid #334155',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
        padding: '14px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} color="#fff" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Assistente AI</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Powered by Gemini</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
              padding: 6, cursor: 'pointer', display: 'flex',
            }} title="Cancella conversazione">
              <Trash2 size={14} color="#fff" />
            </button>
          )}
          <button onClick={() => setIsOpen(false)} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
            padding: 6, cursor: 'pointer', display: 'flex',
          }}>
            <X size={14} color="#fff" />
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
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: 14, fontSize: 12, color: '#fca5a5',
          }}>
            <strong>API key non configurata.</strong><br />
            Crea un file <code style={{ background: '#1e293b', padding: '1px 4px', borderRadius: 4 }}>.env</code> nella root del progetto con:<br />
            <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 6 }}>
              REACT_APP_GEMINI_API_KEY=la_tua_key
            </code>
          </div>
        )}

        {messages.length === 0 && configured && (
          <>
            <div style={{
              textAlign: 'center', padding: '20px 0 10px', color: '#64748b', fontSize: 12,
            }}>
              Chiedimi qualsiasi cosa sui dati del club
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  style={{
                    background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    color: '#c4b5fd', fontSize: 12, textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = '#334155'; }}
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
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? '#7c3aed' : msg.isError ? 'rgba(239,68,68,0.15)' : '#1e293b',
              color: msg.role === 'user' ? '#fff' : msg.isError ? '#fca5a5' : '#e2e8f0',
              fontSize: 13, lineHeight: 1.5,
              border: msg.role === 'ai' ? '1px solid #334155' : 'none',
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
              padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
              background: '#1e293b', border: '1px solid #334155',
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#94a3b8', fontSize: 13,
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
        padding: '12px 16px', borderTop: '1px solid #334155',
        display: 'flex', gap: 8, flexShrink: 0,
        background: '#0f172a',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Chiedimi qualcosa sui dati..."
          disabled={!configured || isLoading}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            background: '#1e293b', border: '1px solid #334155',
            color: '#f1f5f9', fontSize: 13, outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading || !configured}
          style={{
            padding: '10px 14px', borderRadius: 10,
            background: !input.trim() || isLoading ? '#334155' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            border: 'none', cursor: !input.trim() || isLoading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Send size={16} />
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
