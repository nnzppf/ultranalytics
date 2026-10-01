import { venueKey } from './model';
import { fmt, pct, dshort, signed, deltaClass, pctChange } from './format';
import { LineChart, RangeBar } from './charts';

export const venueColor = (v) => `var(--nx-v-${venueKey(v)})`;
export const compareColor = (i) => `var(--nx-c${(i % 8) + 1})`;

export function VenueDot({ venue }) {
  return <span className="nx-dot" style={{ background: venueColor(venue) }} aria-hidden="true" />;
}

export function Panel({ span = 12, title, hint, actions, children }) {
  return (
    <section className={`nx-panel nx-s${span}`}>
      <div className="nx-ph">
        <h2>{title}</h2>
        {hint && <span className="nx-hint">{hint}</span>}
        {actions && <><span className="nx-spacer" />{actions}</>}
      </div>
      <div className="nx-pb">{children}</div>
    </section>
  );
}

export function Seg({ value, options, onChange, label }) {
  return (
    <div className="nx-seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

export function Delta({ value }) {
  return <span className={deltaClass(value)}>{signed(value)}</span>;
}

/** Upcoming nights: registered now against past editions at the same distance. */
export function UpcomingTable({ upcoming, selectedKey, onSelect }) {
  if (!upcoming.length) return <p className="nx-empty">Nessun evento in programma nei prossimi 45 giorni.</p>;
  return (
    <>
      <div className="nx-tw">
        <table>
          <thead>
            <tr>
              <th className="n">data</th><th>evento</th><th className="n">mancano</th><th className="n">registrati</th>
              <th className="n">media stesso punto</th><th className="n">Δ</th><th>fascia passate · ora</th><th className="n">proiezione</th><th className="n">da ricontattare</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map(({ ed, tracker: t, range, retarget }) => {
              const compared = t.comparisons.length;
              return (
                <tr key={ed.key} className={`nx-click ${selectedKey === ed.key ? 'nx-sel' : ''}`} onClick={() => onSelect(ed.key)}>
                  <td className="n">{dshort(ed.date)}</td>
                  <td className="nx-name"><VenueDot venue={ed.venue} /> {ed.title}<span className="nx-subline">{ed.venue}</span></td>
                  <td className="n">{t.currentDaysBefore} g</td>
                  <td className="n"><b>{fmt(t.currentRegistrations)}</b></td>
                  <td className="n">{compared ? fmt(t.avgAtSamePoint) : '–'}</td>
                  <td className="n">{compared && t.avgAtSamePoint ? <Delta value={pctChange(t.currentRegistrations, t.avgAtSamePoint)} /> : '–'}</td>
                  <td>{range && range[2] > 0
                    ? <RangeBar range={range} current={t.currentRegistrations} />
                    : <span className="nx-tag">{compared ? 'a zero allo stesso punto' : 'prima edizione'}</span>}</td>
                  <td className="n">{t.projection
                    ? <><b style={{ color: 'var(--nx-proj)' }}>~{fmt(t.projection.value)}</b> <span className="nx-flat">{fmt(t.projection.low)}–{fmt(t.projection.high)}</span></>
                    : '–'}</td>
                  <td className="n">{retarget ? fmt(retarget) : '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="nx-legend">
        <span><i style={{ background: 'var(--nx-band)', height: 8 }} />fascia min–max delle edizioni passate</span>
        <span><i style={{ background: 'var(--nx-muted)', width: 2, height: 10 }} />mediana</span>
        <span><i style={{ background: 'var(--nx-now)', width: 3, height: 12 }} />ora</span>
        <span>Tocca una riga per il tracker</span>
      </div>
    </>
  );
}

/** Tracker of one upcoming night: numbers + cumulative curve against past editions. */
export function TrackerView({ item, onCompare }) {
  if (!item) return null;
  const { ed, tracker: t, band, retarget } = item;
  const compared = t.comparisons.length;
  const delta = compared && t.avgAtSamePoint ? pctChange(t.currentRegistrations, t.avgAtSamePoint) : null;
  const maxD = band.length - 1;
  const xs = Array.from({ length: maxD + 1 }, (_, i) => i - maxD);
  const prev = [...t.comparisons].sort((a, b) => b.eventDate - a.eventDate)[0];
  return (
    <>
      <div className="nx-stats">
        <div className="nx-stat"><div className="v">{fmt(t.currentRegistrations)}</div><div className="l">registrati a {t.pointDaysBefore} giorni</div></div>
        <div className="nx-stat"><div className="v">{compared ? fmt(t.avgAtSamePoint) : '–'}</div><div className="l">media allo stesso punto{compared ? ` · ${compared} ed.` : ''}</div></div>
        <div className="nx-stat"><div className="v">{delta != null ? <Delta value={delta} /> : '–'}</div><div className="l">rispetto alla media</div></div>
        <div className="nx-stat"><div className="v" style={{ color: 'var(--nx-proj)' }}>{t.projection ? `~${fmt(t.projection.value)}` : '–'}</div>
          <div className="l">{t.projection ? `proiezione · ${fmt(t.projection.low)}–${fmt(t.projection.high)}${t.projection.reliable ? '' : ' · incerta'}` : compared ? 'presto per stimare' : 'nessuna edizione da confrontare'}</div></div>
      </div>
      <LineChart
        xs={xs}
        xLabel={(x) => (x === 0 ? 'evento' : x % 7 === 0 ? `${x} g` : '')}
        band={compared ? band.map((p) => ({ x: p.d === 0 ? 0 : -p.d, min: p.min, med: p.med, max: p.max })) : null}
        series={[{ key: 'cur', label: 'questa edizione', color: 'var(--nx-now)', width: 2.4, points: band.map((p) => ({ x: p.d === 0 ? 0 : -p.d, y: p.cur })) }]}
        projection={t.projection ? { x0: -t.pointDaysBefore, y0: t.currentRegistrations, x1: 0, y1: t.projection.value } : null}
        now={-t.pointDaysBefore}
        nowLabel="dati"
        yLabel="Registrazioni cumulative"
      />
      <div className="nx-legend">
        <span><i style={{ background: 'var(--nx-now)' }} />questa edizione</span>
        {compared > 0 && <><span><i style={{ background: 'var(--nx-band)', height: 8 }} />edizioni passate (min–max)</span><span><i style={{ borderTop: '1.5px dashed var(--nx-muted)', height: 0 }} />mediana</span></>}
        {t.projection && <span><i style={{ borderTop: '2px dashed var(--nx-proj)', height: 0 }} />proiezione</span>}
      </div>
      <p className="nx-note">
        {prev && <>Edizione precedente ({dshort(prev.eventDate)}): <b>{fmt(prev.atSamePointAdjusted)}</b> a questo punto, <b>{fmt(prev.totalFinal)}</b> a fine serata, conversione {pct(prev.finalConversion)}. </>}
        {retarget > 0 && <><b>{fmt(retarget)}</b> persone già venute non sono ancora registrate. </>}
        {onCompare && <button className="nx-link" onClick={() => onCompare(ed.key)}>Apri nel confronto con le edizioni passate</button>}
      </p>
    </>
  );
}
