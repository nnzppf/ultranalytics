import { useState, useEffect, useMemo, useRef } from 'react';
import { Seg, VenueDot, WindowSeg, daysAxis, dayTick, NoteEditor, AccuracyNote, ProjectionNote, CountEditor, Delta } from '../ui';
import { LineChart, StripPlot, TimeDots } from '../charts';
import { projectFromSet, lookupNight, typedCount } from '../model';
import { curveOf, groupCurve, checkpointsFor, suggestionsFor, expectedEntries, accuracyFor, likelyRange } from '../compare';
import { dayDiff } from '../../utils/eventTime';
import {
  KINDS, chipId, emptySet, chipCatalog, resolveSet, describeSet, setName, setStats, SCORE_ROWS, rowDiff,
  insights, setOverlap, setFlow, presets, encodeSets, decodeSets, readStoredSets,
} from '../sets';
import { fmt, pct, dmy, dshort, hm, pctChange } from '../format';

const STORE = 'nx_insiemi_v1';
const SIDES = ['A', 'B'];
const COLOR = { A: 'var(--nx-c1)', B: 'var(--nx-c2)' };
const VIEWS = [['breve', 'In breve'], ['curve', 'Curve'], ['serate', 'Serate'], ['pubblico', 'Pubblico'], ['previsione', 'Previsione']];
const KIND_SHORT = { brand: 'format', night: 'serata', venue: 'locale', genre: 'genere', dow: 'giorno', month: 'mese', season: 'stagione', category: 'categoria', series: 'serie' };
const HOUR_LABEL = { 12: '12', 15: '15', 18: '18', 21: '21', 24: '00', 27: '03' };
const HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
const other = (side) => (side === 'A' ? 'B' : 'A');

/**
 * A night on sale with a count typed in from the portal: its curve reaches that
 * count on the day it was typed (and stays there up to today).
 */
function curveNow(ed, axis, windowDays, now, typed) {
  const pts = curveOf(ed, axis, windowDays, now);
  if (!typed || ed.over || axis === 'ore' || axis === 'percentuale') return pts;
  const x = axis === 'apertura' ? (ed.firstReg ? dayDiff(ed.firstReg, typed.at) : null) : -Math.max(0, dayDiff(typed.at, ed.date));
  if (x == null) return pts;
  return pts.map((p) => (p.x === x || (p.x > x && p.y != null) ? { ...p, y: Math.max(p.y ?? 0, typed.value) } : p));
}

const readSets = () => { try { return readStoredSets(localStorage.getItem(STORE)); } catch { return { A: emptySet(), B: emptySet() }; } };

// ---------------------------------------------------------------- elements

/** An element: a grip to drag it (also by finger), a body to tap for A / B. */
function Chip({ chip, info, from, onDown, onTap, inA, inB, open, children, onRemove }) {
  return (
    <span className={`nx-el k-${chip.kind}${open ? ' open' : ''}${from !== 'palette' ? ' in-set' : ''}`}>
      <span className="grip" onPointerDown={(e) => onDown(e, chip, from, true)} title="Trascina" aria-hidden="true">⠿</span>
      <button className="body" onPointerDown={(e) => onDown(e, chip, from, false)} onClick={() => onTap(chip, from)}
        aria-label={`${info?.label ?? chip.value}${info?.sub ? ` ${info.sub}` : ''}, ${KIND_SHORT[chip.kind]}`}>
        {info?.venue && <VenueDot venue={info.venue} />}
        <span className="lab">{info?.label ?? String(chip.value)}{info?.sub && <span className="sub"> {info.sub}</span>}</span>
        <span className="kind">{KIND_SHORT[chip.kind]}{info && chip.kind !== 'night' ? ` · ${info.n}` : info && !info.over ? ' · in vendita' : ''}</span>
        {inA && <span className="tag" style={{ background: COLOR.A }}>A</span>}
        {inB && <span className="tag" style={{ background: COLOR.B }}>B</span>}
      </button>
      {onRemove && <button className="x" onClick={onRemove} aria-label={`Togli ${info?.label ?? chip.value}`}>×</button>}
      {open && <span className="menu">{children}</span>}
    </span>
  );
}

function Palette({ catalog, sets, onDown, onTap, menu, onAdd, onRemove, onDeleteSeries, venueLabel, sheet, onCloseSheet }) {
  const [kind, setKind] = useState('tutti');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);
  const needle = q.trim().toLowerCase();
  const inSet = (side, c) => sets[side].chips.some((x) => chipId(x) === chipId(c));
  const shown = useMemo(() => {
    let list = catalog;
    if (kind !== 'tutti') list = list.filter((c) => c.kind === kind);
    if (needle) list = list.filter((c) => `${c.label} ${c.sub || ''} ${KIND_SHORT[c.kind]}`.toLowerCase().includes(needle));
    else if (kind === 'tutti') {
      // Everything at once is too much: the latest nights only
      let nights = 0;
      list = list.filter((c) => c.kind !== 'night' || nights++ < 10);
    }
    return list;
  }, [catalog, kind, needle]);
  const groups = [];
  for (const c of shown) {
    if (!groups.length || groups[groups.length - 1][0] !== c.kind) groups.push([c.kind, []]);
    groups[groups.length - 1][1].push(c);
  }
  return (
    <section className={`nx-panel nx-palette${sheet ? ' sheet' : ''}`} data-drop="palette" style={sheet ? { '--set': COLOR[sheet] } : undefined}>
      {sheet ? (
        <div className="nx-ph"><h2>Aggiungi {sheet === 'A' ? 'ad' : 'a'} {sheet}</h2><span className="nx-hint">tocca gli elementi: entrano in {sheet} (di nuovo per toglierli)</span><span className="nx-spacer" /><button className="nx-btn primary" onClick={onCloseSheet}>Fatto</button></div>
      ) : (
        <div className="nx-ph"><h2>Elementi</h2><span className="nx-hint">{venueLabel} · trascina in A o in B, o tocca</span></div>
      )}
      <div className="nx-pb">
        <label className="nx-hint" htmlFor="nx-el-search">Cerca format, serata, locale, mese…</label>
        <input id="nx-el-search" className="nx-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="es. Atipico, sabato, ottobre" style={{ margin: '4px 0 8px' }} />
        <div className="nx-kinds" role="group" aria-label="Tipo di elemento">
          {[['tutti', 'Tutti'], ...KINDS].map(([k, label]) => (
            <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>
          ))}
        </div>
        {groups.map(([k, list]) => (
          <div key={k} className="nx-elgroup">
            <span className="nx-hint">{KINDS.find(([x]) => x === k)?.[1]}{k === 'night' && kind === 'tutti' && !needle ? ' · le ultime' : ''}</span>
            <div className="nx-els">
              {list.map((c) => {
                const id = chipId(c);
                const a = inSet('A', c), b = inSet('B', c);
                return (
                  <Chip key={id} chip={c} info={c} from="palette" onDown={onDown} inA={a} inB={b} open={!sheet && menu === id}
                    onTap={sheet ? () => ((sheet === 'A' ? a : b) ? onRemove(sheet, c) : onAdd(sheet, c)) : onTap}>
                    {SIDES.map((side) => ((side === 'A' ? a : b)
                      ? <button key={side} className="nx-btn" onClick={() => onRemove(side, c)}>togli da {side}</button>
                      : <button key={side} className="nx-btn" style={{ borderColor: COLOR[side], color: COLOR[side] }} onClick={() => onAdd(side, c)}>→ {side}</button>))}
                    {c.kind === 'series' && (confirm === c.value
                      ? <button className="nx-btn" onClick={() => { setConfirm(null); onDeleteSeries(c.value); }}>elimina la serie</button>
                      : <button className="nx-link" onClick={() => setConfirm(c.value)}>elimina…</button>)}
                  </Chip>
                );
              })}
            </div>
          </div>
        ))}
        {!shown.length && <p className="nx-empty">Nessun elemento trovato.</p>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- sets

function SaveAsSeries({ count, names, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const clean = name.trim();
  return (
    <form className="nx-saveseries" onSubmit={async (e) => { e.preventDefault(); if (!clean) return; setBusy(true); await onSave(clean); setBusy(false); }}>
      <label className="nx-hint" htmlFor="nx-set-series">Nome della serie ({count} serate). Le sue serate in vendita si confronteranno con le altre della serie.</label>
      <input id="nx-set-series" className="nx-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus list="nx-set-series-names" placeholder="es. Opening Too Late" />
      <datalist id="nx-set-series-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
      <button className="nx-btn primary" disabled={!clean || busy}>{busy ? 'Salvo…' : 'Salva serie'}</button>
      <button className="nx-link" type="button" onClick={onCancel}>annulla</button>
    </form>
  );
}

function SetZone({ side, set, res, name, catalog, over, onDown, onTap, onRemoveChip, onClear, onRestore, suggestions, onAddNights, seriesNames, onSaveSeries, onOpenSheet, sheetOpen, typedOf, onSaveCount }) {
  const [saving, setSaving] = useState(false);
  const info = (c) => catalog.find((x) => x.kind === c.kind && x.value === c.value);
  const onlyNights = set.chips.length > 1 && set.chips.every((c) => c.kind === 'night');
  const desc = describeSet(set, catalog);
  return (
    <section className={`nx-set${over || sheetOpen ? ' over' : ''}`} data-drop={side} style={{ '--set': COLOR[side] }}>
      <header>
        <span className="nx-setbadge">{side}</span>
        <b className="nx-setname">{set.chips.length ? name : 'vuoto'}</b>
        <span className="nx-spacer" />
        {set.chips.length > 0 && <button className="nx-link" onClick={onClear}>svuota</button>}
        <button className={`nx-btn nx-addbtn${sheetOpen ? ' on' : ''}`} onClick={onOpenSheet}>+ aggiungi</button>
      </header>
      <div className="nx-setchips">
        {set.chips.map((c) => (
          <Chip key={chipId(c)} chip={c} info={info(c)} from={side} onDown={onDown} onTap={() => {}} onRemove={() => onRemoveChip(c)} />
        ))}
        {!set.chips.length && <span className="nx-hint">Trascina qui format, serate, locali, generi, giorni, mesi o stagioni. Stesso tipo si somma, tipi diversi si restringono.</span>}
      </div>
      {desc && <p className="nx-setdesc">{desc}</p>}
      {set.chips.length > 0 && (
        <p className="nx-setcount">
          <b>{fmt(res.done.length)}</b> {res.done.length === 1 ? 'serata conclusa' : 'serate concluse'}
          {res.onSale.length > 0 && <> · <b>{res.onSale.length}</b> in vendita</>}
          {res.excludedCount > 0 && <> · {res.excludedCount} tolte <button className="nx-link" onClick={onRestore}>rimetti</button></>}
        </p>
      )}
      {res.onSale.length > 0 && res.onSale.length <= 4 && (
        <div className="nx-onsale">
          {res.onSale.map((e) => <CountEditor key={e.key} compact idSuffix={`-${side}`} item={{ ed: e, manual: typedOf(e) }} onSave={onSaveCount} />)}
        </div>
      )}
      {suggestions?.length > 0 && (
        <div className="nx-sugg">
          <span className="nx-hint">Suggeriti:</span>
          {suggestions.map((s) => <button key={s.id} onClick={() => onAddNights(s.keys)}>+ {s.label}{s.keys.length > 1 ? ` (${s.keys.length})` : ''}</button>)}
        </div>
      )}
      {onlyNights && !saving && <button className="nx-link" onClick={() => setSaving(true)}>salva queste serate come serie</button>}
      {saving && <SaveAsSeries count={set.chips.length} names={seriesNames} onCancel={() => setSaving(false)} onSave={async (n) => { await onSaveSeries(n); setSaving(false); }} />}
    </section>
  );
}

// ---------------------------------------------------------------- results

function fmtUnit(v, unit) {
  if (v == null) return '–';
  if (unit === 'n') return fmt(Math.round(v));
  if (unit === 'pt') return pct(v);
  if (unit === 'd') return `${fmt(v, v % 1 ? 1 : 0)} g`;
  return `${String(Math.round(v) % 24).padStart(2, '0')}:00`;
}

function Scorecard({ sa, sb }) {
  return (
    <div className="nx-tw">
      <table className="nx-score">
        <thead><tr><th /><th className="n" style={{ color: COLOR.A }}>A</th><th className="tug" /><th className="n" style={{ color: COLOR.B }}>B</th><th className="n">differenza</th></tr></thead>
        <tbody>
          {SCORE_ROWS.map(([key, label, unit]) => {
            const a = sa?.[key] ?? null, b = sb?.[key] ?? null;
            const d = rowDiff(a, b, unit);
            const bar = unit !== 'h' && a != null && b != null && a + b > 0;
            const higher = d == null || d === 0 ? null : d > 0 ? 'A' : 'B';
            let diffText = '–';
            if (d != null && d !== 0) {
              diffText = unit === 'n' ? `${higher} +${fmt(Math.round(higher === 'A' ? d : (b && a ? (100 * (b - a)) / a : -d)))}%`
                : unit === 'pt' ? `${higher} +${fmt(Math.abs(d), 1)} pt` : `${higher} +${fmt(Math.abs(d), Math.abs(d) % 1 ? 1 : 0)} g`;
            }
            return (
              <tr key={key}>
                <td className="nx-flat">{label}</td>
                <td className="n" style={higher === 'A' ? { fontWeight: 600, color: 'var(--nx-fg)' } : undefined}>{fmtUnit(a, unit)}</td>
                <td className="tug">{bar && (
                  <span className="nx-tug" aria-hidden="true">
                    <span style={{ width: `${(100 * a) / (a + b)}%`, background: COLOR.A, opacity: higher === 'B' ? 0.45 : 1 }} />
                    <span style={{ width: `${(100 * b) / (a + b)}%`, background: COLOR.B, opacity: higher === 'A' ? 0.45 : 1 }} />
                  </span>
                )}</td>
                <td className="n" style={higher === 'B' ? { fontWeight: 600, color: 'var(--nx-fg)' } : undefined}>{fmtUnit(b, unit)}</td>
                <td className="n" style={higher ? { color: COLOR[higher] } : undefined}>{diffText}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A night on sale against the other set's concluded nights at the same moment
 * before their event, as the tracker in Stasera does: registrations now (typed in
 * from the portal if newer than the export), the same point back then, the
 * difference, the curves and the estimate.
 */
function SamePoint({ target, side, refs, refSide, refName: setLabel, records, now, typed, accuracy, onSaveCount }) {
  // One reference night: call it by name ("l'opening del 18 ott 25"), not by the set's letter
  const refName = refs.length === 1 ? `${refs[0].title} (${dmy(refs[0].date)})` : setLabel;
  const p = projectFromSet(target, refs, records, now, typed);
  const proj = p.projection;
  const likely = proj ? likelyRange(accuracy, proj.value, p.pointDaysBefore) : null;
  const entries = expectedEntries(target, refs, p.reference, p.current, proj);
  const delta = p.avgAtSamePoint ? pctChange(p.current, p.avgAtSamePoint) : null;
  const when = p.pointDaysBefore === 0 ? 'il giorno dell\'evento' : `a ${p.pointDaysBefore} ${p.pointDaysBefore === 1 ? 'giorno' : 'giorni'} dall'evento`;
  // The window that frames today's point: 14 days close to the event, else 30 or 60
  const win = [14, 30, 60].find((d) => d >= p.pointDaysBefore + 3) || 60;
  const curves = refs.map((e) => curveOf(e, 'giorni', win, now));
  const few = refs.length <= 4;
  const comps = [...p.comps].sort((x, y) => y.ed.date - x.ed.date);
  const inWindow = p.pointDaysBefore <= win;
  return (
    <div className="nx-samepoint" style={{ '--set': COLOR[side] }}>
      <h3 className="nx-h3"><span className="nx-swatch" style={{ background: COLOR[side] }} /> {target.title} {dmy(target.date)} · {when}</h3>
      <p className="nx-insight" style={{ '--set': COLOR[delta == null || delta >= 0 ? side : refSide] }}>
        A questo punto {target.title} ha <b>{fmt(p.current)}</b> registrati{typed ? ` (a mano alle ${hm(typed.at)})` : ''}
        {delta == null
          ? <>, mentre {refName} allo stesso momento non ne aveva ancora.</>
          : delta === 0
            ? <>: esattamente come {refName} allo stesso momento.</>
            : <>: il <b>{Math.abs(delta)}% {delta > 0 ? 'in più' : 'in meno'}</b> di {refName} allo stesso momento ({fmt(p.avgAtSamePoint)}{refs.length > 1 ? ' in media' : ''}).</>}
      </p>
      <div className="nx-stats">
        <div className="nx-stat"><div className="v">{fmt(p.current)}</div><div className="l">registrati ora{typed ? ' · a mano' : ''}</div></div>
        <div className="nx-stat"><div className="v">{fmt(p.avgAtSamePoint)}</div><div className="l">{refSide} allo stesso punto{refs.length > 1 ? ` · media di ${refs.length}` : ''}</div></div>
        <div className="nx-stat"><div className="v">{delta != null ? <Delta value={delta} /> : '–'}</div><div className="l">differenza</div></div>
        <div className="nx-stat"><div className="v" style={{ color: 'var(--nx-proj)' }}>{proj ? `~${fmt(proj.value)}` : '–'}</div><div className="l">{proj ? `stima finale${likely ? ` · probabile ${fmt(likely.low)}–${fmt(likely.high)}` : ''}` : 'nessuna stima'}</div></div>
        {entries && <div className="nx-stat"><div className="v">~{fmt(entries.value ?? entries.sofar)}</div><div className="l">{entries.value != null ? 'ingressi stimati' : 'ingressi dai registrati di ora'}</div></div>}
      </div>
      <LineChart
        xs={daysAxis(win)} xLabel={dayTick(win)} xTitle={(x) => (x === 0 ? 'giorno dell\'evento' : `${-x} ${x === -1 ? 'giorno' : 'giorni'} prima`)} compare
        series={[
          { key: 't', color: COLOR[side], label: `${target.title} ${dmy(target.date)}`, width: 3, points: curveNow(target, 'giorni', win, now, typed) },
          ...(few
            ? refs.map((e, i) => ({ key: e.key, color: COLOR[refSide], label: `${e.title} ${dmy(e.date)}`, width: 1.8, dashed: i > 0, points: curves[i] }))
            : [{ key: 'med', color: COLOR[refSide], label: `${refSide} · mediana di ${refs.length}`, width: 2.2, points: groupCurve(curves) }]),
        ]}
        projection={proj && inWindow ? { x0: -p.pointDaysBefore, y0: p.current, x1: 0, y1: proj.value } : null}
        now={inWindow ? -p.pointDaysBefore : null} nowLabel={typed ? 'a mano' : 'dati'} height={220} width={760} yLabel="Allo stesso punto"
      />
      {!inWindow && <p className="nx-note">Mancano {p.pointDaysBefore} giorni: il grafico mostra gli ultimi 60.</p>}
      <div className="nx-tw">
        <table>
          <thead><tr><th>serata di {refSide}</th><th className="n">a questo punto</th><th className="n">a fine serata</th><th className="n">conversione</th></tr></thead>
          <tbody>
            {comps.slice(0, 6).map((c) => (
              <tr key={c.ed.key}>
                <td className="nx-name">{c.ed.title} · {dmy(c.ed.date)}</td>
                <td className="n"><b>{fmt(c.atSamePointAdjusted)}</b></td>
                <td className="n">{fmt(c.totalFinal)}</td>
                <td className="n">{pct(c.ed.conv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nx-note"><ProjectionNote p={proj} likely={likely} /></p>
      <CountEditor idSuffix={`-sp-${side}`} item={{ ed: target, manual: typed }} onSave={onSaveCount} />
    </div>
  );
}

function Brief({ A, B, sa, sb, nameA, nameB, records, now, typedOf, accuracy, onSaveCount }) {
  const found = useMemo(() => insights(sa, sb, nameA, nameB), [sa, sb, nameA, nameB]);
  const overlap = useMemo(() => (sa && sb ? setOverlap(A.done, B.done, true) : null), [A, B, sa, sb]);
  // Nights on sale against the other set's concluded nights, at the same point
  const live = [
    ...A.onSale.slice(0, 2).map((t) => ({ t, side: 'A', refs: B.done, refSide: 'B', refName: nameB })),
    ...B.onSale.slice(0, 2).map((t) => ({ t, side: 'B', refs: A.done, refSide: 'A', refName: nameA })),
  ].filter((x) => x.refs.length);
  if (!sa && !sb && !live.length) {
    return <p className="nx-empty">Metti in A una serata in vendita e in B le serate con cui confrontarla (come l'opening dell'anno scorso), oppure serate concluse in tutti e due.</p>;
  }
  const few = SIDES.filter((s) => (s === 'A' ? A : B).done.length > 0 && (s === 'A' ? A : B).done.length < 3);
  const onlySale = SIDES.find((s) => !(s === 'A' ? sa : sb) && (s === 'A' ? A : B).onSale.length);
  return (
    <>
      {live.map((x) => (
        <SamePoint key={`${x.side}-${x.t.key}`} target={x.t} side={x.side} refs={x.refs} refSide={x.refSide} refName={x.refName}
          records={records} now={now} typed={typedOf(x.t)} accuracy={accuracy} onSaveCount={onSaveCount} />
      ))}
      {(sa || sb) && (
        <>
          {live.length > 0 && <h3 className="nx-h3">Le serate concluse a confronto</h3>}
          {sa && sb ? (
            <div className="nx-insights">
              {found.map((f) => <p key={f.key} className="nx-insight" style={{ '--set': COLOR[f.side] }}>{f.text}</p>)}
              {overlap && <p className="nx-insight neutral">Il <b>{fmt(overlap.pctOfA, 0)}%</b> di chi è entrato in A è entrato anche in B ({fmt(overlap.both)} persone); viceversa il {fmt(overlap.pctOfB, 0)}%.</p>}
              {!found.length && <p className="nx-insight neutral">Nessuna differenza grande: A e B si comportano in modo simile.</p>}
            </div>
          ) : onlySale ? (
            <p className="nx-note">{onlySale} ha solo serate in vendita: il confronto allo stesso punto è qui sopra. Sotto, i numeri delle serate concluse di {other(onlySale)}.</p>
          ) : <p className="nx-note">Metti qualcosa anche in {sa ? 'B' : 'A'} per vedere cosa cambia. Intanto ecco i numeri di {sa ? 'A' : 'B'}.</p>}
          {few.length > 0 && sa && sb && <p className="nx-note"><span className="nx-tag warn">pochi dati</span> {few.map((s) => `${s} ha solo ${(s === 'A' ? A : B).done.length} ${(s === 'A' ? A : B).done.length === 1 ? 'serata' : 'serate'}`).join(', ')}: le differenze possono essere casuali.</p>}
          <Scorecard sa={sa} sb={sb} />
          <p className="nx-note">Medie per serata delle serate concluse (conversione sul totale dei registrati delle serate con ingressi). La barra mostra chi pesa di più tra A e B.</p>
        </>
      )}
    </>
  );
}

function axisSetup(axis, windowDays) {
  if (axis === 'ore') return { xs: HOURS, xLabel: (x) => HOUR_LABEL[x] || '', xTitle: (x) => `fino alle ${String(x % 24).padStart(2, '0')}:00`, tick: (x) => `${String(x % 24).padStart(2, '0')}:00` };
  if (axis === 'apertura') {
    const step = windowDays > 30 ? 14 : 7;
    return { xs: Array.from({ length: windowDays + 1 }, (_, i) => i), xLabel: (x) => (x === 0 ? 'apertura' : x % step === 0 ? `+${x} g` : ''), xTitle: (x) => (x === 0 ? 'giorno di apertura' : `${x} giorni dopo l'apertura`), tick: (x) => `+${x} g` };
  }
  return { xs: daysAxis(windowDays), xLabel: dayTick(windowDays), xTitle: (x) => (x === 0 ? 'giorno dell\'evento' : `${-x} ${x === -1 ? 'giorno' : 'giorni'} prima`), tick: (x) => (x === 0 ? 'evento' : `${x} g`) };
}

function SetCurves({ A, B, nameA, nameB, now, windowDays, setWindowDays, typedOf }) {
  const [axis, setAxis] = useState('giorni');
  const { xs, xLabel, xTitle, tick } = axisSetup(axis, windowDays);
  const yFormat = axis === 'percentuale' ? (v) => `${fmt(v, 0)}%` : (v) => fmt(v);
  const lines = [];
  const medians = [];
  for (const [side, res, name] of [['A', A, nameA], ['B', B, nameB]]) {
    if (!res.done.length) continue;
    const curves = res.done.map((e) => curveOf(e, axis, windowDays, now));
    const med = { key: `med-${side}`, side, color: COLOR[side], label: `${side} · ${name} (mediana di ${res.done.length})`, width: 2.6, points: groupCurve(curves) };
    medians.push(med);
    if (res.done.length <= 12) res.done.forEach((e, i) => lines.push({ key: `${side}-${e.key}`, color: COLOR[side], width: 1, opacity: 0.28, tip: false, points: curves[i] }));
    if (axis !== 'percentuale') res.onSale.forEach((e) => lines.push({ key: `sale-${side}-${e.key}`, color: COLOR[side], width: 3, dashed: true, label: `${e.title} ${dmy(e.date)} · in vendita${typedOf(e) ? ' (a mano)' : ''}`, points: curveNow(e, axis, windowDays, now, typedOf(e)) }));
  }
  const series = [...medians, ...lines.filter((l) => l.tip === false), ...lines.filter((l) => l.tip !== false)];
  const points = checkpointsFor(axis, windowDays);
  const rows = [...medians, ...lines.filter((l) => l.tip !== false)];
  const at = (s, x) => s.points.find((p) => p.x === x)?.y ?? null;
  return (
    <>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Seg value={axis} onChange={setAxis} label="Asse" options={[['giorni', 'giorni all\'evento'], ['apertura', 'dall\'apertura'], ['percentuale', '% del finale'], ['ore', 'ore della serata']]} />
        {axis !== 'ore' && <WindowSeg value={windowDays} onChange={setWindowDays} />}
      </div>
      {medians.length ? (
        <LineChart xs={xs} xLabel={xLabel} xTitle={xTitle} yFormat={yFormat} compare series={series} yLabel="A contro B" height={250} width={760} />
      ) : <p className="nx-empty">Servono serate concluse in A o in B.</p>}
      <p className="nx-note">Linea piena: la serata tipica (mediana) di ogni insieme, con la fascia min–max; in trasparenza le singole serate; tratteggiate le serate in vendita. Tocca il grafico per i numeri.</p>
      {rows.length > 0 && (
        <div className="nx-tw">
          <table className="nx-tappe">
            <thead><tr><th />{points.map((x) => <th key={x} className="n">{tick(x)}</th>)}</tr></thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={s.key}>
                  <td className="nx-name"><span className="nx-swatch" style={{ background: s.color }} /> {s.label}</td>
                  {points.map((x) => {
                    const v = at(s, x), base = i > 0 ? at(rows[0], x) : null;
                    return <td key={x} className="n">{v == null ? '–' : yFormat(v)}{base && v != null ? <span className="nx-subline" style={{ color: pctChange(v, base) > 0 ? 'var(--nx-good)' : 'var(--nx-bad)' }}>{pctChange(v, base) > 0 ? '+' : ''}{fmt(pctChange(v, base))}%</span> : null}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const NIGHT_METRICS = [['reg', 'registrati', (e, typed) => typed?.value ?? e.reg, (v) => fmt(v)], ['ent', 'ingressi', (e) => (e.hasScans ? e.ent : null), (v) => fmt(v)], ['conv', 'conversione', (e) => e.conv, (v) => `${fmt(v, 0)}%`]];

function Nights({ A, B, nameA, nameB, onExclude, onRestoreOne, sets, notes, saveNote, typedOf, onSaveCount }) {
  const [metric, setMetric] = useState('reg');
  const [picked, setPicked] = useState(null);
  const [, label, get, format] = NIGHT_METRICS.find(([k]) => k === metric);
  const point = (e) => ({ key: e.key, v: get(e, e.over ? null : typedOf(e)), title: `${e.title} ${dmy(e.date)}${e.over ? '' : ' (in vendita)'}` });
  const rows = [['A', A, nameA], ['B', B, nameB]].filter(([, r]) => r.nights.length).map(([side, r, name]) => ({ id: side, label: `${side} · ${name}`, color: COLOR[side], points: r.nights.map(point) }));
  const timeline = [['A', A], ['B', B]].flatMap(([side, r]) => r.nights.map((e) => ({ ...point(e), id: e.key, date: e.date, color: COLOR[side], key: `${side}:${e.key}` })));
  const all = new Map([...A.nights, ...B.nights].map((e) => [e.key, e]));
  const pickedEd = picked ? all.get(picked) : null;
  const sidesOf = (key) => SIDES.filter((s) => (s === 'A' ? A : B).nights.some((e) => e.key === key));
  return (
    <>
      <div style={{ marginBottom: 8 }}><Seg value={metric} onChange={setMetric} label="Valore" options={NIGHT_METRICS.map(([k, l]) => [k, l])} /></div>
      {rows.length ? <StripPlot rows={rows} format={format} onPick={setPicked} picked={picked} /> : <p className="nx-empty">Gli insiemi sono vuoti.</p>}
      <p className="nx-note">Ogni punto è una serata ({label}); la stanghetta è la mediana. Tocca un punto per vederla e, se non c'entra, toglierla dall'insieme.</p>
      {pickedEd && (
        <div className="nx-nightcard">
          <b>{pickedEd.title}</b> <span className="nx-flat">{dshort(pickedEd.date)} {pickedEd.date.getFullYear()} · {pickedEd.venue}{pickedEd.seasonNo ? ` · ${pickedEd.seasonNo}ª della stagione ${pickedEd.season}` : ''}</span>
          <div className="nx-nightnums">
            <span><b>{fmt(pickedEd.reg)}</b> registrati</span>
            <span><b>{pickedEd.hasScans ? fmt(pickedEd.ent) : 'n.d.'}</b> ingressi</span>
            <span><b>{pct(pickedEd.conv)}</b> conversione</span>
            {!pickedEd.over && <span className="nx-tag">in vendita</span>}
          </div>
          {!pickedEd.over && <CountEditor idSuffix="-card" item={{ ed: pickedEd, manual: typedOf(pickedEd) }} onSave={onSaveCount} />}
          <NoteEditor note={lookupNight(notes, pickedEd)} onSave={(t) => saveNote(pickedEd, t)} />
          <span className="nx-formacts" style={{ marginTop: 6 }}>
            {sidesOf(pickedEd.key).map((s) => <button key={s} className="nx-btn" onClick={() => { onExclude(s, pickedEd.key); setPicked(null); }}>Togli da {s}</button>)}
            <button className="nx-link" onClick={() => setPicked(null)}>chiudi</button>
          </span>
        </div>
      )}
      {timeline.length > 1 && (
        <>
          <h3 className="nx-h3">Nel tempo</h3>
          <TimeDots points={timeline} format={format} onPick={setPicked} picked={picked} />
        </>
      )}
      {SIDES.map((s) => sets[s].excluded.length > 0 && (
        <p key={s} className="nx-note">Tolte da {s}: {sets[s].excluded.map((k) => {
          const e = all.get(k) || null;
          return <span key={k} className="nx-flowtag">{e ? `${e.title} ${dmy(e.date)}` : k} <button className="nx-link" onClick={() => onRestoreOne(s, k)}>rimetti</button></span>;
        })}</p>
      ))}
    </>
  );
}

function Audience({ A, B, sa, sb, nameA, nameB, eds, now }) {
  const [who, setWho] = useState('entrati');
  const ov = useMemo(() => (A.done.length && B.done.length ? setOverlap(A.done, B.done, who === 'entrati') : null), [A, B, who]);
  const flows = useMemo(() => [['A', A], ['B', B]].map(([s, r]) => [s, setFlow(r.done, eds, now)]).filter(([, f]) => f), [A, B, eds, now]);
  const comp = [['under18', 'Sotto 18'], ['age18to24', '18–24'], ['over25', '25 e più'], ['female', 'Donne'], ['returning', 'Già venuti prima'], ['back30', 'Tornati entro 30 g']];
  const total = ov ? ov.onlyA + ov.both + ov.onlyB : 0;
  return (
    <>
      <div style={{ marginBottom: 8 }}><Seg value={who} onChange={setWho} label="Chi contare" options={[['entrati', 'entrati'], ['registrati', 'registrati']]} /></div>
      {ov ? (
        <>
          <div className="nx-venn" aria-label="Persone solo di A, in comune, solo di B">
            <span style={{ width: `${(100 * ov.onlyA) / total}%`, background: COLOR.A }} title={`solo A: ${ov.onlyA}`} />
            <span style={{ width: `${(100 * ov.both) / total}%` }} className="both" title={`in comune: ${ov.both}`} />
            <span style={{ width: `${(100 * ov.onlyB) / total}%`, background: COLOR.B }} title={`solo B: ${ov.onlyB}`} />
          </div>
          <div className="nx-vennlegend">
            <span><b style={{ color: COLOR.A }}>{fmt(ov.onlyA)}</b> solo in A</span>
            <span><b>{fmt(ov.both)}</b> in tutti e due</span>
            <span><b style={{ color: COLOR.B }}>{fmt(ov.onlyB)}</b> solo in B</span>
          </div>
          <p className="nx-note">Il {fmt(ov.pctOfA, 0)}% delle persone {who} in A ({nameA}) lo è anche in B; il {fmt(ov.pctOfB, 0)}% di quelle di B ({nameB}) anche in A. Poco in comune: pubblici diversi, le serate non si rubano gente.</p>
        </>
      ) : <p className="nx-empty">Servono serate concluse in tutti e due gli insiemi per vedere le persone in comune.</p>}
      {(sa || sb) && (
        <>
          <h3 className="nx-h3">Chi sono</h3>
          <div className="nx-comp">
            {comp.map(([k, label]) => (
              <div key={k} className="nx-comprow">
                <span className="nx-flat">{label}</span>
                {SIDES.map((s) => {
                  const v = (s === 'A' ? sa : sb)?.[k];
                  return <span key={s} className="nx-compbar"><span style={{ width: `${v ?? 0}%`, background: COLOR[s] }} /><b>{pct(v)}</b></span>;
                })}
              </div>
            ))}
          </div>
        </>
      )}
      {flows.length > 0 && (
        <>
          <h3 className="nx-h3">Dove va dopo</h3>
          <div className="nx-tw">
            <table>
              <thead><tr><th>insieme</th><th className="n">entrati</th><th className="n">rientrati entro 60 g</th><th>a quali brand</th></tr></thead>
              <tbody>
                {flows.map(([s, f]) => (
                  <tr key={s}>
                    <td className="nx-name"><span className="nx-swatch" style={{ background: COLOR[s] }} /> {s} · {s === 'A' ? nameA : nameB}</td>
                    <td className="n">{fmt(f.people)}</td>
                    <td className="n">{fmt(f.backPct, 0)}%{!f.complete && <span className="nx-subline">60 giorni non ancora passati</span>}</td>
                    <td>{f.top.length ? f.top.map((b) => <span key={b.brand} className="nx-flowtag"><VenueDot venue={b.venue} /> {b.brand} <b>{fmt(b.pct, 0)}%</b></span>) : <span className="nx-flat">nessuno</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function Forecast({ A, B, records, now, windowDays, setWindowDays, accuracy, upcoming, typedOf, onSaveCount }) {
  const targetsA = A.onSale, targetsB = B.onSale;
  const side = targetsA.length ? 'A' : targetsB.length ? 'B' : null;
  const targets = side === 'A' ? targetsA : targetsB;
  const [targetKey, setTargetKey] = useState(null);
  const target = targets.find((t) => t.key === targetKey) || targets[0];
  const refSide = side && (side === 'A' ? B : A).done.length ? other(side) : side;
  const refs = useMemo(() => (refSide ? (refSide === 'A' ? A : B).done.filter((e) => !target || e.key !== target.key) : []), [refSide, A, B, target]);
  const typed = target ? typedOf(target) : null;
  const p = useMemo(() => (target && refs.length ? projectFromSet(target, refs, records, now, typed) : null), [target, refs, records, now, typed]);
  if (!side) return <p className="nx-empty">Metti in A una serata in vendita (dalla lista "Serate") e in B le serate con cui stimarla: format, serie, stagione…</p>;
  if (!refs.length) return <p className="nx-empty">Metti in {other(side)} le serate concluse con cui stimare {target.title}.</p>;
  const proj = p.projection;
  const entries = expectedEntries(target, refs, p.reference, p.current, proj);
  const likely = proj ? likelyRange(accuracy, proj.value, p.pointDaysBefore) : null;
  const acc = proj ? accuracyFor(accuracy, null, p.pointDaysBefore) : null;
  const tracked = upcoming.find((u) => u.ed.key === target.key);
  const curves = refs.map((e) => curveOf(e, 'giorni', windowDays, now));
  return (
    <>
      {targets.length > 1 && <div style={{ marginBottom: 8 }}><Seg value={target.key} onChange={setTargetKey} label="Serata da stimare" options={targets.map((t) => [t.key, `${t.title} ${dmy(t.date)}`])} /></div>}
      <div className="nx-stats">
        <div className="nx-stat"><div className="v">{fmt(p.current)}</div><div className="l">{target.title} · a {p.pointDaysBefore} giorni{typed ? ' · a mano' : ''}</div></div>
        <div className="nx-stat"><div className="v">{fmt(p.avgAtSamePoint)}</div><div className="l">media di {refSide} allo stesso punto ({refs.length} serate)</div></div>
        <div className="nx-stat"><div className="v" style={{ color: 'var(--nx-proj)' }}>{proj ? `~${fmt(proj.value)}` : '–'}</div><div className="l">{proj ? `registrati a fine serata${likely ? ` · probabile ${fmt(likely.low)}–${fmt(likely.high)}` : ''}${proj.reliable ? '' : ' · incerta'}` : 'nessuna stima'}</div></div>
        {entries && <div className="nx-stat"><div className="v">~{fmt(entries.value ?? entries.sofar)}</div><div className="l">{entries.value != null ? 'ingressi stimati' : 'ingressi dai registrati di oggi'}</div></div>}
        {tracked?.tracker.projection && tracked.tracker.projection.value !== proj?.value && <div className="nx-stat"><div className="v nx-flat">~{fmt(tracked.tracker.projection.value)}</div><div className="l">stima del tracker ({tracked.series ? `serie ${tracked.series}` : 'brand'})</div></div>}
      </div>
      <CountEditor idSuffix="-forecast" item={{ ed: target, manual: typed }} onSave={onSaveCount} />
      <div style={{ marginBottom: 6 }}><WindowSeg value={windowDays} onChange={setWindowDays} /></div>
      <LineChart
        xs={daysAxis(windowDays)} xLabel={dayTick(windowDays)} xTitle={(x) => (x === 0 ? 'giorno dell\'evento' : `${-x} giorni prima`)} compare
        series={[
          { key: 't', color: COLOR[side], label: `${target.title} ${dmy(target.date)}`, width: 3, points: curveNow(target, 'giorni', windowDays, now, typed) },
          { key: 'refs', color: COLOR[refSide], label: `${refSide} · mediana di ${refs.length}`, width: 2.2, dashed: true, points: groupCurve(curves) },
          ...(refs.length <= 12 ? refs.map((e, i) => ({ key: e.key, color: COLOR[refSide], width: 1, opacity: 0.28, tip: false, points: curves[i] })) : []),
        ]}
        projection={proj && p.pointDaysBefore <= windowDays ? { x0: -p.pointDaysBefore, y0: p.current, x1: 0, y1: proj.value } : null}
        now={p.pointDaysBefore <= windowDays ? -p.pointDaysBefore : null} nowLabel={typed ? 'a mano' : 'dati'} height={250} width={760} yLabel="Previsione"
      />
      <p className="nx-note">
        <ProjectionNote p={proj} likely={likely} />
        {acc && <AccuracyNote accuracy={acc} />}
        {entries && <>Ingressi: chi si è registrato finora entra di solito al {fmt(entries.early, 0)}%, chi si registra da qui in poi al {fmt(entries.late, 0)}%.</>}
      </p>
      <div className="nx-tw">
        <table>
          <thead><tr><th>serata di riferimento</th><th className="n">allo stesso punto</th><th className="n">finale</th><th className="n">conversione</th></tr></thead>
          <tbody>
            {p.comps.map((c) => (
              <tr key={c.ed.key}><td className="nx-name">{c.ed.title} · {dmy(c.ed.date)}</td><td className="n">{fmt(c.atSamePointAdjusted)}</td><td className="n">{fmt(c.totalFinal)}</td><td className="n">{pct(c.ed.conv)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- page

/**
 * Comparison by two sets, A against B. Elements (format, night, venue, genre,
 * weekday, month, season, category, series) are dragged in and out — by mouse
 * anywhere on them, by finger from their grip — or tapped and sent to A or B.
 */
export default function Insiemi({ ctx }) {
  const { eds, records, now, attendance, upcoming, seedKey, clearSeed, venueLabel, windowDays, setWindowDays, seriesIdx, saveSeries, deleteSeries, accuracy, notes, saveNote, counts, saveCount, dataAsOf } = ctx;
  // Count typed in from the portal for a night on sale, when newer than the export
  const typedOf = (ed) => typedCount(counts, ed, dataAsOf);
  const [sets, setSets] = useState(readSets);
  const [view, setView] = useState('breve');
  const [menu, setMenu] = useState(null);
  const [sheet, setSheet] = useState(null); // set the palette adds to on a tap
  const [drag, setDrag] = useState(null);
  const [msg, setMsg] = useState(null);
  const [shareUrl, setShareUrl] = useState(null);
  const pending = useRef(null);
  const suppressTap = useRef(false);
  const dropRef = useRef(null);

  const catalog = useMemo(() => chipCatalog(eds, seriesIdx), [eds, seriesIdx]);
  const A = useMemo(() => resolveSet(sets.A, eds, seriesIdx), [sets.A, eds, seriesIdx]);
  const B = useMemo(() => resolveSet(sets.B, eds, seriesIdx), [sets.B, eds, seriesIdx]);
  const sa = useMemo(() => setStats(A.done, attendance, now), [A, attendance, now]);
  const sb = useMemo(() => setStats(B.done, attendance, now), [B, attendance, now]);
  const nameA = setName(sets.A, catalog, 'A');
  const nameB = setName(sets.B, catalog, 'B');
  const ready = presets(eds, catalog, upcoming, seriesIdx);

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(sets)); } catch { /* no storage */ } }, [sets]);

  // Opened from a link or from a tracker: "#confronta/insiemi:{…}" or "#confronta/<night>"
  useEffect(() => {
    if (!seedKey) return;
    const shared = decodeSets(seedKey);
    if (shared) {
      setSets({ A: shared.A, B: shared.B });
      if (VIEWS.some(([v]) => v === shared.view)) setView(shared.view);
    } else {
      const ed = eds.find((e) => e.key === seedKey);
      if (ed) {
        const series = seriesIdx?.ofEdition.get(ed.key);
        setSets({ A: { chips: [{ kind: 'night', value: ed.key }], excluded: [] }, B: { chips: [series ? { kind: 'series', value: series } : { kind: 'brand', value: ed.brand }], excluded: [ed.key] } });
        setView(ed.over ? 'breve' : 'previsione');
      }
    }
    clearSeed();
  }, [seedKey, eds, seriesIdx, clearSeed]);

  const update = (side, fn) => setSets((s) => ({ ...s, [side]: fn(s[side]) }));
  const addChip = (side, chip) => update(side, (st) => (st.chips.some((c) => chipId(c) === chipId(chip)) ? st : { ...st, chips: [...st.chips, { kind: chip.kind, value: chip.value }] }));
  const removeChip = (side, chip) => update(side, (st) => ({ ...st, chips: st.chips.filter((c) => chipId(c) !== chipId(chip)) }));
  const exclude = (side, key) => update(side, (st) => (st.chips.some((c) => c.kind === 'night' && c.value === key)
    ? { ...st, chips: st.chips.filter((c) => !(c.kind === 'night' && c.value === key)) }
    : { ...st, excluded: [...new Set([...st.excluded, key])] }));
  const restoreOne = (side, key) => update(side, (st) => ({ ...st, excluded: st.excluded.filter((k) => k !== key) }));
  const addNights = (side, keys) => update(side, (st) => ({ ...st, chips: [...st.chips, ...keys.filter((k) => !st.chips.some((c) => c.kind === 'night' && c.value === k)).map((k) => ({ kind: 'night', value: k }))] }));

  dropRef.current = (chip, from, to) => {
    if (to === 'A' || to === 'B') {
      if (from === to) return;
      addChip(to, chip);
      if (from === 'A' || from === 'B') removeChip(from, chip);
    } else if (from === 'A' || from === 'B') {
      removeChip(from, chip); // dragged out of the set
    }
  };

  // Dragging with pointer events: works with mouse, pen and finger (from the grip)
  useEffect(() => {
    const zoneAt = (x, y) => document.elementFromPoint(x, y)?.closest('[data-drop]')?.getAttribute('data-drop') || null;
    const move = (ev) => {
      const p = pending.current;
      if (!p) return;
      if (!p.started) {
        if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < 6) return;
        p.started = true;
        setMenu(null);
      }
      setDrag({ chip: p.chip, from: p.from, x: ev.clientX, y: ev.clientY, over: zoneAt(ev.clientX, ev.clientY) });
    };
    const up = (ev) => {
      const p = pending.current;
      pending.current = null;
      if (!p || !p.started) return;
      // the click that follows this pointerup is not a tap
      suppressTap.current = true;
      setTimeout(() => { suppressTap.current = false; }, 0);
      setDrag(null);
      dropRef.current(p.chip, p.from, zoneAt(ev.clientX, ev.clientY));
    };
    const cancel = () => { pending.current = null; setDrag(null); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, []);

  const onDown = (ev, chip, from, viaGrip) => {
    if (ev.button > 0) return;
    if (ev.pointerType === 'touch' && !viaGrip) return; // a finger on the body scrolls or taps
    if (ev.pointerType !== 'touch') ev.preventDefault(); // no text selection while dragging
    pending.current = { chip, from, x: ev.clientX, y: ev.clientY, started: false };
  };
  const onTap = (chip) => {
    if (suppressTap.current) return;
    setMenu((m) => (m === chipId(chip) ? null : chipId(chip)));
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#confronta/${encodeURIComponent(encodeSets(sets.A, sets.B, view))}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareUrl(null);
      setMsg('Link copiato: chi lo apre (con un account abilitato) vede questo confronto.');
    } catch {
      setShareUrl(url);
    }
  };
  const saveSide = (side) => async (name) => {
    const nights = (side === 'A' ? A : B).nights;
    const ok = await saveSeries(name, nights);
    setMsg(ok ? `Serie «${name}» salvata: la trovi tra gli elementi (Serie) e il tracker la usa per le sue serate in vendita.` : 'Salvataggio non riuscito: riprova.');
  };
  const onDeleteSeries = async (name) => {
    const ok = await deleteSeries(name);
    if (ok) for (const s of SIDES) removeChip(s, { kind: 'series', value: name });
    setMsg(ok ? `Serie «${name}» eliminata.` : 'Eliminazione non riuscita: riprova.');
  };
  const singleNight = sets.A.chips.length === 1 && sets.A.chips[0].kind === 'night' ? eds.find((e) => e.key === sets.A.chips[0].value) : null;
  const suggB = useMemo(() => (singleNight ? suggestionsFor(singleNight, eds, seriesIdx).filter((s) => s.keys.some((k) => !sets.B.chips.some((c) => c.value === k))) : []), [singleNight, eds, seriesIdx, sets.B]);
  const empty = !sets.A.chips.length && !sets.B.chips.length;
  const dragInfo = drag && catalog.find((c) => c.kind === drag.chip.kind && c.value === drag.chip.value);
  const seriesNames = (seriesIdx?.list || []).map((s) => s.name);

  return (
    <div className="nx-setspage">
      {sheet && <div className="nx-sheetback" onClick={() => setSheet(null)} aria-hidden="true" />}
      <Palette catalog={catalog} sets={sets} onDown={onDown} onTap={onTap} menu={menu} venueLabel={venueLabel} sheet={sheet} onCloseSheet={() => setSheet(null)}
        onAdd={(side, c) => { addChip(side, c); setMenu(null); }} onRemove={(side, c) => { removeChip(side, c); setMenu(null); }} onDeleteSeries={onDeleteSeries} />
      <div className="nx-versus">
        {SIDES.map((side) => (
          <SetZone key={side} side={side} set={sets[side]} res={side === 'A' ? A : B} name={side === 'A' ? nameA : nameB} catalog={catalog}
            over={drag?.over === side} onDown={onDown} onTap={onTap}
            onRemoveChip={(c) => removeChip(side, c)} onClear={() => setSets((s) => ({ ...s, [side]: emptySet() }))}
            onRestore={() => update(side, (st) => ({ ...st, excluded: [] }))}
            suggestions={side === 'B' ? suggB : null} onAddNights={(keys) => addNights('B', keys)}
            seriesNames={seriesNames} onSaveSeries={saveSide(side)}
            sheetOpen={sheet === side} onOpenSheet={() => { setSheet(sheet === side ? null : side); setMenu(null); }}
            typedOf={typedOf} onSaveCount={saveCount} />
        ))}
        <div className="nx-vs">
          <span>contro</span>
          <button className="nx-btn" onClick={() => setSets((s) => ({ A: s.B, B: s.A }))} aria-label="Scambia A e B" title="Scambia A e B">⇄</button>
        </div>
      </div>
      <div className="nx-setsbar">
        <div className="nx-setsbar-row">
          {ready.length > 0 && (() => {
            const buttons = ready.map((p) => <button key={p.id} onClick={() => { setSets({ A: { chips: p.A, excluded: [] }, B: { chips: p.B, excluded: p.id === 'next' ? [p.A[0].value] : [] } }); setView(p.view || 'breve'); setMsg(null); }}>{p.label}</button>);
            // Once the sets are filled the ready-made questions fold away
            return empty
              ? <div className="nx-sugg"><span className="nx-hint">Per partire:</span>{buttons}</div>
              : <details className="nx-presets"><summary>Domande pronte</summary><div className="nx-sugg">{buttons}</div></details>;
          })()}
          <span className="nx-spacer" />
          {!empty && <button className="nx-btn" onClick={copyLink}>Copia link</button>}
          {!empty && <button className="nx-btn" onClick={() => { setSets({ A: emptySet(), B: emptySet() }); setMsg(null); }}>Svuota</button>}
        </div>
        {shareUrl && (
          <div className="nx-saveseries">
            <label className="nx-hint" htmlFor="nx-share-sets">Copia questo link (il telefono non ha permesso di copiarlo da solo):</label>
            <input id="nx-share-sets" className="nx-input" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          </div>
        )}
        {msg && <p className="nx-note" role="status">{msg}</p>}
      </div>
      <div className="nx-setsres">
        {!empty ? (
          <section className="nx-panel">
            <div className="nx-ph"><h2>A contro B</h2><span className="nx-spacer" /><Seg value={view} onChange={setView} label="Vista" options={VIEWS} /></div>
            <div className="nx-pb">
              {view === 'breve' && <Brief A={A} B={B} sa={sa} sb={sb} nameA={nameA} nameB={nameB} records={records} now={now} typedOf={typedOf} accuracy={accuracy} onSaveCount={saveCount} />}
              {view === 'curve' && <SetCurves A={A} B={B} nameA={nameA} nameB={nameB} now={now} windowDays={windowDays} setWindowDays={setWindowDays} typedOf={typedOf} />}
              {view === 'serate' && <Nights A={A} B={B} nameA={nameA} nameB={nameB} sets={sets} onExclude={exclude} onRestoreOne={restoreOne} notes={notes} saveNote={saveNote} typedOf={typedOf} onSaveCount={saveCount} />}
              {view === 'pubblico' && <Audience A={A} B={B} sa={sa} sb={sb} nameA={nameA} nameB={nameB} eds={eds} now={now} />}
              {view === 'previsione' && <Forecast A={A} B={B} records={records} now={now} windowDays={windowDays} setWindowDays={setWindowDays} accuracy={accuracy} upcoming={upcoming} typedOf={typedOf} onSaveCount={saveCount} />}
            </div>
          </section>
        ) : (
          <div className="nx-setshelp">
            <p><b>Come funziona.</b> Trascina gli elementi dentro A e dentro B, o toccali e scegli A o B. Dentro un insieme, elementi dello stesso tipo si sommano ("Atipico" + "Ultravivid" = le serate dell'uno o dell'altro), tipi diversi si restringono ("TooLate" + "sabato" = le serate di sabato a TooLate). Le serate singole si aggiungono sempre.</p>
            <p>Trascina un elemento fuori da un insieme per toglierlo, o da A a B per spostarlo. Dal telefono si trascina dalla maniglia ⠿.</p>
          </div>
        )}
      </div>
      {drag && (
        <div className="nx-ghost" style={{ left: drag.x, top: drag.y }}>
          {dragInfo?.label ?? String(drag.chip.value)}{dragInfo?.sub ? ` ${dragInfo.sub}` : ''}
          <span>{drag.over === 'A' || drag.over === 'B' ? `→ ${drag.over}` : drag.from !== 'palette' ? 'togli' : ''}</span>
        </div>
      )}
    </div>
  );
}
