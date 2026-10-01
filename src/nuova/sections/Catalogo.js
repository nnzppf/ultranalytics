import { useState, useMemo } from 'react';
import { Panel } from '../ui';
import { VENUES } from '../model';
import { GENRE_LABELS, CATEGORY_LABELS } from '../../config/eventConfig';
import { nightNameKey, editionLabelFromDate } from '../../utils/eventNameCleaner';
import { fmt, dshort, dmy } from '../format';

const isoOf = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '');

/** One night's date: from the name or the door scans, or set here by hand (wins over both). */
function DateRow({ ed, override, onSave }) {
  const [value, setValue] = useState(override?.date || isoOf(ed.date));
  const [saving, setSaving] = useState(false);
  const save = async (v) => {
    setSaving(true);
    await onSave(ed.rawName, v);
    setSaving(false);
  };
  const changed = value && value !== (override?.date || isoOf(ed.date));
  return (
    <tr>
      <td className="nx-name">{ed.rawName || ed.title}<span className="nx-subline">{ed.brand} · {fmt(ed.reg)} registrati</span></td>
      <td className="n">{ed.date ? dshort(ed.date) : <span className="nx-tag warn">senza data</span>}<span className="nx-subline">{override ? `a mano${override.by ? ` (${override.by})` : ''}` : ed.date ? 'automatica' : ''}</span></td>
      <td>
        <span className="nx-formacts">
          <input className="nx-input" type="date" value={value} onChange={(e) => setValue(e.target.value)} aria-label={`Data di ${ed.rawName}`} style={{ width: 160, fontSize: 14 }} />
          <button className="nx-btn" disabled={!changed || saving} onClick={() => save(value)}>{saving ? 'Salvo…' : 'Salva'}</button>
          {override && <button className="nx-link" disabled={saving} onClick={() => save(null)}>togli</button>}
        </span>
      </td>
    </tr>
  );
}

/** Event dates: nights with no date (they can't be tracked) and upcoming ones, editable. */
export function EventDates({ eds, dates, saveDate }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const overrideOf = (ed) => dates?.[nightNameKey(ed.rawName)] || null;
  const undated = eds.filter((e) => !e.date);
  const upcoming = eds.filter((e) => e.date && !e.over);
  const found = needle.length >= 3 ? eds.filter((e) => e.date && e.over && `${e.title} ${e.rawName} ${e.brand}`.toLowerCase().includes(needle)).slice(-10).reverse() : [];
  const rows = [...undated, ...upcoming, ...found];
  return (
    <Panel span={12} title="Date degli eventi" hint={undated.length ? `${undated.length} ${undated.length === 1 ? 'serata' : 'serate'} senza data` : 'tutte le serate hanno una data'}>
      <p className="nx-note" style={{ marginTop: 0 }}>
        La data si legge dal nome dell'evento; se il nome non ce l'ha (es. "TOO LATE - OPENING PARTY w/…"), mettila qui: senza data una serata in vendita non compare nel tracker.
        Vale per tutti e resta anche con i prossimi export.
      </p>
      <div className="nx-tw">
        <table>
          <thead><tr><th>evento (nome nell'export)</th><th className="n">data</th><th>imposta</th></tr></thead>
          <tbody>{rows.map((e) => <DateRow key={e.key} ed={e} override={overrideOf(e)} onSave={saveDate} />)}</tbody>
        </table>
      </div>
      <label className="nx-hint" htmlFor="nx-date-search">Correggere la data di una serata passata: cerca il nome</label>
      <input id="nx-date-search" className="nx-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="almeno 3 lettere" style={{ marginTop: 4, maxWidth: 360 }} />
    </Panel>
  );
}

function GenreChips({ value, onChange }) {
  return (
    <span className="nx-tagpick" style={{ flexBasis: 'auto' }}>
      {Object.entries(GENRE_LABELS).map(([k, g]) => (
        <button key={k} type="button" aria-pressed={value.includes(k)} className={value.includes(k) ? 'on' : ''}
          onClick={() => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])}>{g.label}</button>
      ))}
    </span>
  );
}

function BrandRow({ row, onPatch, onExclude, onRename, nights, onRenameNight }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(row.brand);
  const [busy, setBusy] = useState(false);
  const run = async (fn) => { setBusy(true); await fn(); setBusy(false); };
  return (
    <>
      <tr>
        <td className="nx-name">
          <span className="nx-formacts">
            <input className="nx-input" value={name} onChange={(e) => setName(e.target.value)} aria-label={`Nome del brand ${row.brand}`} style={{ width: 200, fontSize: 14 }} />
            {name.trim() && name.trim() !== row.brand && <button className="nx-btn" disabled={busy} onClick={() => run(() => onRename(row, name.trim()))}>Rinomina</button>}
          </span>
          <span className="nx-subline">{fmt(row.nights)} serate{row.original !== row.brand ? ` · nell'export: ${row.original}` : ''}</span>
        </td>
        <td>
          <select className="nx-input" value={row.venue} disabled={busy} onChange={(e) => run(() => onPatch(row, { venue: e.target.value }))} aria-label={`Locale di ${row.brand}`} style={{ fontSize: 14, width: 'auto' }}>
            {[...new Set([...VENUES.map(([v]) => v), row.venue])].filter(Boolean).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </td>
        <td>
          <select className="nx-input" value={row.category || 'standard'} disabled={busy} onChange={(e) => run(() => onPatch(row, { category: e.target.value }))} aria-label={`Categoria di ${row.brand}`} style={{ fontSize: 14, width: 'auto' }}>
            {Object.entries(CATEGORY_LABELS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
        </td>
        <td><GenreChips value={row.genres} onChange={(genres) => run(() => onPatch(row, { genres }))} /></td>
        <td>
          <span className="nx-formacts">
            <button className="nx-link" onClick={() => setOpen(!open)}>{open ? 'chiudi' : 'serate'}</button>
            <button className="nx-link" disabled={busy} onClick={() => run(() => onExclude(row, true))}>escludi</button>
          </span>
        </td>
      </tr>
      {open && nights.map((e) => <NightTitleRow key={e.key} ed={e} onSave={onRenameNight} />)}
    </>
  );
}

function NightTitleRow({ ed, onSave }) {
  const [title, setTitle] = useState(ed.title === ed.brand ? '' : ed.title);
  const [busy, setBusy] = useState(false);
  const current = ed.title === ed.brand ? '' : ed.title;
  return (
    <tr className="nx-subrow">
      <td colSpan={5}>
        <span className="nx-formacts">
          <span className="nx-num" style={{ width: 90 }}>{dmy(ed.date)}</span>
          <input className="nx-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`titolo della serata (vuoto = ${ed.brand})`} aria-label={`Titolo della serata del ${dmy(ed.date)}`} style={{ width: 320, fontSize: 14 }} />
          {title.trim() !== current && <button className="nx-btn" disabled={busy} onClick={async () => { setBusy(true); await onSave(ed, title.trim()); setBusy(false); }}>Salva</button>}
          <span className="nx-hint">{fmt(ed.reg)} registrati · {ed.rawName}</span>
        </span>
      </td>
    </tr>
  );
}

/**
 * Event catalog in the new interface: brand name, venue, category, genres,
 * exclusion and night titles. Every change is saved online as a single field.
 */
export function Catalog({ eds, config, patchConfig }) {
  const [q, setQ] = useState('');
  const original = useMemo(() => {
    const back = {};
    for (const [from, to] of Object.entries(config?.renames || {})) back[to] = from;
    return back;
  }, [config]);
  const rows = useMemo(() => {
    const map = new Map();
    for (const e of eds) {
      if (!map.has(e.brand)) map.set(e.brand, { brand: e.brand, original: original[e.brand] || e.brand, nights: 0, venue: e.venue, category: e.category, genres: e.genres || [], list: [] });
      const r = map.get(e.brand);
      r.nights++;
      r.list.push(e);
      if (e.venue) r.venue = e.venue;
    }
    return [...map.values()].sort((a, b) => a.brand.localeCompare(b.brand));
  }, [eds, original]);
  const needle = q.trim().toLowerCase();
  const shown = needle ? rows.filter((r) => `${r.brand} ${r.original} ${r.venue}`.toLowerCase().includes(needle)) : rows;
  const excluded = config?.excludedBrands || [];
  const patchBrand = (row, fields) => Promise.all(Object.entries(fields).map(([k, v]) => patchConfig(['brands', row.original, k], v)));
  const rename = (row, name) => patchConfig(['renames', row.original], name === row.original ? null : name);
  const exclude = (row, on) => patchConfig(['excludedBrands'], on ? [...new Set([...excluded, row.brand])] : excluded.filter((b) => b !== row.brand));
  // Night titles are keyed by the date label; clearing also drops older renames keyed by the export name
  const renameNight = async (ed, title) => {
    const label = ed.date ? editionLabelFromDate(ed.date) : ed.edition;
    if (title) return patchConfig(['editionRenames', ed.brand, label], title);
    const owners = [...new Set([ed.brand, original[ed.brand] || ed.brand])];
    for (const b of owners) for (const k of [label, ed.rawName]) if (config?.editionRenames?.[b]?.[k]) await patchConfig(['editionRenames', b, k], null);
    return true;
  };
  return (
    <Panel span={12} title="Catalogo eventi" hint="brand, locale, categoria, generi e titoli delle serate · ogni modifica si salva subito">
      <label className="nx-hint" htmlFor="nx-cat-search">Cerca brand o locale</label>
      <input id="nx-cat-search" className="nx-input" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: '4px 0 10px', maxWidth: 360 }} />
      <div className="nx-tw">
        <table className="nx-catalog">
          <thead><tr><th>brand</th><th>locale</th><th>categoria</th><th>generi</th><th /></tr></thead>
          <tbody>
            {shown.map((r) => (
              <BrandRow key={r.brand} row={r} nights={r.list} onPatch={patchBrand} onRename={rename} onExclude={exclude} onRenameNight={renameNight} />
            ))}
          </tbody>
        </table>
      </div>
      {excluded.length > 0 && (
        <p className="nx-note">
          Esclusi (non contano da nessuna parte):{' '}
          {excluded.map((b) => <span key={b} className="nx-flowtag">{b} <button className="nx-link" onClick={() => patchConfig(['excludedBrands'], excluded.filter((x) => x !== b))}>riattiva</button></span>)}
        </p>
      )}
      <p className="nx-note">Rinominare un brand con il nome di un altro li unisce. Per gli eventi una tantum (es. Studios Opening, Too Late &amp; Friends) usa le serie in Confronta.</p>
    </Panel>
  );
}
