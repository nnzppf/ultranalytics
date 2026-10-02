import { venueKey } from './model';
import { useState } from 'react';
import { fmt, pct, dshort, dmy, hm, signed, deltaClass, pctChange } from './format';
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

/** How many days before the event the curves show. */
export const WINDOWS = [[14, '14 g'], [30, '30 g'], [60, '60 g']];
export function WindowSeg({ value, onChange }) {
  return <Seg value={value} onChange={onChange} label="Giorni prima dell'evento" options={WINDOWS} />;
}
export const daysAxis = (windowDays) => Array.from({ length: windowDays + 1 }, (_, i) => i - windowDays);
export const dayTick = (windowDays) => (x) => {
  if (x === 0) return 'evento';
  return x % (windowDays > 30 ? 14 : 7) === 0 ? `${x} g` : '';
};

/** "128–338", or "su 1 serata" when a single night gives no range. */
export const projRange = (p) => (p.low === p.high ? `su ${p.basedOn} ${p.basedOn === 1 ? 'serata' : 'serate'}` : `${fmt(p.low)}–${fmt(p.high)}`);

export function Delta({ value }) {
  return <span className={deltaClass(value)}>{signed(value)}</span>;
}

/** Upcoming nights: registered now against past editions at the same distance. */
export function UpcomingTable({ upcoming, selectedKey, onSelect }) {
  if (!upcoming.length) return <p className="nx-empty">Nessun evento in programma nei prossimi 60 giorni.</p>;
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
            {upcoming.map(({ ed, series, manual, tracker: t, range, retarget, likely }) => {
              const compared = t.comparisons.length;
              return (
                <tr key={ed.key} className={`nx-click ${selectedKey === ed.key ? 'nx-sel' : ''}`} onClick={() => onSelect(ed.key)}>
                  <td className="n">{dshort(ed.date)}</td>
                  <td className="nx-name"><VenueDot venue={ed.venue} /> {ed.title}<span className="nx-subline">{ed.venue}{series && <> · serie <b>{series}</b></>}</span></td>
                  <td className="n">{t.currentDaysBefore} g</td>
                  <td className="n"><b>{fmt(t.currentRegistrations)}</b>{manual && <span className="nx-flat" title="inserito a mano dal portale"> ✎</span>}</td>
                  <td className="n">{compared ? fmt(t.avgAtSamePoint) : '–'}</td>
                  <td className="n">{compared && t.avgAtSamePoint ? <Delta value={pctChange(t.currentRegistrations, t.avgAtSamePoint)} /> : '–'}</td>
                  <td>{range && range[2] > 0
                    ? <RangeBar range={range} current={t.currentRegistrations} />
                    : <span className="nx-tag">{compared ? 'a zero allo stesso punto' : series ? 'prima della serie' : 'prima edizione'}</span>}</td>
                  <td className="n">{t.projection
                    ? <><b style={{ color: 'var(--nx-proj)' }}>~{fmt(t.projection.value)}</b> <span className="nx-flat">{likely ? `${fmt(likely.low)}–${fmt(likely.high)}` : projRange(t.projection)}</span></>
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

const NOTE_TAGS = ['pioggia', 'ponte o festivo', 'ospite', 'serata concorrente', 'prezzo', 'esami', 'evento in città'];

/** A night's note (why it went the way it went): shown as text, edited in place, saved online. */
export function NoteEditor({ note, onSave, compact = false }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (value) => {
    setSaving(true);
    await onSave(value);
    setSaving(false);
    setEditing(false);
  };
  if (!editing) {
    return (
      <span className="nx-noteline">
        {note && <span className="nx-notetext" title={[note.by, note.at && dmy(new Date(note.at))].filter(Boolean).join(' · ')}>✎ {note.text}</span>}
        {onSave && <button className="nx-link" onClick={() => { setText(note?.text || ''); setEditing(true); }}>{note ? 'modifica' : compact ? '+ nota' : 'aggiungi una nota'}</button>}
      </span>
    );
  }
  return (
    <form className="nx-noteform" onSubmit={(e) => { e.preventDefault(); save(text); }}>
      <input className="nx-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={140} autoFocus
        aria-label="Nota sulla serata" placeholder="es. pioggia, ospite, serata concorrente in zona" />
      <span className="nx-tagpick">
        {NOTE_TAGS.map((t) => <button type="button" key={t} onClick={() => setText((x) => (x.trim() ? `${x.trim()}, ${t}` : t))}>{t}</button>)}
      </span>
      <span className="nx-formacts">
        <button className="nx-btn primary" type="submit" disabled={saving}>{saving ? 'Salvo…' : 'Salva'}</button>
        {note && <button className="nx-link" type="button" disabled={saving} onClick={() => save('')}>elimina nota</button>}
        <button className="nx-link" type="button" onClick={() => setEditing(false)}>annulla</button>
      </span>
    </form>
  );
}

/** The count read on the ticketing portal, when it is ahead of the last export. */
function CountEditor({ item, onSave }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const m = item.manual;
  const save = async (v) => {
    setSaving(true);
    await onSave(item.ed, v);
    setSaving(false);
    setOpen(false);
  };
  if (!open) {
    return (
      <p className="nx-note">
        {m
          ? <>Numero inserito a mano: <b>{fmt(m.value)}</b> alle {hm(m.at)} del {dmy(m.at)}{m.by ? ` (${m.by})` : ''}. Vale finché non carichi un export più recente. <button className="nx-link" disabled={saving} onClick={() => save(0)}>torna all'export</button></>
          : <>Sul portale sono di più? <button className="nx-link" onClick={() => { setValue(''); setOpen(true); }}>inserisci il numero di adesso</button></>}
      </p>
    );
  }
  return (
    <form className="nx-noteform" onSubmit={(e) => { e.preventDefault(); const v = parseInt(value, 10); if (v > 0) save(v); }}>
      <label className="nx-hint" htmlFor={`nx-count-${item.ed.key}`}>Registrati di adesso sul portale (lo vedono tutti, finché non arriva un export più recente)</label>
      <input id={`nx-count-${item.ed.key}`} className="nx-input" type="number" inputMode="numeric" min="1" value={value} onChange={(e) => setValue(e.target.value)} autoFocus style={{ maxWidth: 160 }} />
      <span className="nx-formacts">
        <button className="nx-btn primary" type="submit" disabled={saving || !(parseInt(value, 10) > 0)}>{saving ? 'Salvo…' : 'Salva'}</button>
        <button className="nx-link" type="button" onClick={() => setOpen(false)}>annulla</button>
      </span>
    </form>
  );
}

/** How the projection was made: pace and level, and the range most past nights ended in. */
export function ProjectionNote({ p, likely }) {
  if (!p) return null;
  return (
    <>
      Stima: {p.pace != null ? <>ritmo di oggi ~{fmt(p.pace)} (peso {fmt(p.paceWeight * 100, 0)}%) e </> : null}livello delle ultime serate ~{fmt(p.level)}.{' '}
      {likely && <>8 serate su 10 sono finite tra <b>{fmt(likely.low)}</b> e <b>{fmt(likely.high)}</b> rispetto a una stima così. </>}
    </>
  );
}

/** "Di solito a 7 giorni la stima sbaglia del ±18% (12 serate di questo brand)". */
export function AccuracyNote({ accuracy, series }) {
  if (!accuracy) return null;
  const scope = accuracy.scope === 'group' ? (series ? 'della serie' : 'di questo brand') : 'di tutti i brand';
  return <>Di solito a {accuracy.d} {accuracy.d === 1 ? 'giorno' : 'giorni'} la stima sbaglia del <b>±{accuracy.typical}%</b> ({accuracy.n} serate {scope}; entro ±20% nel {accuracy.within20}% dei casi). </>;
}

/** Tracker of one upcoming night: numbers + cumulative curve against past editions. */
export function TrackerView({ item, onCompare, windowDays = 30, onSaveCount, note, onSaveNote }) {
  if (!item) return null;
  const { ed, series, tracker: t, retarget, entries, accuracy, likely } = item;
  const band = item.band.filter((p) => p.d <= windowDays);
  const compared = t.comparisons.length;
  const delta = compared && t.avgAtSamePoint ? pctChange(t.currentRegistrations, t.avgAtSamePoint) : null;
  const xs = daysAxis(windowDays);
  const outside = t.pointDaysBefore > windowDays;
  const prev = [...t.comparisons].sort((a, b) => b.eventDate - a.eventDate)[0];
  const prevLabel = (x) => (x === 0 ? 'giorno dell\'evento' : `${-x} ${x === -1 ? 'giorno' : 'giorni'} prima`);
  return (
    <>
      <div className="nx-stats">
        <div className="nx-stat"><div className="v">{fmt(t.currentRegistrations)}</div><div className="l">registrati a {t.pointDaysBefore} giorni{item.manual ? ' · a mano' : ''}</div></div>
        <div className="nx-stat"><div className="v">{compared ? fmt(t.avgAtSamePoint) : '–'}</div><div className="l">media allo stesso punto{compared ? ` · ${compared} ${series ? (compared > 1 ? 'serate della serie' : 'serata della serie') : 'ed.'}` : ''}</div></div>
        <div className="nx-stat"><div className="v">{delta != null ? <Delta value={delta} /> : '–'}</div><div className="l">rispetto alla media</div></div>
        <div className="nx-stat"><div className="v" style={{ color: 'var(--nx-proj)' }}>{t.projection ? `~${fmt(t.projection.value)}` : '–'}</div>
          <div className="l">{t.projection ? `registrati a fine serata · ${likely ? `probabile ${fmt(likely.low)}–${fmt(likely.high)}` : projRange(t.projection)}${t.projection.reliable ? '' : ' · incerta'}` : compared ? 'presto per stimare' : series ? 'nessuna serata conclusa nella serie' : 'nessuna edizione da confrontare'}</div></div>
        {entries && (
          <div className="nx-stat"><div className="v">{entries.value != null ? `~${fmt(entries.value)}` : `~${fmt(entries.sofar)}`}</div>
            <div className="l">{entries.value != null ? `ingressi stimati${entries.low !== entries.high ? ` · ${fmt(entries.low)}–${fmt(entries.high)}` : ''}` : 'ingressi dai registrati di oggi'}</div></div>
        )}
      </div>
      <LineChart
        xs={xs}
        xLabel={dayTick(windowDays)}
        xTitle={prevLabel}
        band={compared ? band.map((p) => ({ x: p.d === 0 ? 0 : -p.d, min: p.min, med: p.med, max: p.max })) : null}
        series={[{ key: 'cur', label: `questa ${series ? 'serata' : 'edizione'}`, color: 'var(--nx-now)', width: 2.4, points: band.map((p) => ({ x: p.d === 0 ? 0 : -p.d, y: p.cur })) }]}
        projection={t.projection && !outside ? { x0: -t.pointDaysBefore, y0: t.currentRegistrations, x1: 0, y1: t.projection.value } : null}
        now={outside ? null : -t.pointDaysBefore}
        nowLabel={item.manual ? 'a mano' : 'dati'}
        yLabel="Registrazioni cumulative"
      />
      <div className="nx-legend">
        <span><i style={{ background: 'var(--nx-now)' }} />questa {series ? 'serata' : 'edizione'}</span>
        {compared > 0 && <><span><i style={{ background: 'var(--nx-band)', height: 8 }} />{series ? `serie ${series}` : 'edizioni passate'} (min–max)</span><span><i style={{ borderTop: '1.5px dashed var(--nx-muted)', height: 0 }} />mediana</span></>}
        {t.projection && <span><i style={{ borderTop: '2px dashed var(--nx-proj)', height: 0 }} />proiezione</span>}
        <span>Tocca il grafico per i numeri di ogni giorno</span>
      </div>
      <p className="nx-note">
        {series && <>Confronto con la serie <b>{series}</b> invece che con il brand. </>}
        {outside && <>Mancano <b>{t.pointDaysBefore} giorni</b>: il punto di oggi è prima della finestra, allargala a 60 giorni per vederlo. </>}
        {prev && <>{series ? 'Serata precedente della serie' : 'Edizione precedente'} ({dshort(prev.eventDate)}): <b>{fmt(prev.atSamePointAdjusted)}</b> a questo punto, <b>{fmt(prev.totalFinal)}</b> a fine serata, conversione {pct(prev.finalConversion)}. </>}
        {t.projection && <ProjectionNote p={t.projection} likely={likely} />}
        {t.projection && <AccuracyNote accuracy={accuracy} series={series} />}
        {entries && <>Ingressi: chi si è registrato finora entra di solito al {fmt(entries.early, 0)}%, chi si registra da qui in poi al {fmt(entries.late, 0)}% ({entries.basedOn} {entries.basedOn === 1 ? 'serata' : 'serate'} con ingressi). </>}
        {retarget > 0 && <><b>{fmt(retarget)}</b> persone già venute non sono ancora registrate. </>}
        {onCompare && <button className="nx-link" onClick={() => onCompare(ed.key)}>Apri nel confronto con {series ? 'le altre serate della serie' : 'le edizioni passate'}</button>}
      </p>
      {onSaveCount && <CountEditor item={item} onSave={onSaveCount} />}
      {onSaveNote && <p className="nx-note" style={{ marginTop: 0 }}><NoteEditor note={note} onSave={(text) => onSaveNote(ed, text)} /></p>}
    </>
  );
}
