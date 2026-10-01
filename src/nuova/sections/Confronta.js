import { useState, useEffect, useMemo } from 'react';
import { Panel, Seg, VenueDot, compareColor, Delta, WindowSeg, daysAxis, dayTick, NoteEditor, AccuracyNote } from '../ui';
import { LineChart } from '../charts';
import { editionMetrics, audienceOverlap, projectFromSet, lookupNight, median } from '../model';
import {
  itemCurve, checkpointsFor, groupCatalog, groupMetrics, suggestionsFor, companionsFor,
  expectedEntries, accuracyFor, audienceFlow, encodeTable, decodeTable,
} from '../compare';
import { fmt, pct, dshort, dmy, pctChange } from '../format';
import Tabelle from './Tabelle';

const STORE = 'nx_confronta_v1';
const readSaved = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const save = (keys) => { try { localStorage.setItem(STORE, JSON.stringify(keys)); } catch { /* no storage */ } };
const HOUR_LABEL = { 12: '12', 15: '15', 18: '18', 21: '21', 24: '00', 27: '03' };
const HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
const VIEWS = [['curve', 'Curve'], ['numeri', 'Numeri'], ['pubblico', 'Pubblico'], ['previsione', 'Previsione']];
const KIND_LABEL = { serie: 'Serie', brand: 'Brand per stagione', locale: 'Locale per stagione', giorno: 'Locale e giorno della settimana', genere: 'Genere per stagione' };
const MAX_TABLE = 8;

// What sits on the table: a night, or a group of concluded nights drawn as one line (median, min–max)
const nightItem = (ed) => ({ key: ed.key, kind: 'night', ed, eds: [ed], title: ed.title, over: ed.over, date: ed.date, venue: ed.venue });
const groupItem = (g) => ({ key: g.key, kind: 'group', groupKind: g.kind, eds: g.eds, title: g.label, over: true, date: null, venue: g.venue });
const itemSub = (it) => (it.kind === 'group' ? `${it.eds.length} serate · mediana` : `${dmy(it.date)}${it.over ? '' : ' · in vendita'}`);
const itemLabel = (it) => (it.kind === 'group' ? it.title : `${it.title} ${dmy(it.date)}`);

function SeriesList({ series, onLoad, onDelete }) {
  const [confirm, setConfirm] = useState(null);
  return (
    <div className="nx-series">
      <span className="nx-hint">Serie salvate</span>
      {series.map((s) => (
        <div key={s.name} className="nx-seriesitem">
          <span><b>{s.name}</b><span className="nx-subline nx-hint">{s.eds.length} serate{s.hidden ? ` · ${s.hidden} fuori da questo filtro` : ''}</span></span>
          {confirm === s.name ? (
            <span className="acts">
              <button className="nx-btn" onClick={() => { setConfirm(null); onDelete(s.name); }}>Elimina</button>
              <button className="nx-link" onClick={() => setConfirm(null)}>no</button>
            </span>
          ) : (
            <span className="acts">
              <button className="nx-btn" disabled={!s.eds.length} onClick={() => onLoad(s)}>Sul tavolo</button>
              <button className="nx-link" onClick={() => setConfirm(s.name)} aria-label={`Elimina la serie ${s.name}`}>elimina</button>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function LibItem({ k, title, sub, right, on, onAdd }) {
  return (
    <div className={`nx-libitem ${on ? 'on' : ''}`} draggable={!on}
      onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', k); ev.dataTransfer.effectAllowed = 'copy'; }}>
      <span>{title}{sub && <span className="nx-subline nx-hint">{sub}</span>}</span>
      <span className="nx-num nx-flat">{right}</span>
      <button className="add" disabled={on} onClick={() => onAdd(k)} aria-label={`Aggiungi ${title} al confronto`}>{on ? '✓' : '+'}</button>
    </div>
  );
}

function Library({ eds, groups, selected, onAdd, venueFilter, series, onLoadSeries, onDeleteSeries, notes }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const byBrand = useMemo(() => {
    const map = new Map();
    for (const e of [...eds].reverse()) {
      if (!e.date) continue;
      const hay = `${e.title} ${e.brand} ${e.venue} ${dmy(e.date)} ${e.season}`.toLowerCase();
      if (needle && !hay.includes(needle)) continue;
      if (!map.has(e.brand)) map.set(e.brand, []);
      map.get(e.brand).push(e);
    }
    return [...map];
  }, [eds, needle]);
  const byKind = useMemo(() => {
    const map = new Map();
    for (const g of groups) {
      if (needle && !g.label.toLowerCase().includes(needle)) continue;
      if (!map.has(g.kind)) map.set(g.kind, []);
      map.get(g.kind).push(g);
    }
    return [...map];
  }, [groups, needle]);
  return (
    <section className="nx-panel nx-library">
      <div className="nx-ph"><h2>Serate</h2><span className="nx-hint">{venueFilter} · trascina sul tavolo o tocca +</span></div>
      <div className="nx-pb">
        <label className="nx-hint" htmlFor="nx-lib-search">Cerca serata, brand, data o stagione</label>
        <input id="nx-lib-search" className="nx-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="es. Gelsi, ottobre, 25-26" style={{ margin: '4px 0 10px' }} />
        {series.length > 0 && !needle && <SeriesList series={series} onLoad={onLoadSeries} onDelete={onDeleteSeries} />}
        {byKind.length > 0 && (
          <details className="nx-libgroup nx-libgroups" open={!!needle}>
            <summary>Gruppi di serate <span className="nx-hint">una linea con mediana e min–max</span></summary>
            {byKind.map(([kind, list]) => (
              <div key={kind} className="nx-libkind">
                <span className="nx-hint">{KIND_LABEL[kind]}</span>
                {list.map((g) => (
                  <LibItem key={g.key} k={g.key} title={g.label} sub={`${g.eds.length} serate`} right={`~${fmt(median(g.eds.map((e) => e.reg)))}`}
                    on={selected.includes(g.key)} onAdd={onAdd} />
                ))}
              </div>
            ))}
          </details>
        )}
        {byBrand.map(([brand, list]) => (
          <details key={brand} className="nx-libgroup" open={!!needle || list.some((e) => !e.over)}>
            <summary><VenueDot venue={list[0].venue} /> {brand} <span className="nx-hint">{list.length}</span></summary>
            {list.map((e) => {
              const note = lookupNight(notes, e);
              const when = `${dshort(e.date)}${e.seasonNo ? ` · ${e.seasonNo}ª ${e.season}` : ''}`;
              return (
                <LibItem key={e.key} k={e.key} on={selected.includes(e.key)} onAdd={onAdd}
                  title={<>{e.title !== e.brand ? e.title : dshort(e.date)}{note && <span title={note.text}> ✎</span>}</>}
                  sub={e.title !== e.brand ? when : e.seasonNo ? `${e.seasonNo}ª ${e.season}` : null}
                  right={e.over ? fmt(e.reg) : <span className="nx-tag">in vendita · {fmt(e.reg)}</span>} />
              );
            })}
          </details>
        ))}
        {!byBrand.length && !byKind.length && <p className="nx-empty">Nessuna serata trovata.</p>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- curves

function axisSetup(axis, windowDays) {
  if (axis === 'ore') {
    return { xs: HOURS, xLabel: (x) => HOUR_LABEL[x] || '', xTitle: (x) => `fino alle ${String(x % 24).padStart(2, '0')}:00` };
  }
  if (axis === 'apertura') {
    const step = windowDays > 30 ? 14 : 7;
    return {
      xs: Array.from({ length: windowDays + 1 }, (_, i) => i),
      xLabel: (x) => (x === 0 ? 'apertura' : x % step === 0 ? `+${x} g` : ''),
      xTitle: (x) => (x === 0 ? 'giorno di apertura' : `${x} ${x === 1 ? 'giorno' : 'giorni'} dopo l'apertura`),
    };
  }
  return { xs: daysAxis(windowDays), xLabel: dayTick(windowDays), xTitle: (x) => (x === 0 ? 'giorno dell\'evento' : `${-x} ${x === -1 ? 'giorno' : 'giorni'} prima`) };
}

const AXIS_NOTE = {
  giorni: (w) => `Registrazioni accumulate negli ultimi ${w} giorni prima dell'evento.`,
  apertura: () => 'Ogni serata parte dal giorno in cui ha aperto le registrazioni: confronta serate che sono state in vendita per periodi diversi. La curva si ferma al giorno dell\'evento.',
  percentuale: () => 'Ogni curva in percentuale del suo totale finale: mostra la forma, non la dimensione. Le serate in vendita non hanno ancora un finale.',
  ore: () => 'Registrazioni accumulate fino a ogni ora del giorno della serata (le 12 includono i giorni prima).',
};

/** The curves read as numbers at a few points, with the difference from the first row. */
function Checkpoints({ rows, series, xs, xTitle, yFormat, axis }) {
  if (!rows.length) return null;
  const first = series[0];
  const valueAt = (s, x) => s.points.find((p) => p.x === x)?.y ?? null;
  const finalOf = (it) => (axis === 'percentuale' ? 100 : it.kind === 'group' ? median(it.eds.map((e) => e.reg)) : it.over ? it.ed.reg : null);
  return (
    <div className="nx-tw" style={{ marginTop: 8 }}>
      <table className="nx-tappe">
        <thead><tr><th />{xs.map((x) => <th key={x} className="n">{xTitle(x)}</th>)}<th className="n">finale</th></tr></thead>
        <tbody>
          {rows.map((it, i) => {
            const s = series[i];
            return (
              <tr key={it.key}>
                <td className="nx-name"><span className="nx-swatch" style={{ background: it.color }} /> {it.title.slice(0, 26)}<span className="nx-subline">{itemSub(it)}</span></td>
                {xs.map((x) => {
                  const v = valueAt(s, x);
                  const base = i > 0 ? valueAt(first, x) : null;
                  return <td key={x} className="n">{v == null ? '–' : yFormat(v)}{base ? <span className="nx-subline"><Delta value={pctChange(v, base)} /></span> : null}</td>;
                })}
                <td className="n"><b>{finalOf(it) == null ? (it.over ? '–' : 'in vendita') : yFormat(finalOf(it))}</b></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > 1 && <p className="nx-note">Sotto ogni numero: la differenza dalla prima riga ({rows[0].title}).</p>}
    </div>
  );
}

function Curves({ sel, now, windowDays, setWindowDays }) {
  const [axis, setAxis] = useState('giorni');
  const { xs, xLabel, xTitle } = axisSetup(axis, windowDays);
  const rows = axis === 'percentuale' ? sel.filter((it) => it.over) : sel;
  const yFormat = axis === 'percentuale' ? (v) => `${fmt(v, 0)}%` : (v) => fmt(v);
  const series = rows.map((it) => ({
    key: it.key, color: it.color, label: itemLabel(it), dashed: it.kind === 'group',
    width: it.kind === 'group' ? 2.2 : it.over ? 2 : 2.6,
    points: itemCurve(it, axis, windowDays, now),
  }));
  return (
    <>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Seg value={axis} onChange={setAxis} label="Asse" options={[['giorni', 'giorni all\'evento'], ['apertura', 'dall\'apertura'], ['percentuale', '% del finale'], ['ore', 'ore della serata']]} />
        {axis !== 'ore' && <WindowSeg value={windowDays} onChange={setWindowDays} />}
      </div>
      <LineChart xs={xs} xLabel={xLabel} xTitle={xTitle} yFormat={yFormat} compare series={series} yLabel="Confronto curve" height={240} width={760} />
      <p className="nx-note">{AXIS_NOTE[axis](windowDays)} Tocca o passa sul grafico per leggere i valori; i gruppi sono tratteggiati con la loro fascia min–max.</p>
      <Checkpoints rows={rows} series={series} xs={checkpointsFor(axis, windowDays)} xTitle={axis === 'ore' ? (x) => `${String(x % 24).padStart(2, '0')}:00` : axis === 'apertura' ? (x) => `+${x} g` : (x) => (x === 0 ? 'evento' : `${x} g`)} yFormat={yFormat} axis={axis} />
    </>
  );
}

// ---------------------------------------------------------------- numbers

const hour = (v) => (v == null ? '–' : `${String(Math.round(v) % 24).padStart(2, '0')}:00`);
const METRICS = [
  ['reg', 'Registrati', (v) => fmt(v), true],
  ['ent', 'Ingressi', (v) => (v == null ? 'n.d.' : fmt(v)), true],
  ['conv', 'Conversione', pct, true],
  ['seasonNo', 'Serata della stagione', (v) => (v ? `${v}ª` : '–')],
  ['openLead', 'Registrazioni aperte', (v) => (v == null ? '–' : `${fmt(v)} g prima`)],
  ['dayOf', 'Registrati il giorno stesso', pct],
  ['medianDays', 'Anticipo mediano', (v) => (v == null ? '–' : `${fmt(v, v % 1 ? 1 : 0)} g`)],
  ['peakReg', 'Ora di picco registrazioni', hour],
  ['peakEnt', 'Ora di picco ingressi', hour],
  ['female', 'Donne', pct],
  ['under18', 'Sotto 18 anni', pct],
  ['age18to24', '18–24 anni', pct],
  ['over25', '25 anni e più', pct],
  ['returning', 'Già venuti prima', pct, true],
  ['newcomers', 'Nuovi (mai entrati prima)', (v) => fmt(v), true],
  ['back30', 'Tornati entro 30 giorni', pct, true],
];

function Numbers({ sel, attendance, now, notes, saveNote }) {
  const metrics = useMemo(() => sel.map((it) => (it.kind === 'group' ? groupMetrics(it.eds, attendance, now) : editionMetrics(it.ed, attendance, now))), [sel, attendance, now]);
  return (
    <>
      <div className="nx-tw">
        <table>
          <thead>
            <tr><th />{sel.map((it) => <th key={it.key} className="n"><span className="nx-swatch" style={{ background: it.color }} /> {it.title.slice(0, 18)}<span className="nx-subline">{itemSub(it)}</span></th>)}</tr>
          </thead>
          <tbody>
            {METRICS.map(([key, label, format, higherBetter]) => {
              const vals = metrics.map((m) => m[key]);
              const best = higherBetter && vals.some((v) => v != null) ? Math.max(...vals.filter((v) => v != null)) : null;
              return (
                <tr key={key}>
                  <td className="nx-flat">{label}</td>
                  {vals.map((v, i) => <td key={i} className="n" style={best != null && v === best && sel.length > 1 ? { fontWeight: 600, color: 'var(--nx-fg)' } : undefined}>{format(v)}</td>)}
                </tr>
              );
            })}
            <tr><td className="nx-flat">Locale</td>{sel.map((it) => <td key={it.key} className="n"><VenueDot venue={it.venue} /> {(it.venue || '–').replace('Tenuta ', '')}</td>)}</tr>
            <tr>
              <td className="nx-flat">Note</td>
              {sel.map((it) => (
                <td key={it.key} className="nx-notecell">
                  {it.kind === 'night' ? <NoteEditor compact note={lookupNight(notes, it.ed)} onSave={(text) => saveNote(it.ed, text)} /> : <span className="nx-flat">–</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="nx-note">Per i gruppi: media per serata (conversione sul totale dei registrati). "Nuovi": persone mai entrate prima di quella serata. "Tornati entro 30 giorni": chi è entrato ed è rientrato a un'altra serata nel mese dopo. Le note (pioggia, ospite, serata concorrente…) le vedete tutti e spiegano le serate fuori media.</p>
    </>
  );
}

// ---------------------------------------------------------------- audience

function Overlap({ sel, eds, now }) {
  const [who, setWho] = useState('registrati');
  const lists = useMemo(() => sel.map((it) => it.eds.flatMap((e) => (who === 'entrati' ? e.rows.filter((r) => r.attended) : e.rows))), [sel, who]);
  const m = useMemo(() => audienceOverlap(lists), [lists]);
  const flows = useMemo(() => sel.filter((it) => it.kind === 'night' && it.over).map((it) => ({ it, flow: audienceFlow(it.ed, eds, now) })).filter((f) => f.flow), [sel, eds, now]);
  return (
    <>
      <div style={{ marginBottom: 8 }}><Seg value={who} onChange={setWho} label="Chi contare" options={[['registrati', 'registrati'], ['entrati', 'entrati']]} /></div>
      {sel.length < 2 ? <p className="nx-empty">Aggiungi almeno due serate o gruppi per vedere le persone in comune.</p> : (
        <div className="nx-tw">
          <table>
            <thead><tr><th>persone di… ↓ presenti anche a →</th>{sel.map((it) => <th key={it.key} className="n"><span className="nx-swatch" style={{ background: it.color }} /> {it.kind === 'group' ? it.title.slice(0, 14) : dmy(it.date)}</th>)}</tr></thead>
            <tbody>
              {sel.map((it, i) => (
                <tr key={it.key}>
                  <td className="nx-name"><span className="nx-swatch" style={{ background: it.color }} /> {it.title.slice(0, 22)}<span className="nx-subline">{itemSub(it)} · {fmt(m[i][i].n)} persone</span></td>
                  {m[i].map((c, j) => (
                    <td key={j} className="n" style={i !== j ? { background: `rgba(var(--nx-heat), ${(c.pct / 100 * 0.8).toFixed(2)})` } : { color: 'var(--nx-faint)' }}>
                      {i === j ? '—' : <>{fmt(c.pct, 0)}% <span className="nx-flat">({fmt(c.n)})</span></>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="nx-note">Riga: quante persone {who === 'entrati' ? 'entrate' : 'registrate'} a quella serata (o gruppo) lo erano anche a quella in colonna. Dice se due serate pescano dallo stesso pubblico.</p>
      {flows.length > 0 && (
        <>
          <h3 className="nx-h3">Dove va il pubblico dopo la serata</h3>
          <div className="nx-tw">
            <table>
              <thead><tr><th>serata</th><th className="n">entrati</th><th className="n">rientrati entro 60 g</th><th>dove (persone della serata)</th></tr></thead>
              <tbody>
                {flows.map(({ it, flow }) => (
                  <tr key={it.key}>
                    <td className="nx-name"><span className="nx-swatch" style={{ background: it.color }} /> {it.title.slice(0, 22)}<span className="nx-subline">{dmy(it.date)}</span></td>
                    <td className="n">{fmt(flow.people)}</td>
                    <td className="n">{fmt(flow.backPct, 0)}%{!flow.complete && <span className="nx-subline">60 giorni non ancora passati</span>}</td>
                    <td>{flow.top.length ? flow.top.map((b) => <span key={b.brand} className="nx-flowtag"><VenueDot venue={b.venue} /> {b.brand} <b>{fmt(b.pct, 0)}%</b></span>) : <span className="nx-flat">nessuno è rientrato</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nx-note">Tra chi è entrato, quanti sono rientrati a un'altra serata nei 60 giorni dopo e a quali brand. Una persona può andare a più brand.</p>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- forecast

function Forecast({ sel, records, now, upcoming, windowDays, setWindowDays, accuracy }) {
  const targets = sel.filter((it) => it.kind === 'night' && !it.over && it.date);
  const [targetKey, setTargetKey] = useState(null);
  const target = targets.find((t) => t.key === targetKey) || targets[0];
  // Reference nights: concluded nights on the table, and the nights of every group
  const refs = useMemo(() => {
    const out = new Map();
    for (const it of sel) for (const e of it.eds) if (e.over && e.date && (!target || e.key !== target.key) && !out.has(e.key)) out.set(e.key, { ed: e, color: it.color });
    return [...out.values()].sort((a, b) => a.ed.date - b.ed.date);
  }, [sel, target]);
  const p = useMemo(() => (target && refs.length ? projectFromSet(target.ed, refs.map((r) => r.ed), records, now) : null), [target, refs, records, now]);
  if (!targets.length) return <p className="nx-empty">Metti sul tavolo una serata in vendita: la stimo usando le serate concluse (o i gruppi) che le metti accanto.</p>;
  if (!refs.length) return <p className="nx-empty">Aggiungi accanto a {target.ed.title} le serate concluse o i gruppi che secondo te le somigliano.</p>;
  const tracked = upcoming.find((u) => u.ed.key === target.key);
  const brandView = tracked?.tracker.projection;
  const proj = p.projection;
  const entries = expectedEntries(target.ed, refs.map((r) => r.ed), p.reference, target.ed.reg, proj);
  const acc = proj ? accuracyFor(accuracy, null, p.pointDaysBefore) : null;
  const groupLines = sel.filter((it) => it.kind === 'group').map((it) => ({ key: it.key, color: it.color, label: it.title, width: 2, dashed: true, points: itemCurve(it, 'giorni', windowDays, now) }));
  const nightRefs = refs.filter((r) => sel.some((it) => it.kind === 'night' && it.key === r.ed.key));
  return (
    <>
      {targets.length > 1 && <div style={{ marginBottom: 8 }}><Seg value={target.key} onChange={setTargetKey} label="Serata da stimare" options={targets.map((t) => [t.key, `${t.ed.title} ${dmy(t.ed.date)}`])} /></div>}
      <div className="nx-stats">
        <div className="nx-stat"><div className="v">{fmt(target.ed.reg)}</div><div className="l">{target.ed.title} · a {p.pointDaysBefore} giorni</div></div>
        <div className="nx-stat"><div className="v">{fmt(p.avgAtSamePoint)}</div><div className="l">media delle serate scelte allo stesso punto</div></div>
        <div className="nx-stat"><div className="v">{p.avgAtSamePoint ? <Delta value={pctChange(target.ed.reg, p.avgAtSamePoint)} /> : '–'}</div><div className="l">rispetto alla media</div></div>
        <div className="nx-stat"><div className="v" style={{ color: 'var(--nx-proj)' }}>{proj ? `~${fmt(proj.value)}` : '–'}</div>
          <div className="l">{proj ? `registrati a fine serata · ${proj.low === proj.high ? '' : `${fmt(proj.low)}–${fmt(proj.high)} · `}su ${proj.basedOn} ${proj.basedOn === 1 ? 'serata' : 'serate'}${proj.reliable ? '' : ' · incerta'}` : 'a questo punto le serate scelte erano a zero'}</div></div>
        {entries && <div className="nx-stat"><div className="v">~{fmt(entries.value ?? entries.sofar)}</div><div className="l">{entries.value != null ? `ingressi stimati${entries.low !== entries.high ? ` · ${fmt(entries.low)}–${fmt(entries.high)}` : ''}` : 'ingressi dai registrati di oggi'}</div></div>}
        {brandView && brandView.value !== proj?.value && <div className="nx-stat"><div className="v nx-flat">~{fmt(brandView.value)}</div><div className="l">{tracked.series ? `stima del tracker (serie ${tracked.series})` : 'stima con le sole edizioni del brand'}</div></div>}
      </div>
      <div style={{ marginBottom: 6 }}><WindowSeg value={windowDays} onChange={setWindowDays} /></div>
      <LineChart
        xs={daysAxis(windowDays)} xLabel={dayTick(windowDays)} xTitle={(x) => (x === 0 ? 'giorno dell\'evento' : `${-x} ${x === -1 ? 'giorno' : 'giorni'} prima`)} compare
        series={[
          { key: target.key, color: target.color, label: itemLabel(target), width: 2.8, points: itemCurve(target, 'giorni', windowDays, now) },
          ...nightRefs.map(({ ed, color }) => ({ key: ed.key, color, label: `${ed.title} ${dmy(ed.date)}`, width: 1.4, points: itemCurve(nightItem(ed), 'giorni', windowDays, now) })),
          ...groupLines,
        ]}
        projection={proj && p.pointDaysBefore <= windowDays ? { x0: -p.pointDaysBefore, y0: target.ed.reg, x1: 0, y1: proj.value } : null}
        now={p.pointDaysBefore <= windowDays ? -p.pointDaysBefore : null} nowLabel="dati" height={240} width={760} yLabel="Previsione"
      />
      {p.pointDaysBefore > windowDays && <p className="nx-note">Mancano <b>{p.pointDaysBefore} giorni</b>: allarga la finestra a 60 giorni per vedere il punto di oggi.</p>}
      <div className="nx-tw" style={{ marginTop: 8 }}>
        <table>
          <thead><tr><th>serata di riferimento</th><th className="n">allo stesso punto</th><th className="n">finale</th><th className="n">moltiplicatore</th><th className="n">conversione</th></tr></thead>
          <tbody>
            {p.comps.map((c) => {
              const color = refs.find((r) => r.ed.key === c.ed.key)?.color;
              return (
                <tr key={c.ed.key}>
                  <td className="nx-name"><span className="nx-swatch" style={{ background: color }} /> {c.ed.title} · {dmy(c.ed.date)}</td>
                  <td className="n">{fmt(c.atSamePointAdjusted)}</td>
                  <td className="n">{fmt(c.totalFinal)}</td>
                  <td className="n">{c.atSamePointAdjusted ? `×${fmt(c.totalFinal / c.atSamePointAdjusted, 1)}` : '–'}</td>
                  <td className="n">{pct(c.ed.conv)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="nx-note">
        Ogni serata di riferimento dice "a questo punto ne avevo X, ho chiuso a Y": la stima applica la mediana dei moltiplicatori ai registrati di oggi; l'intervallo va dal più basso al più alto (dal primo al terzo quartile con 4 serate o più).{' '}
        {acc && <AccuracyNote accuracy={acc} />}
        {entries && <>Ingressi: chi si è registrato finora entra di solito al {fmt(entries.early, 0)}%, chi si registra da qui in poi al {fmt(entries.late, 0)}%.</>}
      </p>
    </>
  );
}

// ---------------------------------------------------------------- table

function SaveSeries({ initial, names, count, onSave, onCancel }) {
  const [name, setName] = useState(initial || '');
  const [saving, setSaving] = useState(false);
  const clean = name.trim();
  return (
    <form className="nx-saveseries" onSubmit={async (ev) => {
      ev.preventDefault();
      if (!clean || saving) return;
      setSaving(true);
      await onSave(clean);
      setSaving(false);
    }}>
      <label className="nx-hint" htmlFor="nx-series-name">Nome della serie ({count} serate sul tavolo; i gruppi non entrano). Le sue serate in vendita si confronteranno con le altre della serie.</label>
      <input id="nx-series-name" className="nx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Opening Too Late" maxLength={40} list="nx-series-names" autoFocus />
      <datalist id="nx-series-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
      <button className="nx-btn primary" type="submit" disabled={!clean || saving}>{saving ? 'Salvo…' : names.includes(clean) ? 'Aggiorna serie' : 'Salva serie'}</button>
      <button className="nx-link" type="button" onClick={onCancel}>annulla</button>
    </form>
  );
}

function Suggestions({ target, eds, seriesIdx, keys, onAdd }) {
  const list = useMemo(() => (target ? suggestionsFor(target.ed, eds, seriesIdx) : []), [target, eds, seriesIdx]);
  const open = list.filter((s) => s.keys.some((k) => !keys.includes(k)));
  if (!open.length) return null;
  return (
    <div className="nx-sugg">
      <span className="nx-hint">Da affiancare a {target.ed.title}:</span>
      {open.map((s) => <button key={s.id} onClick={() => onAdd(s.keys)}>+ {s.label}{s.keys.length > 1 ? ` (${s.keys.length})` : ''}</button>)}
    </div>
  );
}

function Tavolo({ ctx }) {
  const { eds, records, now, attendance, upcoming, seedKey, clearSeed, venueLabel, windowDays, setWindowDays, seriesIdx, saveSeries, deleteSeries, accuracy, notes, saveNote } = ctx;
  const [keys, setKeys] = useState(readSaved);
  const [view, setView] = useState('curve');
  const [over, setOver] = useState(false);
  const [naming, setNaming] = useState(false);
  const [loaded, setLoaded] = useState(null); // series last put on the table (prefills the name)
  const [msg, setMsg] = useState(null);
  const [shareUrl, setShareUrl] = useState(null);
  const groups = useMemo(() => groupCatalog(eds, seriesIdx), [eds, seriesIdx]);
  const byKey = useMemo(() => new Map([...eds.filter((e) => e.date).map((e) => [e.key, nightItem(e)]), ...groups.map((g) => [g.key, groupItem(g)])]), [eds, groups]);
  const seriesList = seriesIdx?.list || [];

  useEffect(() => { save(keys); }, [keys]);
  useEffect(() => {
    if (!seedKey) return;
    const shared = decodeTable(seedKey);
    if (shared) {
      setKeys(shared.keys.filter((k) => byKey.has(k)));
      if (VIEWS.some(([v]) => v === shared.view)) setView(shared.view);
    } else if (byKey.get(seedKey)?.kind === 'night') {
      const ed = byKey.get(seedKey).ed;
      setKeys([seedKey, ...companionsFor(ed, eds, seriesIdx)].slice(0, MAX_TABLE));
      setView(ed.over ? 'curve' : 'previsione');
    }
    clearSeed();
  }, [seedKey, byKey, eds, seriesIdx, clearSeed]);

  const sel = useMemo(() => keys.map((k) => byKey.get(k)).filter(Boolean).map((it, i) => ({ ...it, color: compareColor(i) })), [keys, byKey]);
  const add = (k) => setKeys((prev) => (prev.includes(k) || !byKey.has(k) ? prev : [...prev, k].slice(0, MAX_TABLE)));
  const addMany = (ks) => setKeys((prev) => [...prev, ...ks.filter((k) => byKey.has(k) && !prev.includes(k))].slice(0, MAX_TABLE));
  const remove = (k) => setKeys((prev) => prev.filter((x) => x !== k));
  const example = () => {
    const next = upcoming[0]?.ed || eds.filter((e) => e.over).slice(-1)[0];
    if (next) { setKeys([next.key, ...companionsFor(next, eds, seriesIdx)].slice(0, MAX_TABLE)); setView(next.over ? 'curve' : 'previsione'); }
  };
  const loadSeries = (s) => {
    // Nights on sale first: the forecast estimates them from the concluded ones
    const ordered = [...s.eds.filter((e) => !e.over), ...s.eds.filter((e) => e.over).reverse()].slice(0, MAX_TABLE);
    setKeys(ordered.map((e) => e.key));
    setView(ordered.some((e) => !e.over) ? 'previsione' : 'curve');
    setLoaded(s.name);
    setMsg(null);
  };
  const nights = sel.filter((it) => it.kind === 'night');
  const target = nights.find((it) => !it.over) || nights[0];
  const onSaveSeries = async (name) => {
    const ok = await saveSeries(name, nights.map((it) => it.ed));
    setNaming(false);
    if (ok) setLoaded(name);
    setMsg(ok
      ? `Serie «${name}» salvata. In Stasera ed Eventi le sue serate in vendita ora si confrontano con le altre della serie.`
      : 'Salvataggio non riuscito: controlla la connessione e riprova.');
  };
  const onDeleteSeries = async (name) => {
    const ok = await deleteSeries(name);
    if (ok && loaded === name) setLoaded(null);
    setMsg(ok ? `Serie «${name}» eliminata. Le serate restano nei loro brand.` : 'Eliminazione non riuscita: riprova.');
  };
  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#confronta/${encodeURIComponent(encodeTable(keys, view))}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareUrl(null);
      setMsg('Link copiato: chi lo apre (con un account abilitato) vede questo tavolo.');
    } catch {
      setShareUrl(url);
      setMsg(null);
    }
  };

  return (
    <div className="nx-compare">
      <Library eds={eds} groups={groups} selected={keys} onAdd={add} venueFilter={venueLabel} series={seriesList} onLoadSeries={loadSeries} onDeleteSeries={onDeleteSeries} notes={notes} />
      <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        <Panel title="Tavolo di confronto" hint={`fino a ${MAX_TABLE} tra serate e gruppi`}
          actions={<>
            {nights.length > 1 && !naming && <button className="nx-btn" onClick={() => { setNaming(true); setMsg(null); }}>Salva come serie</button>}
            {sel.length > 0 && <button className="nx-btn" onClick={copyLink}>Copia link</button>}
            {sel.length > 0 && <button className="nx-btn" onClick={() => { setKeys([]); setLoaded(null); setNaming(false); setShareUrl(null); }}>Svuota</button>}
            <button className="nx-btn" onClick={example}>Esempio</button>
          </>}>
          <div className={`nx-drop ${over ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.getData('text/plain')); }}>
            {sel.length === 0 && <span className="nx-hint">Trascina qui serate o gruppi dalla lista, o tocca + accanto a ognuno. Prova "Esempio": il prossimo evento con le serate che gli somigliano.</span>}
            {sel.map((it) => (
              <span key={it.key} className={`nx-pill ${it.kind === 'group' ? 'group' : ''}`}>
                <span className="nx-swatch" style={{ background: it.color }} />
                <b>{it.title.slice(0, 26)}</b> <span className="nx-flat">{itemSub(it)}</span>
                <button onClick={() => remove(it.key)} aria-label={`Togli ${itemLabel(it)}`}>×</button>
              </span>
            ))}
          </div>
          <Suggestions target={target} eds={eds} seriesIdx={seriesIdx} keys={keys} onAdd={addMany} />
          {naming && nights.length > 1 && (
            <SaveSeries initial={loaded} names={seriesList.map((s) => s.name)} count={nights.length} onSave={onSaveSeries} onCancel={() => setNaming(false)} />
          )}
          {shareUrl && (
            <div className="nx-saveseries">
              <label className="nx-hint" htmlFor="nx-share">Copia questo link (il telefono non ha permesso di copiarlo da solo):</label>
              <input id="nx-share" className="nx-input" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
            </div>
          )}
          {msg && <p className="nx-note" role="status">{msg}</p>}
        </Panel>
        {sel.length > 0 && (
          <Panel title="Risultato" actions={<Seg value={view} onChange={setView} label="Vista" options={VIEWS} />}>
            {view === 'curve' && <Curves sel={sel} now={now} windowDays={windowDays} setWindowDays={setWindowDays} />}
            {view === 'numeri' && <Numbers sel={sel} attendance={attendance} now={now} notes={notes} saveNote={saveNote} />}
            {view === 'pubblico' && <Overlap sel={sel} eds={eds} now={now} />}
            {view === 'previsione' && <Forecast sel={sel} records={records} now={now} upcoming={upcoming} windowDays={windowDays} setWindowDays={setWindowDays} accuracy={accuracy} />}
          </Panel>
        )}
      </div>
    </div>
  );
}

/** Comparison table (drag & drop) and ranking tables by genre, venue and brand. */
export default function Confronta({ ctx }) {
  const [mode, setMode] = useState('tavolo');
  return (
    <>
      <div style={{ paddingTop: 14 }}>
        <Seg value={mode} onChange={setMode} label="Confronta" options={[['tavolo', 'Tavolo di confronto'], ['tabelle', 'Generi, locali, brand e stime']]} />
      </div>
      {mode === 'tavolo' ? <Tavolo ctx={ctx} /> : <Tabelle ctx={ctx} />}
    </>
  );
}
