import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { colors, font, radius, shadows, glass, transition as tr } from '../../config/designTokens';

export default function Dropdown({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder || 'Seleziona';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: radius.lg,
          background: open ? colors.interactive.active : colors.bg.elevated,
          border: `1px solid ${open ? colors.interactive.active : colors.border.strong}`,
          color: open ? colors.interactive.activeText : colors.text.primary,
          fontSize: font.size.xs, cursor: 'pointer',
          transition: tr.normal, whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedLabel}</span>
        <ChevronDown size={12} style={{
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          flexShrink: 0,
        }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          minWidth: 200, maxHeight: 280, overflowY: 'auto',
          background: colors.bg.solid,
          border: `1px solid ${colors.border.default}`,
          borderRadius: radius.xl,
          boxShadow: shadows.lg,
          ...glass.heavy,
          zIndex: 100,
          padding: '4px',
        }}>
          {options.map(opt => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 12px', borderRadius: radius.md,
                  border: 'none', cursor: 'pointer',
                  background: isActive ? colors.interactive.active : 'transparent',
                  color: isActive ? colors.interactive.activeText : colors.text.primary,
                  fontSize: font.size.xs,
                  fontWeight: isActive ? font.weight.semibold : font.weight.normal,
                  transition: tr.fast,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = colors.bg.hover; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
                {opt.count != null && (
                  <span style={{ color: isActive ? 'rgba(255,255,255,0.7)' : colors.text.disabled, marginLeft: 6 }}>
                    ({opt.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
