import { useState } from 'react';
import { Panel, UpcomingTable, TrackerView, VenueDot, Seg, Delta } from '../ui';
import { LineChart, BarList } from '../charts';
import { fmt, pct, dshort, hm, pctChange } from '../format';

export function Kpis({ kpis, birthdays }) {
  const cells = [
    [fmt(kpis.reg), 'registrazioni', 'tutti i dati caricati'],
    [fmt(kpis.ent), 'ingressi', 'scansioni alla porta'],
    [pct(kpis.conv), 'conversione', 'serate concluse con ingressi'],
    [fmt(kpis.nights), 'serate concluse', `${fmt(kpis.brands)} brand`],
    [fmt(kpis.people), 'persone', `${fmt(kpis.returned)} tornate 2+ volte`],
    [fmt(birthdays[0]?.count), 'compleanni oggi', `${fmt(birthdays.reduce((s, b) => s + b.count, 0))} nei prossimi 7 giorni`],
  ];
  return (
    <div className="nx-kpis">
      {cells.map(([v, l, d]) => <div key={l} className="nx-kpi"><div className="v">{v}</div><div className="l">{l}</div><div className="d">{d}</div></div>)}
    </div>
  );
}

const HOUR_LABEL = { 12: '12', 15: '15', 18: '18', 21: '21', 24: '00', 27: '03' };

function LiveNight({ ed, live }) {
  const [mode, setMode] = useState('reg');
  const k = mode === 'reg' ? ['reg', 'regMin', 'regMed', 'regMax'] : ['ent', 'entMin', 'entMed', 'entMax'];
  const n = live.now;
  return (
    <Panel span={8} title={`Stasera · ${ed.title}`} hint={`${ed.venue} · confronto con ${live.past} serate dello stesso brand alla stessa ora`}
      actions={<Seg value={mode} onChange={setMode} label="Grafico" options={[['reg', 'registrati'], ['ent', 'entrati']]} />}>
      <div className="nx-stats">
        <div className="nx-stat"><div className="v">{fmt(n.reg)}</div><div className="l">registrati · <Delta value={pctChange(n.reg, n.regAvg)} /> vs {fmt(n.regAvg)}</div></div>
        <div className="nx-stat"><div className="v">{fmt(n.ent)}</div><div className="l">entrati · <Delta value={pctChange(n.ent, n.entMed)} /> vs {fmt(n.entMed)}</div></div>
        <div className="nx-stat"><div className="v">{fmt(live.notIn)}</div><div className="l">registrati non entrati</div></div>
      </div>
      <LineChart
        xs={live.points.map((p) => p.h)}
        xLabel={(x) => HOUR_LABEL[x] || ''}
        band={live.points.map((p) => ({ x: p.h, min: p[k[1]], med: p[k[2]], max: p[k[3]] }))}
        series={[{ key: 'cur', label: mode === 'reg' ? 'registrati' : 'entrati', color: 'var(--nx-now)', width: 2.4, points: live.points.map((p) => ({ x: p.h, y: p[k[0]] })) }]}
        now={live.refHour} nowLabel={hm(live.reference)} yLabel="Serata in corso"
      />
      <p className="nx-note">Dati alle <b>{hm(live.reference)}</b>. La fascia è il minimo–massimo delle serate passate alla stessa ora, la linea tratteggiata la mediana.</p>
    </Panel>
  );
}

export default function Stasera({ ctx }) {
  const { kpis, birthdays, upcoming, tonight, live, eds, brandRows, goTo } = ctx;
  const next = upcoming[0];
  const lastNights = eds.filter((e) => e.over).slice(-8).reverse();
  const brandAvg = Object.fromEntries(brandRows.map((b) => [b.brand, b]));
  return (
    <div className="nx-grid">
      <Kpis kpis={kpis} birthdays={birthdays} />
      <Panel span={12} title="Prossimi eventi" hint="registrati ora contro le edizioni passate alla stessa distanza dall'evento">
        <UpcomingTable upcoming={upcoming} onSelect={(key) => goTo('eventi', key)} />
      </Panel>
      {tonight && live ? <LiveNight ed={tonight} live={live} /> : next ? (
        <Panel span={8} title={`Prossimo · ${next.ed.title}`} hint={`${dshort(next.ed.date)} · ${next.ed.venue}`}>
          <TrackerView item={next} onCompare={(key) => goTo('confronta', key)} />
        </Panel>
      ) : (
        <Panel span={8} title="Prossimo evento"><p className="nx-empty">Nessun evento in programma.</p></Panel>
      )}
      <Panel span={4} title="Compleanni" hint="prossimi 7 giorni">
        <BarList labelWidth={56} items={birthdays.map((b, i) => ({ label: i ? dshort(b.date).split(' ').slice(0, 2).join(' ') : 'oggi', value: b.count, dim: i > 0 }))} />
        <p className="nx-note">I messaggi di auguri si mandano dalla vista classica.</p>
      </Panel>
      <Panel span={12} title="Ultime serate" hint="confronto con la media del brand">
        <div className="nx-tw">
          <table>
            <thead><tr><th className="n">data</th><th>serata</th><th className="n">registrati</th><th className="n">ingressi</th><th className="n">conv.</th><th className="n">vs media brand</th></tr></thead>
            <tbody>
              {lastNights.map((e) => {
                const b = brandAvg[e.brand];
                return (
                  <tr key={e.key}>
                    <td className="n">{dshort(e.date)}</td>
                    <td className="nx-name"><VenueDot venue={e.venue} /> {e.title}<span className="nx-subline">{e.venue}</span></td>
                    <td className="n">{fmt(e.reg)}</td>
                    <td className="n">{e.hasScans ? fmt(e.ent) : <span className="nx-flat">n.d.</span>}</td>
                    <td className="n">{pct(e.conv)}</td>
                    <td className="n">{b && b.editions > 1 ? <Delta value={pctChange(e.reg, b.avgReg)} /> : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
