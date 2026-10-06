/**
 * Two sets of nights, A and B, built from elements dragged in: formats, single
 * nights, genres, venues, weekdays, months, seasons, categories, series.
 * Elements of the same kind add up (Atipico or Ultravivid); different kinds narrow
 * each other down (at TooLate and on a Saturday); single nights are always added.
 * Nights can be taken out one by one (excluded). Pure functions, tested.
 */
import { personKey } from './model';
import { groupMetrics, DOW_NAMES } from './compare';
import { GENRE_LABELS, CATEGORY_LABELS } from '../config/eventConfig';

const round1 = (n) => Math.round(n * 10) / 10;
export const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MON = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const dmy = (d) => `${d.getDate()} ${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

/** Kinds of elements, in palette order. */
export const KINDS = [
  ['brand', 'Format'], ['night', 'Serate'], ['venue', 'Locali'], ['genre', 'Generi'], ['dow', 'Giorni'],
  ['month', 'Mesi'], ['season', 'Stagioni'], ['category', 'Categorie'], ['series', 'Serie'],
];

export const chipId = (c) => `${c.kind}:${c.value}`;
export const emptySet = () => ({ chips: [], excluded: [] });

/** Every element that can go in a set, with how many nights it covers. */
export function chipCatalog(eds, seriesIdx) {
  const map = new Map();
  const add = (kind, value, label, extra = {}) => {
    const id = `${kind}:${value}`;
    if (!map.has(id)) map.set(id, { kind, value, label, n: 0, ...extra });
    map.get(id).n++;
  };
  for (const e of eds) {
    if (!e.date) continue;
    add('brand', e.brand, e.brand, { venue: e.venue });
    add('night', e.key, e.title, { venue: e.venue, sub: dmy(e.date), date: e.date, over: e.over, reg: e.reg });
    if (e.venue) add('venue', e.venue, e.venue, { venue: e.venue });
    for (const g of e.genres || []) add('genre', g, GENRE_LABELS[g]?.label || g);
    add('dow', e.date.getDay(), DOW_NAMES[e.date.getDay()]);
    add('month', e.date.getMonth(), MONTH_NAMES[e.date.getMonth()]);
    add('season', e.season, `stagione ${e.season}`);
    if (e.category) add('category', e.category, CATEGORY_LABELS[e.category]?.label || e.category);
  }
  for (const s of seriesIdx?.list || []) {
    if (s.eds.length) map.set(`series:${s.name}`, { kind: 'series', value: s.name, label: s.name, n: s.eds.length });
  }
  const order = Object.fromEntries(KINDS.map(([k], i) => [k, i]));
  return [...map.values()].sort((a, b) => order[a.kind] - order[b.kind]
    || (a.kind === 'night' ? b.date - a.date : a.kind === 'dow' || a.kind === 'month' ? a.value - b.value : a.kind === 'season' ? String(b.value).localeCompare(String(a.value)) : b.n - a.n || String(a.label).localeCompare(String(b.label))));
}

function matches(e, chip, seriesIdx) {
  switch (chip.kind) {
    case 'brand': return e.brand === chip.value;
    case 'venue': return e.venue === chip.value;
    case 'genre': return (e.genres || []).includes(chip.value);
    case 'dow': return e.date.getDay() === chip.value;
    case 'month': return e.date.getMonth() === chip.value;
    case 'season': return e.season === chip.value;
    case 'category': return e.category === chip.value;
    case 'series': return !!seriesIdx?.list.find((s) => s.name === chip.value)?.eds.some((x) => x.key === e.key);
    default: return false;
  }
}

/** The nights of a set, oldest first: concluded ones (the numbers) and those on sale. */
export function resolveSet(set, eds, seriesIdx) {
  const filters = new Map();
  for (const c of set.chips) {
    if (c.kind === 'night') continue;
    if (!filters.has(c.kind)) filters.set(c.kind, []);
    filters.get(c.kind).push(c);
  }
  const dated = eds.filter((e) => e.date);
  const picked = new Set(set.chips.filter((c) => c.kind === 'night').map((c) => c.value));
  const excluded = new Set(set.excluded || []);
  const nights = dated.filter((e) => !excluded.has(e.key) && (picked.has(e.key)
    || (filters.size > 0 && [...filters.values()].every((list) => list.some((c) => matches(e, c, seriesIdx))))));
  return { nights, done: nights.filter((e) => e.over), onSale: nights.filter((e) => !e.over), excludedCount: excluded.size };
}

const join = (list, word = 'o') => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} ${word} ${list[list.length - 1]}`);

/** "Serate di Atipico o Ultravivid, a TooLate, di sabato · più 2 serate scelte". */
export function describeSet(set, catalog) {
  const label = (c) => catalog.find((x) => x.kind === c.kind && x.value === c.value)?.label ?? String(c.value);
  const of = (kind) => set.chips.filter((c) => c.kind === kind).map(label);
  const parts = [];
  if (of('brand').length) parts.push(`di ${join(of('brand'))}`);
  if (of('series').length) parts.push(`della serie ${join(of('series'))}`);
  if (of('venue').length) parts.push(`a ${join(of('venue'))}`);
  if (of('genre').length) parts.push(`di genere ${join(of('genre').map((g) => g.toLowerCase()))}`);
  if (of('category').length) parts.push(`${join(of('category').map((g) => g.toLowerCase()))}`);
  if (of('dow').length) parts.push(`di ${join(of('dow'))}`);
  if (of('month').length) parts.push(`a ${join(of('month'))}`);
  if (of('season').length) parts.push(`nella ${join(of('season'))}`);
  const nights = set.chips.filter((c) => c.kind === 'night').length;
  if (!parts.length) return nights ? `${nights} ${nights === 1 ? 'serata scelta' : 'serate scelte'}` : '';
  return `Serate ${parts.join(', ')}${nights ? ` · più ${nights} ${nights === 1 ? 'serata scelta' : 'serate scelte'}` : ''}`;
}

/** Short name of a set for sentences: its only element, or the elements joined. */
export function setName(set, catalog, fallback) {
  const labels = set.chips.map((c) => {
    const x = catalog.find((y) => y.kind === c.kind && y.value === c.value);
    return x ? (c.kind === 'night' ? `${x.label} ${x.sub}` : x.label) : String(c.value);
  });
  const s = labels.join(' + ');
  return !s ? fallback : s.length > 34 ? fallback : s;
}

/** Per-night averages of a set's concluded nights, plus how many different people. */
export function setStats(done, attendance, now = new Date()) {
  if (!done.length) return null;
  const m = groupMetrics(done, attendance, now);
  const people = new Set(), entered = new Set();
  for (const e of done) {
    for (const r of e.rows) {
      const k = personKey(r);
      if (!k) continue;
      people.add(k);
      if (r.attended) entered.add(k);
    }
  }
  return { ...m, nights: done.length, people: people.size, entered: entered.size };
}

/**
 * Rows of the A-vs-B scorecard: [key, label, unit]. unit: 'n' counts (difference in
 * %), 'pt' percentages (difference in points), 'd' days, 'h' hour of the night.
 */
export const SCORE_ROWS = [
  ['reg', 'Registrati per serata', 'n'],
  ['ent', 'Ingressi per serata', 'n'],
  ['conv', 'Conversione', 'pt'],
  ['dayOf', 'Registrati il giorno stesso', 'pt'],
  ['medianDays', 'Anticipo mediano', 'd'],
  ['openLead', 'Registrazioni aperte prima', 'd'],
  ['peakEnt', 'Ora di picco ingressi', 'h'],
  ['female', 'Donne', 'pt'],
  ['under18', 'Sotto 18 anni', 'pt'],
  ['age18to24', '18–24 anni', 'pt'],
  ['over25', '25 anni e più', 'pt'],
  ['returning', 'Già venuti prima', 'pt'],
  ['newcomers', 'Nuovi per serata', 'n'],
  ['back30', 'Tornati entro 30 giorni', 'pt'],
  ['nights', 'Serate concluse', 'n'],
  ['people', 'Persone diverse', 'n'],
];

/** Difference of A from B for one row: % for counts, points for percentages, plain for days. */
export function rowDiff(a, b, unit) {
  if (a == null || b == null) return null;
  if (unit === 'n') return b ? Math.round((100 * (a - b)) / b) : null;
  if (unit === 'pt') return round1(a - b);
  if (unit === 'd') return round1(a - b);
  return null;
}

const INSIGHTS = [
  ['reg', 'n', 15, (w, l, a, b, d) => `${w} fa in media il ${Math.abs(d)}% di registrati in più (${a} contro ${b} a serata).`],
  ['ent', 'n', 15, (w, l, a, b, d) => `${w} porta dentro il ${Math.abs(d)}% di persone in più (${a} contro ${b} ingressi a serata).`],
  ['conv', 'pt', 5, (w, l, a, b) => `${w} converte meglio: entra il ${a}% dei registrati contro il ${b}%.`],
  ['dayOf', 'pt', 8, (w, l, a, b) => `${w} si riempie più all'ultimo: il ${a}% si registra il giorno stesso, contro il ${b}%.`],
  ['openLead', 'd', 5, (w, l, a, b) => `${w} apre le registrazioni prima: ${a} giorni contro ${b}.`],
  ['under18', 'pt', 6, (w, l, a, b) => `${w} ha più minorenni: ${a}% contro ${b}%.`],
  ['over25', 'pt', 6, (w, l, a, b) => `${w} ha un pubblico più adulto: ${a}% con 25 anni o più, contro ${b}%.`],
  ['female', 'pt', 6, (w, l, a, b) => `${w} ha più donne: ${a}% contro ${b}%.`],
  ['returning', 'pt', 8, (w, l, a, b) => `${w} ha un pubblico più fedele: il ${a}% era già venuto, contro il ${b}%.`],
  ['newcomers', 'n', 20, (w, l, a, b, d) => `${w} porta più gente nuova: ${a} persone mai entrate prima a serata, contro ${b}.`],
  ['back30', 'pt', 6, (w, l, a, b) => `Chi entra a ${w} torna di più: il ${a}% rientra entro 30 giorni, contro il ${b}%.`],
];

/**
 * What stands out between A and B, biggest differences first: sentences built from
 * the per-night numbers, only where the gap is worth saying (e.g. 15% or 5 points).
 */
export function insights(sa, sb, nameA, nameB, max = 4) {
  if (!sa || !sb) return [];
  const out = [];
  for (const [key, unit, threshold, text] of INSIGHTS) {
    const a = sa[key], b = sb[key];
    const d = rowDiff(a, b, unit);
    if (d == null || Math.abs(d) < threshold) continue;
    const aWins = d > 0;
    const fmtV = (v) => (unit === 'n' ? Math.round(v) : round1(v));
    const [win, lose] = aWins ? [a, b] : [b, a];
    // "x% in più" is measured on the smaller side
    const more = unit === 'n' && lose ? Math.round((100 * (win - lose)) / lose) : Math.abs(d);
    out.push({
      key, side: aWins ? 'A' : 'B', weight: Math.abs(d) / threshold,
      text: text(aWins ? nameA : nameB, aWins ? nameB : nameA, fmtV(win).toLocaleString('it-IT'), fmtV(lose).toLocaleString('it-IT'), more),
    });
  }
  return out.sort((x, y) => y.weight - x.weight).slice(0, max);
}

/** People only in A, in both, only in B (registered or, with `entered`, people who came in). */
export function setOverlap(doneA, doneB, entered = false) {
  const collect = (list) => {
    const s = new Set();
    for (const e of list) for (const r of e.rows) if (!entered || r.attended) { const k = personKey(r); if (k) s.add(k); }
    return s;
  };
  const a = collect(doneA), b = collect(doneB);
  let both = 0;
  for (const k of a) if (b.has(k)) both++;
  return { onlyA: a.size - both, both, onlyB: b.size - both, a: a.size, b: b.size, pctOfA: a.size ? round1((100 * both) / a.size) : 0, pctOfB: b.size ? round1((100 * both) / b.size) : 0 };
}

/**
 * Where a set's audience goes next: among the people who came in to its nights,
 * the share who came in to each brand within `days` after (nights of the set itself
 * excluded). complete is false while the last night is less than `days` old.
 */
export function setFlow(done, eds, now = new Date(), days = 60) {
  if (!done.length) return null;
  const own = new Set(done.map((e) => e.key));
  const firstIn = new Map(); // person -> nights they came in to (times)
  for (const e of done) {
    const t = e.date.getTime();
    for (const r of e.rows) {
      if (!r.attended) continue;
      const k = personKey(r);
      if (!k) continue;
      if (!firstIn.has(k)) firstIn.set(k, []);
      firstIn.get(k).push(t);
    }
  }
  if (!firstIn.size) return null;
  const byBrand = new Map();
  const back = new Set();
  const span = days * 864e5;
  for (const e of eds) {
    if (!e.over || !e.date || own.has(e.key)) continue;
    const t = e.date.getTime();
    for (const r of e.rows) {
      if (!r.attended) continue;
      const k = personKey(r);
      const times = k && firstIn.get(k);
      if (!times || !times.some((t0) => t > t0 && t <= t0 + span)) continue;
      back.add(k);
      if (!byBrand.has(e.brand)) byBrand.set(e.brand, { brand: e.brand, venue: e.venue, people: new Set() });
      byBrand.get(e.brand).people.add(k);
    }
  }
  const last = Math.max(...done.map((e) => e.date.getTime()));
  return {
    people: firstIn.size,
    backPct: round1((100 * back.size) / firstIn.size),
    complete: now.getTime() - last >= span,
    top: [...byBrand.values()].map((b) => ({ brand: b.brand, venue: b.venue, pct: round1((100 * b.people.size) / firstIn.size) }))
      .sort((a, b) => b.pct - a.pct).slice(0, 5),
  };
}

/** Ready-made questions: one tap fills A and B. */
export function presets(eds, catalog, upcoming, seriesIdx) {
  const has = (kind, value, min = 2) => (catalog.find((c) => c.kind === kind && c.value === value)?.n || 0) >= min;
  const chip = (kind, value) => ({ kind, value });
  const out = [];
  const next = upcoming?.[0]?.ed;
  if (next) {
    const series = seriesIdx?.ofEdition.get(next.key);
    out.push({ id: 'next', label: `${next.title} contro ${series ? `la serie ${series}` : 'le sue edizioni'}`, A: [chip('night', next.key)], B: [series ? chip('series', series) : chip('brand', next.brand)], view: 'previsione' });
  }
  if (has('dow', 5) && has('dow', 6)) out.push({ id: 'dow', label: 'Venerdì contro sabato', A: [chip('dow', 5)], B: [chip('dow', 6)] });
  const seasons = catalog.filter((c) => c.kind === 'season').map((c) => c.value).sort().reverse();
  const withDone = seasons.filter((s) => eds.some((e) => e.over && e.season === s));
  if (withDone.length >= 2) out.push({ id: 'season', label: `Stagione ${withDone[0]} contro ${withDone[1]}`, A: [chip('season', withDone[0])], B: [chip('season', withDone[1])] });
  if (has('genre', 'commerciale') && has('genre', 'elettronica')) out.push({ id: 'genre', label: 'Commerciale contro elettronica', A: [chip('genre', 'commerciale')], B: [chip('genre', 'elettronica')] });
  const venues = catalog.filter((c) => c.kind === 'venue').sort((a, b) => b.n - a.n);
  if (venues.length >= 2) out.push({ id: 'venue', label: `${venues[0].label} contro ${venues[1].label}`, A: [chip('venue', venues[0].value)], B: [chip('venue', venues[1].value)] });
  if (has('category', 'young') && has('category', 'standard')) out.push({ id: 'cat', label: 'Young contro standard', A: [chip('category', 'young')], B: [chip('category', 'standard')] });
  return out;
}

// ---------------------------------------------------------------- link and storage

const cleanSet = (s) => ({
  chips: (Array.isArray(s?.chips) ? s.chips : []).filter((c) => c && typeof c.kind === 'string' && (typeof c.value === 'string' || typeof c.value === 'number')).slice(0, 20).map((c) => ({ kind: c.kind, value: c.value })),
  excluded: (Array.isArray(s?.excluded) ? s.excluded : []).filter((k) => typeof k === 'string').slice(0, 200),
});

/** Route parameter for a comparison: "#confronta/insiemi:{...}". */
export const encodeSets = (A, B, view) => `insiemi:${JSON.stringify({ a: cleanSet(A), b: cleanSet(B), v: view })}`;

export function decodeSets(param) {
  if (typeof param !== 'string' || !param.startsWith('insiemi:')) return null;
  try {
    const o = JSON.parse(param.slice(8));
    return { A: cleanSet(o.a), B: cleanSet(o.b), view: typeof o.v === 'string' ? o.v : null };
  } catch {
    return null;
  }
}

export function readStoredSets(raw) {
  try {
    const o = JSON.parse(raw);
    return { A: cleanSet(o?.A), B: cleanSet(o?.B) };
  } catch {
    return { A: emptySet(), B: emptySet() };
  }
}
