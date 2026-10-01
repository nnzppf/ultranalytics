import { useState, useMemo } from 'react';
import { Panel, VenueDot, venueColor, Delta } from '../ui';
import { Spark } from '../charts';
import { groupTable } from '../model';
import { fmt, pct, dshort } from '../format';

const SORTS = {
  reach: (r) => r.editions * r.avgReg,
  brand: (r) => r.brand.toLowerCase(),
  editions: (r) => r.editions,
  avgReg: (r) => r.avgReg,
  conv: (r) => r.conv ?? -1,
  last: (r) => r.last ?? -1,
  trend: (r) => r.trend ?? -999,
};

function GroupTable({ rows, label, withDot }) {
  const max = Math.max(1, ...rows.map((r) => r.avgReg));
  return (
    <div className="nx-tw">
      <table>
        <thead><tr><th>{label}</th><th className="n">brand</th><th className="n">serate</th><th className="n">media reg./serata</th><th /><th className="n">conv.</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="nx-name">{withDot && <VenueDot venue={r.key} />} {r.key}</td>
              <td className="n">{r.brands}</td>
              <td className="n">{r.editions}</td>
              <td className="n"><b>{fmt(r.avgReg)}</b></td>
              <td style={{ width: '30%' }}><span className="nx-barfill" style={{ width: `${(100 * r.avgReg) / max}%`, background: withDot ? venueColor(r.key) : 'var(--nx-muted)', opacity: withDot ? 1 : 0.55 }} /></td>
              <td className="n">{pct(r.conv)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Tabelle({ ctx }) {
  const { eds, brandRows } = ctx;
  const [sort, setSort] = useState('reach');
  const [dir, setDir] = useState(-1);
  const genres = useMemo(() => groupTable(eds, (e) => (e.genres?.length ? e.genres : ['non classificato'])).sort((a, b) => b.avgReg - a.avgReg), [eds]);
  const venues = useMemo(() => groupTable(eds, (e) => [e.venue || 'non indicato']).sort((a, b) => b.total - a.total), [eds]);
  const rows = useMemo(() => [...brandRows].filter((r) => r.editions > 0)
    .sort((a, b) => { const x = SORTS[sort](a), y = SORTS[sort](b); return (x > y ? 1 : x < y ? -1 : 0) * dir; }), [brandRows, sort, dir]);
  const th = (key, label, n = true) => (
    <th className={n ? 'n' : undefined}>
      <button data-active={sort === key} onClick={() => { if (sort === key) setDir(-dir); else { setSort(key); setDir(key === 'brand' ? 1 : -1); } }}>
        {label}{sort === key ? (dir < 0 ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  );
  return (
    <div className="nx-grid">
      <Panel span={6} title="Per genere" hint="media per serata: confrontabile tra generi">
        <GroupTable rows={genres} label="genere" />
        <p className="nx-note">Una serata con più generi conta in ognuno.</p>
      </Panel>
      <Panel span={6} title="Per locale">
        <GroupTable rows={venues} label="locale" withDot />
      </Panel>
      <Panel span={12} title="Per brand" hint="solo serate concluse · tocca le intestazioni per ordinare">
        <div className="nx-tw">
          <table>
            <thead><tr>{th('brand', 'brand', false)}<th>genere</th>{th('editions', 'serate')}{th('avgReg', 'media reg.')}{th('conv', 'conv.')}{th('last', 'ultima')}{th('trend', 'ultime 3 vs prec.')}<th>andamento per serata</th><th className="n">prossima</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.brand}>
                  <td className="nx-name" title={r.brand}><VenueDot venue={r.venue} /> {r.brand}<span className="nx-subline">{r.venue}{r.category === 'young' ? ' · young' : ''}</span></td>
                  <td className="nx-flat">{r.genres?.join(', ') || '–'}</td>
                  <td className="n">{r.editions}</td>
                  <td className="n"><b>{fmt(r.avgReg)}</b></td>
                  <td className="n">{pct(r.conv)}</td>
                  <td className="n">{fmt(r.last)}</td>
                  <td className="n">{r.trend != null ? <Delta value={r.trend} /> : <span className="nx-flat">–</span>}</td>
                  <td><Spark values={r.series} color={venueColor(r.venue)} /></td>
                  <td className="n">{r.next ? dshort(r.next) : <span className="nx-flat">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nx-note">"Ultime 3 vs prec." quando ci sono almeno 6 serate concluse.</p>
      </Panel>
    </div>
  );
}
