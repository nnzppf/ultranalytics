import { useState, useEffect, useMemo } from 'react';
import { Panel, Seg, VenueDot, compareColor, Delta, WindowSeg, daysAxis, dayTick } from '../ui';
import { LineChart } from '../charts';
import { curveByDays, curveByHours, editionMetrics, audienceOverlap, projectFromSet } from '../model';
import { fmt, pct, dshort, dmy, pctChange } from '../format';
import Tabelle from './Tabelle';

const STORE = 'nx_confronta_v1';
const readSaved = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const save = (keys) => { try { localStorage.setItem(STORE, JSON.stringify(keys)); } catch { /* no storage */ } };
const HOUR_LABEL = { 12: '12', 15: '15', 18: '18', 21: '21', 24: '00', 27: '03' };

/**
 * Nights to put next to `ed` by default: the other nights of its series, else the
 * latest concluded nights of the same brand, else of the same venue.
 */
function suggestFor(ed, eds, seriesIdx) {
  const name = seriesIdx?.ofEdition.get(ed.key);
  if (name) return seriesIdx.list.find((s) => s.name === name).eds.filter((e) => e.key !== ed.key).slice(-7).map((e) => e.key);
  const done = eds.filter((e) => e.over && e.key !== ed.key);
  const same = done.filter((e) => e.brand === ed.brand);
  const pool = same.length ? same : done.filter((e) => e.venue === ed.venue);
  return pool.slice(-4).map((e) => e.key);
}

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

function Library({ eds, selected, onAdd, venueFilter, series = [], onLoadSeries, onDeleteSeries }) {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map();
    for (const e of [...eds].reverse()) {
      if (!e.date) continue;
      const hay = `${e.title} ${e.brand} ${e.venue} ${dmy(e.date)}`.toLowerCase();
      if (needle && !hay.includes(needle)) continue;
      if (!map.has(e.brand)) map.set(e.brand, []);
      map.get(e.brand).push(e);
    }
    return [...map];
  }, [eds, q]);
  return (
    <section className="nx-panel nx-library">
      <div className="nx-ph"><h2>Serate</h2><span className="nx-hint">{venueFilter} · trascina sul tavolo o tocca +</span></div>
      <div className="nx-pb">
        <label className="nx-hint" htmlFor="nx-lib-search">Cerca serata, brand o data</label>
        <input id="nx-lib-search" className="nx-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="es. Gelsi, ottobre, Halloween" style={{ margin: '4px 0 10px' }} />
        {series.length > 0 && !q && <SeriesList series={series} onLoad={onLoadSeries} onDelete={onDeleteSeries} />}
        {groups.map(([brand, list]) => (
          <details key={brand} className="nx-libgroup" open={!!q || list.some((e) => !e.over)}>
            <summary><VenueDot venue={list[0].venue} /> {brand} <span className="nx-hint">{list.length}</span></summary>
            {list.map((e) => {
              const on = selected.includes(e.key);
              return (
                <div key={e.key} className={`nx-libitem ${on ? 'on' : ''}`} draggable={!on}
                  onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', e.key); ev.dataTransfer.effectAllowed = 'copy'; }}>
                  <span>{e.title !== e.brand ? e.title : dshort(e.date)}{e.title !== e.brand && <span className="nx-subline nx-hint">{dshort(e.date)}</span>}</span>
                  <span className="nx-num nx-flat">{e.over ? fmt(e.reg) : <span className="nx-tag">in vendita · {fmt(e.reg)}</span>}</span>
                  <button className="add" disabled={on} onClick={() => onAdd(e.key)} aria-label={`Aggiungi ${e.title} ${dshort(e.date)} al confronto`}>{on ? '✓' : '+'}</button>
                </div>
              );
            })}
          </details>
        ))}
        {!groups.length && <p className="nx-empty">Nessuna serata trovata.</p>}
      </div>
    </section>
  );
}

function Curves({ sel, now, windowDays, setWindowDays }) {
  const [mode, setMode] = useState('giorni');
  let xs, xLabel, series, note;
  if (mode === 'ore') {
    xs = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
    xLabel = (x) => HOUR_LABEL[x] || '';
    series = sel.map(({ ed, color }) => ({ key: ed.key, color, label: ed.title, points: curveByHours(ed, now) }));
    note = 'Registrazioni accumulate fino a ogni ora del giorno della serata (le 12 includono i giorni prima).';
  } else {
    xs = daysAxis(windowDays);
    xLabel = dayTick(windowDays);
    const rows = mode === 'percentuale' ? sel.filter(({ ed }) => ed.over) : sel;
    series = rows.map(({ ed, color }) => {
      const pts = curveByDays(ed, windowDays, now);
      return { key: ed.key, color, label: ed.title, width: ed.over ? 2 : 2.6, points: mode === 'percentuale' ? pts.map((p) => ({ x: p.x, y: p.y == null ? null : (100 * p.y) / ed.reg })) : pts };
    });
    note = mode === 'percentuale'
      ? 'Ogni curva in percentuale del suo totale finale: mostra la forma, non la dimensione. Le serate in vendita non hanno ancora un finale.'
      : `Registrazioni accumulate negli ultimi ${windowDays} giorni prima dell'evento.`;
  }
  return (
    <>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Seg value={mode} onChange={setMode} label="Asse" options={[['giorni', 'giorni all\'evento'], ['percentuale', '% del finale'], ['ore', 'ore della serata']]} />
        {mode !== 'ore' && <WindowSeg value={windowDays} onChange={setWindowDays} />}
      </div>
      <LineChart xs={xs} xLabel={xLabel} series={series} yLabel="Confronto curve" height={240} width={760} />
      <p className="nx-note">{note}</p>
    </>
  );
}

const METRICS = [
  ['reg', 'Registrati', (v) => fmt(v), true],
  ['ent', 'Ingressi', (v) => (v == null ? 'n.d.' : fmt(v)), true],
  ['conv', 'Conversione', pct, true],
  ['dayOf', 'Registrati il giorno stesso', pct],
  ['medianDays', 'Anticipo mediano', (v) => (v == null ? '–' : `${fmt(v, v % 1 ? 1 : 0)} g`)],
  ['peakReg', 'Ora di picco registrazioni', (v) => (v == null ? '–' : `${String(v).padStart(2, '0')}:00`)],
  ['peakEnt', 'Ora di picco ingressi', (v) => (v == null ? '–' : `${String(v).padStart(2, '0')}:00`)],
  ['female', 'Donne', pct],
  ['under18', 'Sotto 18 anni', pct],
  ['age18to24', '18–24 anni', pct],
  ['over25', '25 anni e più', pct],
  ['returning', 'Già venuti prima', pct, true],
];

function Numbers({ sel, attendance }) {
  const metrics = useMemo(() => sel.map(({ ed }) => editionMetrics(ed, attendance)), [sel, attendance]);
  return (
    <div className="nx-tw">
      <table>
        <thead>
          <tr><th />{sel.map(({ ed, color }) => <th key={ed.key} className="n"><span className="nx-swatch" style={{ background: color }} /> {ed.title.slice(0, 18)}<span className="nx-subline">{dmy(ed.date)}</span></th>)}</tr>
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
          <tr><td className="nx-flat">Locale</td>{sel.map(({ ed }) => <td key={ed.key} className="n"><VenueDot venue={ed.venue} /> {ed.venue.replace('Tenuta ', '')}</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}

function Overlap({ sel }) {
  const m = useMemo(() => audienceOverlap(sel.map((s) => s.ed)), [sel]);
  if (sel.length < 2) return <p className="nx-empty">Aggiungi almeno due serate per vedere le persone in comune.</p>;
  return (
    <>
      <div className="nx-tw">
        <table>
          <thead><tr><th>persone di… ↓ presenti anche a →</th>{sel.map(({ ed, color }) => <th key={ed.key} className="n"><span className="nx-swatch" style={{ background: color }} /> {dmy(ed.date)}</th>)}</tr></thead>
          <tbody>
            {sel.map(({ ed, color }, i) => (
              <tr key={ed.key}>
                <td className="nx-name"><span className="nx-swatch" style={{ background: color }} /> {ed.title.slice(0, 22)} · {dmy(ed.date)}<span className="nx-subline">{fmt(m[i][i].n)} persone</span></td>
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
      <p className="nx-note">Riga: quante persone registrate a quella serata erano registrate anche alla serata in colonna. Utile per capire se due serate pescano dallo stesso pubblico o da pubblici diversi.</p>
    </>
  );
}

function Forecast({ sel, records, now, upcoming, windowDays, setWindowDays }) {
  const targets = sel.filter(({ ed }) => !ed.over && ed.date);
  const [targetKey, setTargetKey] = useState(null);
  const target = targets.find((t) => t.ed.key === targetKey) || targets[0];
  const refs = sel.filter(({ ed }) => ed.over && ed.date && (!target || ed.key !== target.ed.key));
  const p = useMemo(() => (target && refs.length ? projectFromSet(target.ed, refs.map((r) => r.ed), records, now) : null), [target, refs, records, now]);
  if (!targets.length) return <p className="nx-empty">Metti sul tavolo una serata in vendita: la stimo usando le serate concluse che le metti accanto.</p>;
  if (!refs.length) return <p className="nx-empty">Aggiungi accanto a {target.ed.title} le serate concluse che secondo te le somigliano.</p>;
  const tracked = upcoming.find((u) => u.ed.key === target.ed.key);
  const brandView = tracked?.tracker.projection;
  const proj = p.projection;
  return (
    <>
      {targets.length > 1 && <div style={{ marginBottom: 8 }}><Seg value={target.ed.key} onChange={setTargetKey} label="Serata da stimare" options={targets.map((t) => [t.ed.key, `${t.ed.title} ${dmy(t.ed.date)}`])} /></div>}
      <div className="nx-stats">
        <div className="nx-stat"><div className="v">{fmt(target.ed.reg)}</div><div className="l">{target.ed.title} · a {p.pointDaysBefore} giorni</div></div>
        <div className="nx-stat"><div className="v">{fmt(p.avgAtSamePoint)}</div><div className="l">media delle serate scelte allo stesso punto</div></div>
        <div className="nx-stat"><div className="v">{p.avgAtSamePoint ? <Delta value={pctChange(target.ed.reg, p.avgAtSamePoint)} /> : '–'}</div><div className="l">rispetto alla media</div></div>
        <div className="nx-stat"><div className="v" style={{ color: 'var(--nx-proj)' }}>{proj ? `~${fmt(proj.value)}` : '–'}</div>
          <div className="l">{proj ? `stima finale · ${proj.low === proj.high ? '' : `${fmt(proj.low)}–${fmt(proj.high)} · `}su ${proj.basedOn} ${proj.basedOn === 1 ? 'serata' : 'serate'}${proj.reliable ? '' : ' · incerta'}` : 'a questo punto le serate scelte erano a zero'}</div></div>
        {brandView && brandView.value !== proj?.value && <div className="nx-stat"><div className="v nx-flat">~{fmt(brandView.value)}</div><div className="l">{tracked.series ? `stima del tracker (serie ${tracked.series})` : 'stima con le sole edizioni del brand'}</div></div>}
      </div>
      <div style={{ marginBottom: 6 }}><WindowSeg value={windowDays} onChange={setWindowDays} /></div>
      <LineChart
        xs={daysAxis(windowDays)} xLabel={dayTick(windowDays)}
        series={[
          ...refs.map(({ ed, color }) => ({ key: ed.key, color, label: ed.title, width: 1.4, points: curveByDays(ed, windowDays, now) })),
          { key: target.ed.key, color: target.color, label: target.ed.title, width: 2.8, points: curveByDays(target.ed, windowDays, now) },
        ]}
        projection={proj && p.pointDaysBefore <= windowDays ? { x0: -p.pointDaysBefore, y0: target.ed.reg, x1: 0, y1: proj.value } : null}
        now={p.pointDaysBefore <= windowDays ? -p.pointDaysBefore : null} nowLabel="dati" height={240} width={760} yLabel="Previsione"
      />
      {p.pointDaysBefore > windowDays && <p className="nx-note">Mancano <b>{p.pointDaysBefore} giorni</b>: allarga la finestra a 60 giorni per vedere il punto di oggi.</p>}
      <div className="nx-tw" style={{ marginTop: 8 }}>
        <table>
          <thead><tr><th>serata di riferimento</th><th className="n">allo stesso punto</th><th className="n">finale</th><th className="n">moltiplicatore</th></tr></thead>
          <tbody>
            {p.comps.map((c) => {
              const color = refs.find((r) => r.ed.key === c.ed.key)?.color;
              return (
                <tr key={c.ed.key}>
                  <td className="nx-name"><span className="nx-swatch" style={{ background: color }} /> {c.ed.title} · {dmy(c.ed.date)}</td>
                  <td className="n">{fmt(c.atSamePointAdjusted)}</td>
                  <td className="n">{fmt(c.totalFinal)}</td>
                  <td className="n">{c.atSamePointAdjusted ? `×${fmt(c.totalFinal / c.atSamePointAdjusted, 1)}` : '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="nx-note">Ogni serata di riferimento dice "a questo punto ne avevo X, ho chiuso a Y": la stima applica la mediana dei moltiplicatori ai registrati di oggi, l'intervallo va dal più basso al più alto (dal primo al terzo quartile con 4 serate o più).</p>
    </>
  );
}

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
      <label className="nx-hint" htmlFor="nx-series-name">Nome della serie ({count} serate sul tavolo). Le sue serate in vendita si confronteranno con le altre della serie.</label>
      <input id="nx-series-name" className="nx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Opening Too Late" maxLength={40} list="nx-series-names" autoFocus />
      <datalist id="nx-series-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
      <button className="nx-btn primary" type="submit" disabled={!clean || saving}>{saving ? 'Salvo…' : names.includes(clean) ? 'Aggiorna serie' : 'Salva serie'}</button>
      <button className="nx-link" type="button" onClick={onCancel}>annulla</button>
    </form>
  );
}

function Tavolo({ ctx }) {
  const { eds, records, now, attendance, upcoming, seedKey, clearSeed, venueLabel, windowDays, setWindowDays, seriesIdx, saveSeries, deleteSeries } = ctx;
  const [keys, setKeys] = useState(readSaved);
  const [view, setView] = useState('curve');
  const [over, setOver] = useState(false);
  const [naming, setNaming] = useState(false);
  const [loaded, setLoaded] = useState(null); // series last put on the table (prefills the name)
  const [msg, setMsg] = useState(null);
  const byKey = useMemo(() => new Map(eds.map((e) => [e.key, e])), [eds]);
  const seriesList = seriesIdx?.list || [];

  useEffect(() => { save(keys); }, [keys]);
  useEffect(() => {
    if (!seedKey) return;
    const ed = byKey.get(seedKey);
    if (ed) {
      setKeys([seedKey, ...suggestFor(ed, eds, seriesIdx)]);
      setView(ed.over ? 'curve' : 'previsione');
    }
    clearSeed();
  }, [seedKey, byKey, eds, seriesIdx, clearSeed]);

  const sel = useMemo(() => keys.map((k) => byKey.get(k)).filter(Boolean).map((ed, i) => ({ ed, color: compareColor(i) })), [keys, byKey]);
  const add = (k) => setKeys((prev) => (prev.includes(k) || !byKey.has(k) ? prev : [...prev, k].slice(0, 8)));
  const remove = (k) => setKeys((prev) => prev.filter((x) => x !== k));
  const example = () => {
    const next = upcoming[0]?.ed || eds.filter((e) => e.over).slice(-1)[0];
    if (next) { setKeys([next.key, ...suggestFor(next, eds, seriesIdx)]); setView(next.over ? 'curve' : 'previsione'); }
  };
  const loadSeries = (s) => {
    // Nights on sale first: the forecast estimates them from the concluded ones
    const ordered = [...s.eds.filter((e) => !e.over), ...s.eds.filter((e) => e.over).reverse()].slice(0, 8);
    setKeys(ordered.map((e) => e.key));
    setView(ordered.some((e) => !e.over) ? 'previsione' : 'curve');
    setLoaded(s.name);
    setMsg(null);
  };
  const onSaveSeries = async (name) => {
    const ok = await saveSeries(name, sel.map((s) => s.ed));
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

  return (
    <div className="nx-compare">
      <Library eds={eds} selected={keys} onAdd={add} venueFilter={venueLabel} series={seriesList} onLoadSeries={loadSeries} onDeleteSeries={onDeleteSeries} />
      <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        <Panel title="Tavolo di confronto" hint="fino a 8 serate"
          actions={<>
            {sel.length > 1 && !naming && <button className="nx-btn" onClick={() => { setNaming(true); setMsg(null); }}>Salva come serie</button>}
            {sel.length > 0 && <button className="nx-btn" onClick={() => { setKeys([]); setLoaded(null); setNaming(false); }}>Svuota</button>}
            <button className="nx-btn" onClick={example}>Esempio</button>
          </>}>
          <div className={`nx-drop ${over ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.getData('text/plain')); }}>
            {sel.length === 0 && <span className="nx-hint">Trascina qui le serate dalla lista, o tocca + accanto a ognuna. Prova "Esempio": il prossimo evento con le serate che gli somigliano.</span>}
            {sel.map(({ ed, color }) => (
              <span key={ed.key} className="nx-pill">
                <span className="nx-swatch" style={{ background: color }} />
                <b>{ed.title.slice(0, 24)}</b> <span className="nx-flat">{dmy(ed.date)}{!ed.over && ' · in vendita'}</span>
                <button onClick={() => remove(ed.key)} aria-label={`Togli ${ed.title} ${dmy(ed.date)}`}>×</button>
              </span>
            ))}
          </div>
          {naming && sel.length > 1 && (
            <SaveSeries initial={loaded} names={seriesList.map((s) => s.name)} count={sel.length} onSave={onSaveSeries} onCancel={() => setNaming(false)} />
          )}
          {msg && <p className="nx-note" role="status">{msg}</p>}
        </Panel>
        {sel.length > 0 && (
          <Panel title="Risultato" actions={<Seg value={view} onChange={setView} label="Vista" options={[['curve', 'Curve'], ['numeri', 'Numeri'], ['pubblico', 'Pubblico in comune'], ['previsione', 'Previsione']]} />}>
            {view === 'curve' && <Curves sel={sel} now={now} windowDays={windowDays} setWindowDays={setWindowDays} />}
            {view === 'numeri' && <Numbers sel={sel} attendance={attendance} />}
            {view === 'pubblico' && <Overlap sel={sel} />}
            {view === 'previsione' && <Forecast sel={sel} records={records} now={now} upcoming={upcoming} windowDays={windowDays} setWindowDays={setWindowDays} />}
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
        <Seg value={mode} onChange={setMode} label="Confronta" options={[['tavolo', 'Tavolo di confronto'], ['tabelle', 'Generi, locali e brand']]} />
      </div>
      {mode === 'tavolo' ? <Tavolo ctx={ctx} /> : <Tabelle ctx={ctx} />}
    </>
  );
}
