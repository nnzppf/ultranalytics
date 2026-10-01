/**
 * Lightweight SVG charts for the new interface. Colors come from CSS variables
 * (nuova.css), so they follow the light/dark theme.
 */
import { useState } from 'react';
import { fmt, deltaClass, signed, pctChange } from './format';

const niceTop = (v) => {
  const s = Math.pow(10, Math.floor(Math.log10(Math.max(1, v))));
  return Math.ceil(v / (s / 2)) * (s / 2);
};

function Grid({ top, W, h, L, R, T, B }) {
  const Y = (y) => T + (1 - y / top) * (h - T - B);
  return [0, top / 2, top].map((t) => (
    <g key={t}>
      <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="var(--nx-line)" />
      <text x={L - 6} y={Y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--nx-faint)" fontFamily="var(--nx-mono)">{fmt(t)}</text>
    </g>
  ));
}

/**
 * Lines over a shared x axis, with an optional band (min–max + median) and a
 * dashed projection segment. series: [{ key, color, width, label, dashed, points: [{x, y, min?, max?}] }]
 * Pointing (mouse or finger) at the chart shows every series at that x; with
 * `compare` each value also shows its difference from the first series.
 */
export function LineChart({ series, band, projection, xs, xLabel, xTitle, yFormat = (v) => fmt(v), compare = false, now, nowLabel, height = 200, width = 640, yLabel }) {
  const [hover, setHover] = useState(null);
  const W = width, h = height, L = 40, R = 12, T = 12, B = 22;
  const vals = [
    ...series.flatMap((s) => s.points.flatMap((p) => [p.y, p.max])),
    ...(band || []).flatMap((p) => [p.max, p.med]),
    projection ? projection.y1 : 0,
  ].filter((v) => v != null);
  const top = niceTop(Math.max(1, ...vals));
  const x0 = xs[0], x1 = xs[xs.length - 1];
  const X = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = (y) => T + (1 - y / top) * (h - T - B);
  const bandPts = (band || []).filter((p) => p.min != null);
  const pick = (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    let best = xs[0];
    for (const x of xs) if (Math.abs(X(x) - px) < Math.abs(X(best) - px)) best = x;
    setHover(best);
  };
  const rows = hover == null ? [] : series.map((s) => ({ s, p: s.points.find((p) => p.x === hover) })).filter((r) => r.p && r.p.y != null);
  const first = rows.length && rows[0].s === series[0] ? rows[0].p.y : null;
  const bandAt = hover == null ? null : bandPts.find((p) => p.x === hover);
  const left = hover == null ? 0 : (X(hover) / W) * 100;
  return (
    <div className="nx-chart">
      <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={yLabel || 'Grafico'}
        onPointerMove={pick} onPointerDown={pick} onPointerLeave={(ev) => { if (ev.pointerType === 'mouse') setHover(null); }}>
        <Grid top={top} W={W} h={h} L={L} R={R} T={T} B={B} />
        {xs.map((x) => {
          const lab = xLabel(x);
          if (!lab) return null;
          return <text key={x} x={X(x)} y={h - 6} textAnchor={x === x0 ? 'start' : x === x1 ? 'end' : 'middle'} fontSize="10" fill="var(--nx-faint)" fontFamily="var(--nx-mono)">{lab}</text>;
        })}
        {bandPts.length > 1 && (
          <>
            <polygon fill="var(--nx-band)" points={`${bandPts.map((p) => `${X(p.x)},${Y(p.max)}`).join(' ')} ${[...bandPts].reverse().map((p) => `${X(p.x)},${Y(p.min)}`).join(' ')}`} />
            <polyline fill="none" stroke="var(--nx-muted)" strokeWidth="1.2" strokeDasharray="3 3" points={bandPts.map((p) => `${X(p.x)},${Y(p.med)}`).join(' ')} />
          </>
        )}
        {now != null && (
          <g>
            <line x1={X(now)} x2={X(now)} y1={T} y2={h - B} stroke="var(--nx-now)" strokeDasharray="2 3" opacity=".8" />
            <text x={Math.min(X(now) + 4, W - R - 30)} y={T + 9} fontSize="10" fill="var(--nx-now)" fontFamily="var(--nx-mono)">{nowLabel}</text>
          </g>
        )}
        {projection && (
          <g>
            <line x1={X(projection.x0)} y1={Y(projection.y0)} x2={X(projection.x1)} y2={Y(projection.y1)} stroke="var(--nx-proj)" strokeWidth="1.8" strokeDasharray="5 3" />
            <circle cx={X(projection.x1)} cy={Y(projection.y1)} r="3" fill="var(--nx-proj)" />
          </g>
        )}
        {series.map((s) => {
          const pts = s.points.filter((p) => p.y != null);
          if (!pts.length) return null;
          const last = pts[pts.length - 1];
          const range = pts.filter((p) => p.min != null);
          return (
            <g key={s.key}>
              {range.length > 1 && <polygon fill={s.color} opacity=".12" points={`${range.map((p) => `${X(p.x)},${Y(p.max)}`).join(' ')} ${[...range].reverse().map((p) => `${X(p.x)},${Y(p.min)}`).join(' ')}`} />}
              {pts.length > 1 && <polyline fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeLinejoin="round" strokeDasharray={s.dashed ? '6 3' : undefined} points={pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} />}
              <circle cx={X(last.x)} cy={Y(last.y)} r={s.width > 2 ? 3.5 : 2.5} fill={s.color} />
            </g>
          );
        })}
        {hover != null && (
          <g pointerEvents="none">
            <line x1={X(hover)} x2={X(hover)} y1={T} y2={h - B} stroke="var(--nx-fg)" opacity=".35" />
            {rows.map(({ s, p }) => <circle key={s.key} cx={X(hover)} cy={Y(p.y)} r="3.5" fill={s.color} stroke="var(--nx-panel)" strokeWidth="1.5" />)}
          </g>
        )}
      </svg>
      {hover != null && (rows.length > 0 || bandAt) && (
        <div className="nx-tip" style={left > 55 ? { right: `${100 - left + 1}%` } : { left: `${left + 1}%` }}>
          <div className="nx-tip-h">{(xTitle || xLabel)(hover) || hover}</div>
          {rows.map(({ s, p }, i) => (
            <div key={s.key} className="nx-tip-r">
              <span className="nx-swatch" style={{ background: s.color }} />
              <span className="nx-tip-l">{s.label}</span>
              <b>{yFormat(p.y)}</b>
              <span className="nx-flat">{p.min != null ? `${yFormat(p.min)}–${yFormat(p.max)}` : ''}</span>
              {compare && i > 0 && first ? <span className={deltaClass(pctChange(p.y, first))}>{signed(pctChange(p.y, first))}</span> : <span />}
            </div>
          ))}
          {bandAt && (
            <div className="nx-tip-r">
              <span className="nx-swatch" style={{ background: 'var(--nx-muted)' }} />
              <span className="nx-tip-l">passate, mediana</span>
              <b>{yFormat(bandAt.med)}</b>
              <span className="nx-flat">{yFormat(bandAt.min)}–{yFormat(bandAt.max)}</span>
              <span />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Spark({ values, color, width = 90, height = 22 }) {
  if (!values.length) return null;
  if (values.length < 2) return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><circle cx={width - 3} cy={height / 2} r="2.5" fill={color} /></svg>;
  const max = Math.max(...values), min = Math.min(0, ...values);
  const X = (i) => 2 + (i / (values.length - 1)) * (width - 5);
  const Y = (v) => height - 2 - ((v - min) / (max - min || 1)) * (height - 4);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="1.4" points={values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} />
      <circle cx={X(values.length - 1)} cy={Y(values[values.length - 1])} r="2.2" fill={color} />
    </svg>
  );
}

/** Where the current count sits in the past editions' range at the same point. */
export function RangeBar({ range, current, width = 110 }) {
  const [min, med, max] = range;
  const top = Math.max(max, current, 1) * 1.05;
  const X = (v) => 2 + (v / top) * (width - 4);
  return (
    <svg width={width} height="14" viewBox={`0 0 ${width} 14`} role="img" aria-label={`Fascia ${min}–${max}, mediana ${med}, ora ${current}`}>
      <rect x={X(min)} y="4" width={Math.max(2, X(max) - X(min))} height="6" fill="var(--nx-band)" stroke="var(--nx-line)" />
      <line x1={X(med)} x2={X(med)} y1="2" y2="12" stroke="var(--nx-muted)" />
      <line x1={X(current)} x2={X(current)} y1="0" y2="14" stroke="var(--nx-now)" strokeWidth="2.5" />
    </svg>
  );
}

const NIGHT = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const hh = (h) => String(h).padStart(2, '0');

/** Registrations and entries by hour, on a noon-to-noon night axis. */
export function NightBars({ reg, ent, height = 190, width = 520 }) {
  const W = width, h = height, L = 40, R = 10, T = 10, B = 22;
  const top = niceTop(Math.max(...reg, ...ent, 1));
  const bw = (W - L - R) / 24;
  const X = (i) => L + i * bw, Y = (v) => T + (1 - v / top) * (h - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label="Registrazioni e ingressi per ora della notte">
      <Grid top={top} W={W} h={h} L={L} R={R} T={T} B={B} />
      {NIGHT.map((hr, i) => (
        <g key={hr}>
          <rect x={X(i) + 1} y={Y(reg[hr])} width={bw / 2 - 1} height={Y(0) - Y(reg[hr])} fill="var(--nx-now)" opacity=".85"><title>{`${hh(hr)}:00 · ${fmt(reg[hr])} registrazioni`}</title></rect>
          <rect x={X(i) + bw / 2} y={Y(ent[hr])} width={bw / 2 - 1} height={Y(0) - Y(ent[hr])} fill="var(--nx-proj)" opacity=".85"><title>{`${hh(hr)}:00 · ${fmt(ent[hr])} ingressi`}</title></rect>
          {i % 3 === 0 && <text x={X(i)} y={h - 6} fontSize="10" fill="var(--nx-faint)" fontFamily="var(--nx-mono)">{hh(hr)}</text>}
        </g>
      ))}
      <line x1={X(12)} x2={X(12)} y1={T} y2={h - B} stroke="var(--nx-faint)" strokeDasharray="2 3" />
      <text x={X(12) + 4} y={T + 9} fontSize="10" fill="var(--nx-faint)" fontFamily="var(--nx-mono)">mezzanotte</text>
    </svg>
  );
}

/** Every concluded night as a bar on a date axis, colored by venue. */
export function Timeline({ nights, from, to, metric, colorOf, height = 230 }) {
  const W = 1000, h = height, L = 40, R = 10, T = 12, B = 26;
  const t0 = from.getTime(), t1 = to.getTime();
  const val = (e) => (metric === 'reg' ? e.reg : e.hasScans ? e.ent : null);
  const shown = nights.filter((e) => e.date && e.date.getTime() >= t0 && e.date.getTime() <= t1);
  const top = niceTop(Math.max(1, ...shown.map((e) => val(e) || 0)));
  const X = (d) => L + ((d.getTime() - t0) / (t1 - t0)) * (W - L - R);
  const Y = (v) => T + (1 - v / top) * (h - T - B);
  const months = [];
  for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);
  return (
    <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label="Serate nel tempo" style={{ minWidth: 720 }}>
      <Grid top={top} W={W} h={h} L={L} R={R} T={T} B={B} />
      {months.map((d) => (
        <text key={d.getTime()} x={X(d)} y={h - 8} fontSize="10" fill="var(--nx-faint)" fontFamily="var(--nx-mono)">
          {d.toLocaleDateString('it', { month: 'short' })}{d.getMonth() === 0 ? ` ${String(d.getFullYear()).slice(2)}` : ''}
        </text>
      ))}
      {shown.map((e) => {
        const v = val(e), x = X(e.date);
        const label = `${e.title} · ${e.date.toLocaleDateString('it', { day: 'numeric', month: 'short' })}`;
        if (v == null) return <line key={e.key} x1={x} x2={x} y1={Y(0)} y2={Y(0) - 6} stroke={colorOf(e.venue)} strokeDasharray="2 2"><title>{`${label}: ingressi non disponibili`}</title></line>;
        return <rect key={e.key} x={x - 2.5} y={Y(v)} width="5" height={Y(0) - Y(v)} fill={colorOf(e.venue)}><title>{`${label}: ${fmt(v)} ${metric === 'reg' ? 'registrati' : 'ingressi'}`}</title></rect>;
      })}
    </svg>
  );
}

/** Registrations by weekday × hour (night axis). */
export function Heatmap({ grid }) {
  const days = [1, 2, 3, 4, 5, 6, 0];
  const names = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="nx-tw">
      <table className="nx-heat">
        <thead><tr><th />{NIGHT.map((h) => <th key={h}>{h % 3 === 0 ? hh(h) : ''}</th>)}</tr></thead>
        <tbody>
          {days.map((d) => (
            <tr key={d}>
              <td className="nx-heat-day">{names[d]}</td>
              {NIGHT.map((h) => {
                const v = grid[d][h];
                return <td key={h} title={`${names[d]} ${hh(h)}:00 · ${fmt(v)} registrazioni`} style={{ background: `rgba(var(--nx-heat), ${Math.max(0.04, Math.sqrt(v / max)).toFixed(3)})` }} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Horizontal bars with a label and a value. */
export function BarList({ items, color = 'var(--nx-now)', format = (v) => fmt(v), labelWidth = 80 }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="nx-barlist">
      {items.map((it) => (
        <div key={it.label} className="nx-barrow" style={{ gridTemplateColumns: `${labelWidth}px 1fr auto` }}>
          <span className={it.dim ? 'nx-dim' : undefined}>{it.label}</span>
          <span className="nx-barfill" style={{ width: `${Math.max(0.5, (it.value / max) * 100)}%`, background: it.color || color, opacity: it.dim ? 0.5 : 1 }} />
          <span className="nx-num">{format(it.value, it)}</span>
        </div>
      ))}
    </div>
  );
}
