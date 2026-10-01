import { useState, useMemo } from 'react';
import { Panel, VenueDot, venueColor, Delta } from '../ui';
import { Spark } from '../charts';
import { groupTable, promoterTable } from '../model';
import { ACCURACY_POINTS } from '../compare';
import { fmt, pct, dshort, dmy } from '../format';

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

/** How far the tracker's projection was from the final count on past nights. */
function Accuracy({ accuracy }) {
  if (!accuracy || !accuracy.overall.some((p) => p.n)) return null;
  const at7 = (g) => g.points.find((p) => p.d === 7);
  const groups = accuracy.groups.filter((g) => at7(g)?.n >= 3).sort((a, b) => at7(a).typical - at7(b).typical);
  const bias = (b) => (b == null ? '–' : b > 2 ? `sovrastima del ${b}%` : b < -2 ? `sottostima del ${-b}%` : 'in equilibrio');
  return (
    <Panel span={12} title="Quanto ci azzecca la proiezione" hint="rifatta sulle serate passate con i soli dati che c'erano allora">
      <div className="nx-tw">
        <table>
          <thead><tr><th>giorni prima dell'evento</th><th className="n">serate</th><th className="n">errore tipico</th><th className="n">entro ±20%</th><th>tendenza</th></tr></thead>
          <tbody>
            {accuracy.overall.map((p) => (
              <tr key={p.d}>
                <td>{p.d} {p.d === 1 ? 'giorno' : 'giorni'}</td>
                <td className="n">{fmt(p.n)}</td>
                <td className="n"><b>{p.typical == null ? '–' : `±${p.typical}%`}</b></td>
                <td className="n">{p.within20 == null ? '–' : `${p.within20}%`}</td>
                <td className="nx-flat">{bias(p.bias)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {groups.length > 0 && (
        <div className="nx-tw" style={{ marginTop: 10 }}>
          <table>
            <thead><tr><th>brand o serie</th>{ACCURACY_POINTS.map((d) => <th key={d} className="n">{d} g prima</th>)}</tr></thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.group}>
                  <td className="nx-name">{g.group}</td>
                  {g.points.map((p) => <td key={p.d} className="n">{p.n ? `±${p.typical}%` : '–'}<span className="nx-subline">{p.n ? `${p.n} serate` : ''}</span></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="nx-note">Errore tipico: metà delle serate finisce entro questo scarto dalla stima fatta quei giorni prima (a fine giornata). Più ci si avvicina alla serata, più la stima è precisa. Brand e serie con almeno 3 serate stimabili.</p>
    </Panel>
  );
}

export default function Tabelle({ ctx }) {
  const { eds, brandRows, accuracy, records } = ctx;
  const promoters = useMemo(() => promoterTable(records, eds), [records, eds]);
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
      <Accuracy accuracy={accuracy} />
      {promoters.tagged > 0 && (
        <Panel span={12} title="Per promoter" hint={`link promoter sul ${fmt(promoters.share, 1)}% delle registrazioni`}>
          <div className="nx-tw">
            <table>
              <thead><tr><th>promoter</th><th className="n">registrati</th><th className="n">serate</th><th className="n">conv.</th><th className="n">ultima serata</th></tr></thead>
              <tbody>
                {promoters.rows.map((r) => (
                  <tr key={r.name}>
                    <td className="nx-name">{r.name}</td>
                    <td className="n"><b>{fmt(r.reg)}</b></td>
                    <td className="n">{fmt(r.nights)}</td>
                    <td className="n">{pct(r.conv)}</td>
                    <td className="n">{dmy(r.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nx-note">Conta solo chi si registra dal link del promoter. Oggi è una piccola parte delle registrazioni: il confronto tra promoter diventa utile se i link PR si usano di più.</p>
        </Panel>
      )}
    </div>
  );
}
