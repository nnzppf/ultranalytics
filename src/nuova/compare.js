/**
 * Comparison engine for Confronta and the tracker: curves on several axes, groups
 * of nights (brand season, venue, weekday, genre, series), suggested companions,
 * expected entries and how far past projections were from the final count.
 * Pure functions on the nights built by model.indexEditions.
 */
import { dayDiff, samePointFor, midnight } from '../utils/eventTime';
import { projectFinal } from '../utils/comparisonEngine';
import { median, curveByDays, curveByHours, peersOf, personKey, editionMetrics } from './model';

const DAY = 24 * 3600000;
const round1 = (n) => Math.round(n * 10) / 10;
const mean = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : null);
// Median hour on the night axis: 23:00 and 01:00 give midnight, not noon
const nightHour = (hours) => {
  const m = median(hours.filter((h) => h != null).map((h) => (h < 12 ? h + 24 : h)));
  return m == null ? null : Math.round(m) % 24;
};
export const DOW_NAMES = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

// ---------------------------------------------------------------- curves

/** Cumulative registrations by days since registrations opened (0 = day of the first registration). */
export function curveBySales(ed, maxDays = 60, now = new Date()) {
  if (!ed.firstReg || !ed.date) return [];
  const eventDay = Math.max(0, dayDiff(ed.firstReg, ed.date));
  const end = ed.over ? eventDay : Math.min(eventDay, Math.max(0, dayDiff(ed.firstReg, now)));
  const counts = Array(maxDays + 1).fill(0);
  for (const r of ed.rows) {
    if (!r.purchaseDate) continue;
    // Registrations after midnight on the night itself count on the event day
    const d = Math.min(eventDay, Math.max(0, dayDiff(ed.firstReg, r.purchaseDate)));
    if (d <= maxDays) counts[d]++;
  }
  let run = 0;
  return counts.map((c, d) => {
    run += c;
    return { x: d, y: d <= end ? run : null };
  });
}

const HOUR = 3600000;

/**
 * Registrations accumulated hour by hour, x = hours from the midnight that starts
 * the event day (-48 = two days before at midnight, 27 = 03:00 of the night). A
 * night on sale stops at `until` (when the data or the typed-in count is from);
 * a typed-in count is its value there, and the hours between the end of the data
 * (`dataUntil`) and that count stay empty: nobody knows when those people came.
 */
export function curveByHourBefore(ed, fromH, toH, until = null, typed = null, dataUntil = null) {
  if (!ed.date) return [];
  const day0 = midnight(ed.date).getTime();
  const times = ed.rows.map((r) => r.purchaseDate?.getTime()).filter((t) => t != null).sort((a, b) => a - b);
  const stop = until ? until.getTime() : Infinity;
  const xStop = until ? Math.floor((stop - day0) / HOUR) : Infinity;
  const xData = typed && dataUntil ? Math.floor((dataUntil.getTime() - day0) / HOUR) : Infinity;
  const out = [];
  let i = 0;
  for (let x = fromH; x <= toH; x++) {
    if (x > xStop || (x > xData && x < xStop)) {
      out.push({ x, y: null });
      continue;
    }
    const t = x === xStop ? stop : day0 + x * HOUR;
    while (i < times.length && times[i] <= t) i++;
    out.push({ x, y: x === xStop && typed ? Math.max(i, typed.value) : i });
  }
  return out;
}

/** Axis of curveByHourBefore: hour ticks, and "1 giorno prima, ore 17:00" when pointing. */
export function hourAxis(fromH, toH) {
  const xs = [];
  for (let x = fromH; x <= toH; x++) xs.push(x);
  const hh = (x) => String(((x % 24) + 24) % 24).padStart(2, '0');
  const step = toH - fromH > 100 ? 24 : toH - fromH > 48 ? 12 : 6;
  return {
    xs,
    xLabel: (x) => {
      if (x === 0) return 'evento';
      if (x % step !== 0) return '';
      return x < 0 && x % 24 === 0 ? `-${-x / 24} g` : `${hh(x)}:00`;
    },
    xTitle: (x) => {
      const d = Math.floor(x / 24);
      const when = d >= 1 ? 'notte della serata' : d === 0 ? 'giorno della serata' : `${-d} ${d === -1 ? 'giorno' : 'giorni'} prima`;
      return `${when}, ore ${hh(x)}:00`;
    },
  };
}

/** One night's curve on an axis: 'giorni' (to the event), 'apertura' (since opening), 'percentuale' (of the final), 'ore' (of the night). */
export function curveOf(ed, axis, windowDays, now = new Date()) {
  if (axis === 'ore') return curveByHours(ed, now);
  if (axis === 'apertura') return curveBySales(ed, windowDays, now);
  const pts = curveByDays(ed, windowDays, now);
  if (axis !== 'percentuale') return pts;
  return pts.map((p) => ({ x: p.x, y: p.y == null || !ed.over ? null : (100 * p.y) / ed.reg }));
}

/**
 * Median curve of several nights with their min–max. A night already over keeps
 * its final value after its curve ends (on the "since opening" axis nights end on
 * different days).
 */
export function groupCurve(curves) {
  const base = curves.reduce((a, c) => (c.length > a.length ? c : a), []);
  return base.map((p0, i) => {
    const vals = [];
    for (const c of curves) {
      // The night's value here, or the last one it reached if its curve already ended
      let v = null;
      for (let j = Math.min(i, c.length - 1); j >= 0 && v == null; j--) v = c[j].y;
      if (v != null) vals.push(v);
    }
    return vals.length ? { x: p0.x, y: median(vals), min: Math.min(...vals), max: Math.max(...vals) } : { x: p0.x, y: null };
  });
}

/** Curve of a table item: a night, or the median of a group. */
export function itemCurve(item, axis, windowDays, now = new Date()) {
  if (item.kind !== 'group') return curveOf(item.ed, axis, windowDays, now);
  return groupCurve(item.eds.map((e) => curveOf(e, axis, windowDays, now)));
}

/** Points of the axis worth reading as numbers under the chart. */
export function checkpointsFor(axis, windowDays) {
  if (axis === 'ore') return [18, 21, 24, 26];
  if (axis === 'apertura') return [1, 3, 7, 14, 21, 30, 45, 60].filter((x) => x <= windowDays);
  return [-30, -14, -7, -3, -1, 0].filter((x) => x >= -windowDays);
}

// ---------------------------------------------------------------- groups

/**
 * Groups of concluded nights that can go on the table as one line (median and
 * min–max): series, brand per season, venue per season, venue and weekday per
 * season, genre per season. Groups need at least two nights (a series one).
 */
export function groupCatalog(eds, seriesIdx) {
  const done = eds.filter((e) => e.over && e.date);
  const out = [];
  for (const s of seriesIdx?.list || []) {
    const list = s.eds.filter((e) => e.over && e.date);
    if (list.length) out.push({ key: `g:serie:${s.name}`, kind: 'serie', label: `Serie ${s.name}`, eds: list });
  }
  const buckets = new Map();
  const put = (kind, key, label, e) => {
    const k = `g:${kind}:${key}`;
    if (!buckets.has(k)) buckets.set(k, { key: k, kind, label, eds: [], season: e.season });
    buckets.get(k).eds.push(e);
  };
  for (const e of done) {
    put('brand', `${e.brand}|${e.season}`, `${e.brand} · ${e.season}`, e);
    put('locale', `${e.venue}|${e.season}`, `${e.venue || 'senza locale'} · stagione ${e.season}`, e);
    put('giorno', `${e.venue}|${e.date.getDay()}|${e.season}`, `${e.venue || 'senza locale'} · ${DOW_NAMES[e.date.getDay()]} · ${e.season}`, e);
    for (const g of e.genres?.length ? e.genres : []) put('genere', `${g}|${e.season}`, `${g} · ${e.season}`, e);
  }
  const order = { brand: 1, locale: 2, giorno: 3, genere: 4 };
  const rest = [...buckets.values()].filter((g) => g.eds.length >= 2)
    .sort((a, b) => order[a.kind] - order[b.kind] || b.season.localeCompare(a.season) || a.label.localeCompare(b.label));
  return [...out, ...rest].map((g) => ({ ...g, venue: g.eds[g.eds.length - 1].venue }));
}

/** Numbers of a group: averages per night (counts) or of the nights' percentages. */
export function groupMetrics(eds, attendance, now = new Date()) {
  const ms = eds.map((e) => editionMetrics(e, attendance, now));
  const avgOf = (k, digits) => {
    const v = mean(ms.map((m) => m[k]).filter((x) => x != null));
    return v == null ? null : digits ? round1(v) : Math.round(v);
  };
  const scanned = eds.filter((e) => e.hasScans);
  const reg = scanned.reduce((s, e) => s + e.reg, 0);
  return {
    reg: avgOf('reg'),
    ent: scanned.length ? Math.round(mean(scanned.map((e) => e.ent))) : null,
    conv: reg ? round1((100 * scanned.reduce((s, e) => s + e.ent, 0)) / reg) : null,
    dayOf: avgOf('dayOf', 1),
    medianDays: median(ms.map((m) => m.medianDays).filter((x) => x != null)),
    peakReg: nightHour(ms.map((m) => m.peakReg)),
    peakEnt: nightHour(ms.map((m) => m.peakEnt)),
    female: avgOf('female', 1),
    under18: avgOf('under18', 1),
    age18to24: avgOf('age18to24', 1),
    over25: avgOf('over25', 1),
    returning: avgOf('returning', 1),
    newcomers: avgOf('newcomers'),
    back30: avgOf('back30', 1),
    openLead: median(ms.map((m) => m.openLead).filter((x) => x != null)),
    seasonNo: null,
  };
}

// ---------------------------------------------------------------- suggestions

/** Nights worth putting next to `ed`, as labelled sets the user adds with one tap. */
export function suggestionsFor(ed, eds, seriesIdx) {
  if (!ed?.date) return [];
  const done = eds.filter((e) => e.over && e.date && e.key !== ed.key && e.date < ed.date);
  const out = [];
  const series = seriesIdx?.ofEdition.get(ed.key);
  if (series) {
    const keys = seriesIdx.list.find((s) => s.name === series).eds.filter((e) => e.key !== ed.key && e.over).map((e) => e.key);
    if (keys.length) out.push({ id: 'serie', label: `serie ${series}`, keys });
  }
  const yearAgo = ed.date.getTime() - 364 * DAY;
  const lastYear = done.filter((e) => e.brand === ed.brand && Math.abs(e.date.getTime() - yearAgo) <= 45 * DAY)
    .sort((a, b) => Math.abs(a.date.getTime() - yearAgo) - Math.abs(b.date.getTime() - yearAgo))[0];
  if (lastYear) out.push({ id: 'anno', label: `${ed.brand} un anno fa`, keys: [lastYear.key] });
  if (ed.venueSeasonNo === 1) {
    const firsts = done.filter((e) => e.venue === ed.venue && e.venueSeasonNo === 1);
    if (firsts.length) out.push({ id: 'prime', label: `prime serate di stagione a ${ed.venue}`, keys: firsts.map((e) => e.key) });
  }
  const brand = done.filter((e) => e.brand === ed.brand).slice(-3);
  if (brand.length) out.push({ id: 'brand', label: `ultime ${brand.length} di ${ed.brand}`, keys: brand.map((e) => e.key) });
  const dow = done.filter((e) => e.venue === ed.venue && e.brand !== ed.brand && e.date.getDay() === ed.date.getDay()).slice(-3);
  if (dow.length) out.push({ id: 'giorno', label: `ultimi ${DOW_NAMES[ed.date.getDay()]} a ${ed.venue}`, keys: dow.map((e) => e.key) });
  const seen = new Set();
  return out.filter((s) => {
    const sig = [...s.keys].sort().join('~');
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

/** Default companions when a night is opened in Confronta: series, a year ago, season openers, latest of the brand. */
export function companionsFor(ed, eds, seriesIdx) {
  const sugg = suggestionsFor(ed, eds, seriesIdx);
  const pick = sugg.find((s) => s.id === 'serie')
    ? sugg.filter((s) => s.id === 'serie')
    : sugg.filter((s) => s.id !== 'giorno');
  const keys = [...new Set(pick.flatMap((s) => s.keys))];
  if (keys.length) return keys.slice(-7);
  // Brand-new brand: the latest nights at the same venue
  return eds.filter((e) => e.over && e.key !== ed.key && e.venue === ed.venue).slice(-4).map((e) => e.key);
}

// ---------------------------------------------------------------- entries

/**
 * Expected entries for a night on sale. People who register early come in at a
 * different rate than those who register in the last days: each reference night
 * gives both rates at the same point, and the medians are applied to the
 * registrations so far and to the ones still expected.
 */
export function expectedEntries(target, refs, reference, current, projection) {
  const convs = refs.filter((r) => r.over && r.hasScans && r.date).map((r) => {
    const cutoff = samePointFor(r.date, reference, target.date);
    let e = 0, ea = 0, l = 0, la = 0;
    for (const x of r.rows) {
      if (x.purchaseDate && x.purchaseDate <= cutoff) { e++; if (x.attended) ea++; } else { l++; if (x.attended) la++; }
    }
    const all = r.ent / r.reg;
    return { early: e ? ea / e : all, late: l ? la / l : all };
  });
  if (!convs.length) return null;
  const early = median(convs.map((c) => c.early));
  const late = median(convs.map((c) => c.late));
  const est = (final) => Math.round(current * early + Math.max(0, final - current) * late);
  return {
    value: projection ? est(projection.value) : null,
    low: projection ? est(projection.low) : null,
    high: projection ? est(projection.high) : null,
    sofar: Math.round(current * early),
    early: round1(100 * early),
    late: round1(100 * late),
    basedOn: convs.length,
  };
}

// ---------------------------------------------------------------- accuracy

export const ACCURACY_POINTS = [14, 7, 3, 1];

/**
 * How far the tracker's projection was from the final count on past nights. For
 * every concluded night and every point (14, 7, 3, 1 days before, end of day) the
 * projection (projectFinal, the tracker's own) is redone with only the nights of the
 * same brand or series concluded before it, as it was then.
 * typical = median absolute error in %; within20 = share of nights within ±20%;
 * bias = median error (negative: the projection was low); q10/q90 = error deciles,
 * which turn a projection into the range 8 nights out of 10 ended in.
 */
export function projectionAccuracy(eds, seriesIdx, points = ACCURACY_POINTS) {
  const done = eds.filter((e) => e.over && e.date);
  const maxD = Math.max(...points);
  const cum = new Map(done.map((e) => {
    const c = Array(maxD + 2).fill(0);
    for (const r of e.rows) if (r.daysBefore != null) c[Math.min(maxD + 1, r.daysBefore)]++;
    for (let d = maxD; d >= 0; d--) c[d] += c[d + 1];
    return [e.key, c];
  }));
  const samples = [];
  for (const e of done) {
    const peers = peersOf(e, done, seriesIdx);
    const prior = peers.eds.filter((p) => p.key !== e.key && p.over && p.date < e.date);
    if (!prior.length) continue;
    for (const d of points) {
      const cur = cum.get(e.key)[d];
      const proj = projectFinal(prior.map((p) => ({ atSamePointAdjusted: cum.get(p.key)[d], totalFinal: p.reg, eventDate: p.date })), cur);
      if (!proj) continue;
      samples.push({ group: peers.series || e.brand, d, err: (proj.value - e.reg) / e.reg });
    }
  }
  const q = (sorted, p) => {
    const pos = (sorted.length - 1) * p;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  };
  const summarize = (list) => {
    if (!list.length) return { n: 0, typical: null, within20: null, bias: null, q10: null, q90: null };
    const errs = list.map((s) => s.err).sort((x, y) => x - y);
    return {
      n: list.length,
      typical: Math.round(100 * median(errs.map(Math.abs))),
      within20: Math.round((100 * errs.filter((x) => Math.abs(x) <= 0.2).length) / errs.length),
      bias: Math.round(100 * median(errs)),
      q10: q(errs, 0.1),
      q90: q(errs, 0.9),
    };
  };
  const overall = points.map((d) => ({ d, ...summarize(samples.filter((s) => s.d === d)) }));
  const byGroup = new Map();
  for (const s of samples) {
    if (!byGroup.has(s.group)) byGroup.set(s.group, []);
    byGroup.get(s.group).push(s);
  }
  const groups = [...byGroup].map(([group, list]) => ({ group, points: points.map((d) => ({ d, ...summarize(list.filter((s) => s.d === d)) })) }));
  return { overall, groups, points };
}

/**
 * Range 8 past nights out of 10 ended in, for a projection made `daysBefore` days
 * out: the projection corrected by the errors' first and last decile (all nights,
 * at the nearest point with at least 10 cases).
 */
export function likelyRange(acc, value, daysBefore) {
  if (!acc || !(value > 0)) return null;
  const pts = acc.overall.filter((p) => p.n >= 10);
  if (!pts.length) return null;
  const p = pts.reduce((best, x) => (Math.abs(x.d - daysBefore) < Math.abs(best.d - daysBefore) ? x : best), pts[0]);
  return { low: Math.round(value / (1 + p.q90)), high: Math.round(value / Math.max(0.1, 1 + p.q10)), d: p.d, n: p.n };
}

/** Accuracy to show next to a projection made `daysBefore` days out: the group's own when it has 3+ cases, else all nights. */
export function accuracyFor(acc, group, daysBefore) {
  if (!acc) return null;
  const d = acc.points.reduce((best, p) => (Math.abs(p - daysBefore) < Math.abs(best - daysBefore) ? p : best), acc.points[0]);
  const own = acc.groups.find((g) => g.group === group)?.points.find((p) => p.d === d);
  if (own && own.n >= 3) return { ...own, scope: 'group' };
  const all = acc.overall.find((p) => p.d === d);
  return all && all.n ? { ...all, scope: 'all' } : null;
}

/** Upcoming nights with expected entries and how reliable their projection usually is. */
export function enrichUpcoming(items, eds, seriesIdx, acc) {
  return items.map((u) => {
    const t = u.tracker;
    const refs = peersOf(u.ed, eds, seriesIdx).eds.filter((p) => p.over && p.key !== u.ed.key);
    return {
      ...u,
      refs,
      entries: expectedEntries(u.ed, refs, t.referenceTime, t.currentRegistrations, t.projection),
      accuracy: t.projection ? accuracyFor(acc, u.series || u.ed.brand, t.pointDaysBefore) : null,
      likely: t.projection ? likelyRange(acc, t.projection.value, t.pointDaysBefore) : null,
    };
  });
}

// ---------------------------------------------------------------- audience

/** Where the people who came in to a night went next: brands they came in to within `days`. */
export function audienceFlow(ed, eds, now = new Date(), days = 60) {
  if (!ed.date || !ed.over) return null;
  const t0 = ed.date.getTime();
  const people = new Set(ed.rows.filter((r) => r.attended).map(personKey).filter(Boolean));
  if (!people.size) return null;
  const byBrand = new Map();
  const back = new Set();
  for (const e of eds) {
    if (!e.over || !e.date || e.date.getTime() <= t0 || e.date.getTime() > t0 + days * DAY) continue;
    for (const r of e.rows) {
      if (!r.attended) continue;
      const k = personKey(r);
      if (!k || !people.has(k)) continue;
      back.add(k);
      if (!byBrand.has(e.brand)) byBrand.set(e.brand, { brand: e.brand, venue: e.venue, people: new Set() });
      byBrand.get(e.brand).people.add(k);
    }
  }
  return {
    people: people.size,
    back: back.size,
    backPct: round1((100 * back.size) / people.size),
    complete: now.getTime() - t0 >= days * DAY,
    days,
    top: [...byBrand.values()].map((b) => ({ brand: b.brand, venue: b.venue, n: b.people.size, pct: round1((100 * b.people.size) / people.size) }))
      .sort((a, b) => b.n - a.n).slice(0, 6),
  };
}

// ---------------------------------------------------------------- shared link

/** Route parameter for a table: "#confronta/tavolo:{...}". */
export const encodeTable = (keys, view) => `tavolo:${JSON.stringify({ k: keys, v: view })}`;

export function decodeTable(param) {
  if (typeof param !== 'string' || !param.startsWith('tavolo:')) return null;
  try {
    const o = JSON.parse(param.slice(7));
    if (!Array.isArray(o.k)) return null;
    return { keys: o.k.filter((k) => typeof k === 'string').slice(0, 8), view: typeof o.v === 'string' ? o.v : null };
  } catch {
    return null;
  }
}
