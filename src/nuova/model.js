/**
 * Calculations for the new interface. Pure functions on the loaded records (event
 * catalog already applied). Every "edition" is one night: brand + edition label.
 */
import { isEditionOver, midnight, dayDiff, samePointFor, latestPurchase, conversionOf } from '../utils/eventTime';
import { computeWhereAreWeNow, summarizeComparisons, computeEditionUserLists } from '../utils/comparisonEngine';
import { normalizePhone } from '../utils/datasetMerge';
import { nightNameKey } from '../utils/eventNameCleaner';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const round1 = (n) => Math.round(n * 10) / 10;

export const VENUE_KEYS = {
  'La Casa dei Gelsi': 'gelsi',
  "Tenuta Villa Peggy's": 'peggy',
  "Villa Peggy's": 'peggy',
  TooLate: 'toolate',
  Studios: 'studios',
};
export const VENUES = [['La Casa dei Gelsi', 'gelsi'], ["Tenuta Villa Peggy's", 'peggy'], ['TooLate', 'toolate'], ['Studios', 'studios']];
export const venueKey = (v) => VENUE_KEYS[v] || 'other';

/** A person across exports: phone first (same person, several emails), then email, then name. */
export const personKey = (r) => normalizePhone(r.phone) || (r.email || '').toLowerCase() || (r.fullName || '').toLowerCase() || null;

export function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = (s.length - 1) / 2;
  return (s[Math.floor(m)] + s[Math.ceil(m)]) / 2;
}

const isDateLabel = (s) => /^\d{2}\.\d{2}\.\d{2}$/.test(s || '');

/** One entry per night, oldest first. */
export function indexEditions(records, now = new Date()) {
  const map = new Map();
  for (const r of records) {
    if (!r.brand) continue;
    const key = `${r.brand}|${r.editionLabel}`;
    let e = map.get(key);
    if (!e) {
      e = { key, brand: r.brand, edition: r.editionLabel, date: r.eventDate || null, genres: r.genres || [], category: r.category, rawName: r.rawEventName, rawNames: new Set(), venueCount: {}, rows: [], reg: 0, ent: 0, firstReg: null };
      map.set(key, e);
    }
    e.rows.push(r);
    if (r.rawEventName) e.rawNames.add(r.rawEventName);
    if (r.purchaseDate && (!e.firstReg || r.purchaseDate < e.firstReg)) e.firstReg = r.purchaseDate;
    e.reg++;
    if (r.attended) e.ent++;
    if (!e.date && r.eventDate) e.date = r.eventDate;
    const v = r.location || '';
    e.venueCount[v] = (e.venueCount[v] || 0) + 1;
  }
  for (const e of map.values()) {
    e.venue = Object.entries(e.venueCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    delete e.venueCount;
    e.rawNames = [...e.rawNames];
    e.over = !!e.date && isEditionOver(e.date, now);
    e.hasScans = e.ent > 0;
    e.conv = e.over && e.hasScans ? round1((100 * e.ent) / e.reg) : null;
    // Catalog names ("ATIPICO w/ DANTE from LOSTBOYS") are more telling than the date
    e.title = isDateLabel(e.edition) ? e.brand : e.edition;
    // Days before the event when registrations opened (first registration)
    e.openLead = e.date && e.firstReg ? Math.max(0, dayDiff(e.firstReg, e.date)) : null;
    e.season = e.date ? seasonOf(e.date) : null;
  }
  const list = [...map.values()].sort((a, b) => (a.date || 0) - (b.date || 0));
  // Position in the season: 1st Atipico of 25-26, 1st night at TooLate of 25-26
  const nth = new Map();
  for (const e of list) {
    if (!e.date) continue;
    for (const [field, k] of [['seasonNo', `b|${e.brand}|${e.season}`], ['venueSeasonNo', `v|${e.venue}|${e.season}`]]) {
      const n = (nth.get(k) || 0) + 1;
      nth.set(k, n);
      e[field] = n;
    }
  }
  return list;
}

/** Season of a night: September to August, as "25-26". */
export function seasonOf(date) {
  const y = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
}

export function summaryKpis(records, eds, people) {
  return {
    reg: records.length,
    ent: records.filter((r) => r.attended).length,
    conv: conversionOf(records),
    nights: eds.filter((e) => e.over).length,
    brands: new Set(eds.filter((e) => e.over).map((e) => e.brand)).size,
    people: people.total,
    returned: people.returned,
  };
}

const avg = (list, f) => (list.length ? Math.round(list.reduce((s, x) => s + f(x), 0) / list.length) : 0);
function convOfEditions(list) {
  const scanned = list.filter((e) => e.hasScans);
  const reg = scanned.reduce((s, e) => s + e.reg, 0);
  return reg ? round1((100 * scanned.reduce((s, e) => s + e.ent, 0)) / reg) : null;
}

/** Concluded nights per brand. trend = last 3 vs previous 3 (with 6+ nights). */
export function brandTable(eds) {
  const byBrand = new Map();
  for (const e of eds) {
    if (!byBrand.has(e.brand)) byBrand.set(e.brand, []);
    byBrand.get(e.brand).push(e);
  }
  const rows = [];
  for (const [brand, list] of byBrand) {
    const done = list.filter((e) => e.over);
    const next = list.find((e) => e.date && !e.over);
    if (!done.length && !next) continue;
    const last3 = done.slice(-3), prev3 = done.slice(-6, -3);
    const ref = done[done.length - 1] || next;
    rows.push({
      brand,
      venue: ref.venue,
      category: ref.category,
      genres: ref.genres,
      editions: done.length,
      avgReg: avg(done, (e) => e.reg),
      conv: convOfEditions(done),
      last: done.length ? done[done.length - 1].reg : null,
      trend: done.length >= 6 ? Math.round((100 * (avg(last3, (e) => e.reg) - avg(prev3, (e) => e.reg))) / avg(prev3, (e) => e.reg)) : null,
      series: done.map((e) => e.reg),
      next: next ? next.date : null,
    });
  }
  return rows;
}

/** Concluded nights grouped by any key (genre, venue). A night with two genres counts in both. */
export function groupTable(eds, keysOf) {
  const groups = new Map();
  for (const e of eds.filter((x) => x.over)) {
    for (const k of keysOf(e)) {
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }
  }
  return [...groups].map(([key, list]) => ({
    key,
    brands: new Set(list.map((e) => e.brand)).size,
    editions: list.length,
    avgReg: avg(list, (e) => e.reg),
    conv: convOfEditions(list),
    total: list.reduce((s, e) => s + e.reg, 0),
  }));
}

/**
 * Registrations by promoter link (the export's "promoter" column; "lanza*" and
 * "lanza" are the same promoter). Conversion on concluded nights with entries.
 */
export function promoterTable(records, eds) {
  const night = new Map(eds.map((e) => [e.key, e]));
  const map = new Map();
  let tagged = 0;
  for (const r of records) {
    const name = (r.promoter || '').toLowerCase().replace(/\*+$/, '').trim();
    if (!name) continue;
    tagged++;
    if (!map.has(name)) map.set(name, { name, reg: 0, nights: new Set(), convReg: 0, convEnt: 0, last: null });
    const p = map.get(name);
    p.reg++;
    const key = `${r.brand}|${r.editionLabel}`;
    p.nights.add(key);
    const e = night.get(key);
    if (e?.over && e.hasScans) { p.convReg++; if (r.attended) p.convEnt++; }
    if (r.eventDate && (!p.last || r.eventDate > p.last)) p.last = r.eventDate;
  }
  const rows = [...map.values()].map((p) => ({
    name: p.name, reg: p.reg, nights: p.nights.size, ent: p.convEnt,
    conv: p.convReg ? round1((100 * p.convEnt) / p.convReg) : null, last: p.last,
  })).sort((a, b) => b.reg - a.reg);
  return { rows, tagged, share: records.length ? round1((100 * tagged) / records.length) : 0 };
}

export function hourCounts(records) {
  const reg = Array(24).fill(0), ent = Array(24).fill(0);
  const dowHour = Array.from({ length: 7 }, () => Array(24).fill(0));
  const daysBefore = Array(15).fill(0);
  for (const r of records) {
    if (r.purchaseDate) {
      reg[r.purchaseDate.getHours()]++;
      dowHour[r.purchaseDate.getDay()][r.purchaseDate.getHours()]++;
    }
    if (r.scanDate) ent[r.scanDate.getHours()]++;
    if (r.daysBefore != null) daysBefore[Math.min(14, r.daysBefore)]++;
  }
  return { reg, ent, dowHour, daysBefore };
}

const AGE_BUCKETS = [18, 21, 25, 30, 40];
function ageBucket(birthDate, at) {
  if (!birthDate) return null;
  const age = (at - birthDate) / (365.25 * 24 * HOUR);
  const i = AGE_BUCKETS.findIndex((limit) => age < limit);
  return i === -1 ? AGE_BUCKETS.length : i;
}

export function peopleStats(records, now = new Date()) {
  const people = new Map();
  for (const r of records) {
    const k = personKey(r);
    if (!k) continue;
    let p = people.get(k);
    if (!p) { p = { attended: new Set(), gender: r.gender, birthDate: r.birthDate }; people.set(k, p); }
    if (r.attended) p.attended.add(`${r.brand}|${r.editionLabel}`);
    if (!p.birthDate && r.birthDate) p.birthDate = r.birthDate;
    if (!p.gender && r.gender) p.gender = r.gender;
  }
  const list = [...people.values()];
  const came = list.filter((p) => p.attended.size > 0);
  const ages = Array(AGE_BUCKETS.length + 1).fill(0);
  for (const p of list) { const b = ageBucket(p.birthDate, now); if (b != null) ages[b]++; }
  return {
    total: list.length,
    came: came.length,
    returned: came.filter((p) => p.attended.size >= 2).length,
    perPerson: came.length ? round1(came.reduce((s, p) => s + p.attended.size, 0) / came.length) : 0,
    gender: { M: list.filter((p) => p.gender === 'M').length, F: list.filter((p) => p.gender === 'F').length },
    ages,
  };
}
export const AGE_LABELS = ['sotto 18', '18–20', '21–24', '25–29', '30–39', '40+'];

export function birthdaysNext(utenti, now = new Date(), days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { date: d, count: utenti.filter((u) => u.birthDate && u.birthDate.getDate() === d.getDate() && u.birthDate.getMonth() === d.getMonth()).length };
  });
}

// ---------------------------------------------------------------- series

/*
 * A series is a set of nights grouped by hand across brands (e.g. the season openings
 * of a venue). It lives in the event catalog as { name: [{ name, date }] }: the night's
 * name in the export and its day, which survive brand renames and new exports.
 */
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const memberKey = (name, day) => `${nightNameKey(name)}|${day}`;
const editionMemberKeys = (e) => (e.date ? e.rawNames.map((n) => memberKey(n, ymd(e.date))) : []);

export const seriesMember = (ed) => ({ name: ed.rawName, date: ymd(ed.date) });

/** Catalog id of a night (notes, typed-in counts): its day and export name. */
export const nightId = (ed) => (ed.date && ed.rawName ? `${ymd(ed.date)}_${nightNameKey(ed.rawName)}` : null);

/**
 * The count typed in from the ticketing portal for a night, when it is newer than
 * the export (otherwise the export already says more): { value, at: Date, by }.
 */
export function typedCount(counts, ed, dataAsOf) {
  const typed = lookupNight(counts, ed);
  if (!typed || !(typed.value > 0)) return null;
  const at = new Date(typed.at);
  return !dataAsOf || at > dataAsOf ? { ...typed, at } : null;
}

/** A night's entry in a catalog map keyed by nightId, whichever export name it was saved under. */
export function lookupNight(map, ed) {
  if (!map || !ed?.date) return null;
  for (const n of ed.rawNames || [ed.rawName]) {
    const v = map[`${ymd(ed.date)}_${nightNameKey(n)}`];
    if (v) return v;
  }
  return null;
}

/** Series with their nights (oldest first) and the series of each night. */
export function indexSeries(eds, series) {
  const byMember = new Map();
  for (const e of eds) for (const k of editionMemberKeys(e)) byMember.set(k, e);
  const list = [];
  const ofEdition = new Map();
  for (const [name, members] of Object.entries(series || {}).sort((a, b) => a[0].localeCompare(b[0]))) {
    const found = [...new Set((members || []).map((m) => byMember.get(memberKey(m.name, m.date))).filter(Boolean))]
      .sort((a, b) => a.date - b.date);
    list.push({ name, eds: found, hidden: (members || []).length - found.length });
    for (const e of found) if (!ofEdition.has(e.key)) ofEdition.set(e.key, name);
  }
  return { list, ofEdition };
}

/**
 * Catalog with series `name` set to `nights`. Members not among `eds` (hidden by the
 * venue filter) are kept, so saving from a filtered view doesn't drop them.
 */
export function withSeries(config, name, nights, eds) {
  const visible = new Set(eds.flatMap(editionMemberKeys));
  const kept = (config?.series?.[name] || []).filter((m) => !visible.has(memberKey(m.name, m.date)));
  return { ...(config || {}), series: { ...(config?.series || {}), [name]: [...kept, ...nights.filter((e) => e.date).map(seriesMember)] } };
}

export function withoutSeries(config, name) {
  const series = { ...(config?.series || {}) };
  delete series[name];
  return { ...(config || {}), series };
}

/** The nights a night is compared with: its series if it has one, else its brand. */
export function peersOf(ed, eds, seriesIdx) {
  const name = seriesIdx?.ofEdition.get(ed.key);
  if (name) return { series: name, eds: seriesIdx.list.find((s) => s.name === name).eds };
  return { series: null, eds: eds.filter((e) => e.brand === ed.brand) };
}

// ---------------------------------------------------------------- tracker

const cumAt = (cumulative, d) => {
  const keys = Object.keys(cumulative).map(Number);
  if (!keys.length) return 0;
  return d > Math.max(...keys) ? 0 : (cumulative[d] ?? 0);
};

// The tracker curves cover up to 60 days before the event (the screen shows 14, 30 or 60)
export const TRACKER_MAX_DAYS = 60;

const SERIES_BRAND = '\u0000series';

/**
 * Tracker for the upcoming nights within `horizonDays`, nearest first. A night in a
 * series is compared with the other nights of the series instead of its brand.
 */
export function upcomingEvents(records, eds, now = new Date(), horizonDays = 60, seriesIdx = null, counts = null) {
  const dataAsOf = latestPurchase(records);
  return eds
    .filter((e) => e.date && !e.over && dayDiff(now, e.date) <= horizonDays)
    .map((e) => {
      const series = seriesIdx?.ofEdition.get(e.key) || null;
      let pool = records, brand = e.brand, edition = e.edition;
      if (series) {
        // The series as one synthetic brand, one edition per night
        pool = peersOf(e, eds, seriesIdx).eds.flatMap((p) => p.rows.map((r) => ({ ...r, brand: SERIES_BRAND, editionLabel: p.key })));
        brand = SERIES_BRAND;
        edition = e.key;
      }
      // A count typed in from the ticketing portal, newer than the export, is today's number
      const manual = typedCount(counts, e, dataAsOf);
      const t = manual
        ? computeWhereAreWeNow(pool, brand, edition, { mode: 'now', value: manual.value }, { now: manual.at, dataAsOf })
        : computeWhereAreWeNow(pool, brand, edition, null, { now, dataAsOf });
      if (!t) return null;
      const at = t.comparisons.map((c) => c.atSamePointAdjusted);
      const lists = computeEditionUserLists(pool, brand, edition);
      const maxD = TRACKER_MAX_DAYS;
      const band = [];
      for (let d = maxD; d >= 0; d--) {
        const vals = t.comparisons.map((c) => cumAt(c.cumulative, d));
        band.push({ d, cur: t.targetCumulative[d] ?? null, min: vals.length ? Math.min(...vals) : null, med: median(vals), max: vals.length ? Math.max(...vals) : null });
      }
      return {
        ed: e,
        series,
        manual,
        tracker: t,
        range: at.length ? [Math.min(...at), median(at), Math.max(...at)] : null,
        retarget: lists.retarget.filter((u) => u.phone).length,
        band,
      };
    })
    .filter(Boolean);
}

/** The night in progress: event day started and not over yet. */
export function tonightEdition(eds, now = new Date()) {
  return eds.find((e) => e.date && !e.over && midnight(e.date) <= now) || null;
}

const NIGHT_HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];

/**
 * Hour by hour on the event day (12:00 → 03:00): registrations and entries so far
 * against past nights of the same brand (or series) at the same hour.
 */
export function liveNight(ed, eds, records, now = new Date(), seriesIdx = null, counts = null) {
  const dataAsOf = latestPurchase(records);
  // A count typed in from the portal, newer than the export, is the registrations of now
  const typed = typedCount(counts, ed, dataAsOf);
  const reference = typed ? typed.at : dataAsOf && dataAsOf < now ? dataAsOf : now;
  const day0 = midnight(ed.date).getTime();
  const peers = peersOf(ed, eds, seriesIdx);
  const past = peers.eds.filter((e) => e.over && e.key !== ed.key);
  const countUntil = (rows, t, field) => rows.filter((r) => r[field] && r[field].getTime() <= t).length;
  const refHour = (reference.getTime() - day0) / HOUR;
  const hours = [...NIGHT_HOURS, refHour].filter((h, i, a) => a.indexOf(h) === i).sort((a, b) => a - b);
  const points = hours.map((h) => {
    const regs = past.map((p) => countUntil(p.rows, midnight(p.date).getTime() + h * HOUR, 'purchaseDate'));
    const ents = past.map((p) => countUntil(p.rows, midnight(p.date).getTime() + h * HOUR, 'scanDate'));
    const mine = h <= refHour + 1e-9;
    return {
      h,
      reg: mine ? Math.max(countUntil(ed.rows, day0 + h * HOUR, 'purchaseDate'), typed && h === refHour ? typed.value : 0) : null,
      ent: mine ? countUntil(ed.rows, day0 + h * HOUR, 'scanDate') : null,
      regMin: regs.length ? Math.min(...regs) : null, regMed: median(regs), regMax: regs.length ? Math.max(...regs) : null,
      entMin: ents.length ? Math.min(...ents) : null, entMed: median(ents), entMax: ents.length ? Math.max(...ents) : null,
      regAvg: avg(regs, (x) => x),
    };
  });
  const nowPoint = points.find((p) => p.h === refHour);
  return { reference, refHour, points, past: past.length, series: peers.series, now: nowPoint, notIn: Math.max(0, (nowPoint?.reg ?? ed.reg) - ed.ent), typed };
}

// ---------------------------------------------------------------- comparison table

/** Cumulative registrations by days before the event (maxDays → 0), up to where data stops. */
export function curveByDays(ed, maxDays = 30, now = new Date()) {
  const stop = ed.over ? 0 : Math.max(0, dayDiff(now, ed.date));
  const counts = Array(maxDays + 1).fill(0);
  for (const r of ed.rows) if (r.daysBefore != null) counts[Math.min(maxDays, r.daysBefore)]++;
  const out = [];
  let run = 0;
  for (let d = maxDays; d >= 0; d--) {
    run += counts[d];
    out.push({ x: d === 0 ? 0 : -d, y: d >= stop ? run : null });
  }
  return out;
}

/** Cumulative registrations on the event day, 12:00 → 03:00 (null after now). */
export function curveByHours(ed, now = new Date()) {
  const day0 = midnight(ed.date).getTime();
  const sorted = ed.rows.map((r) => r.purchaseDate?.getTime()).filter(Boolean).sort((a, b) => a - b);
  return NIGHT_HOURS.map((h) => {
    const t = day0 + h * HOUR;
    if (!ed.over && t > now.getTime()) return { x: h, y: null };
    let n = 0;
    while (n < sorted.length && sorted[n] <= t) n++;
    return { x: h, y: n };
  });
}

/** For every person: dates of the nights they came to (for "returning" shares). */
export function attendanceIndex(records) {
  const idx = new Map();
  for (const r of records) {
    if (!r.attended || !r.eventDate) continue;
    const k = personKey(r);
    if (!k) continue;
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push(r.eventDate.getTime());
  }
  return idx;
}

function mode(values) {
  const c = new Map();
  for (const v of values) c.set(v, (c.get(v) || 0) + 1);
  let best = null, n = -1;
  for (const [v, k] of c) if (k > n) { best = v; n = k; }
  return best;
}

/** Side-by-side numbers for one night. */
export function editionMetrics(ed, attendance, now = new Date()) {
  const rows = ed.rows;
  const people = new Set(rows.map(personKey).filter(Boolean));
  const at = ed.date || new Date();
  const ages = [0, 0, 0];
  let withAge = 0;
  for (const r of rows) {
    const b = ageBucket(r.birthDate, at);
    if (b == null) continue;
    withAge++;
    ages[b === 0 ? 0 : b <= 2 ? 1 : 2]++;
  }
  const genders = rows.filter((r) => r.gender === 'M' || r.gender === 'F');
  let returning = 0, entered = 0, back = 0;
  if (ed.date) {
    const t0 = ed.date.getTime();
    for (const k of people) {
      const dates = attendance.get(k);
      if (dates && dates.some((t) => t < t0)) returning++;
    }
    // Came in, then came back to another night within 30 days (once 30 days have passed)
    if (ed.over && now.getTime() - t0 >= 31 * DAY) {
      for (const k of new Set(rows.filter((r) => r.attended).map(personKey).filter(Boolean))) {
        entered++;
        const dates = attendance.get(k);
        if (dates && dates.some((t) => t > t0 && t <= t0 + 30 * DAY)) back++;
      }
    }
  }
  const days = rows.map((r) => r.daysBefore).filter((d) => d != null);
  return {
    reg: ed.reg,
    ent: ed.hasScans ? ed.ent : null,
    conv: ed.conv,
    // On a night still on sale the day-of registrations haven't happened yet
    dayOf: ed.over && rows.length ? round1((100 * days.filter((d) => d === 0).length) / rows.length) : null,
    medianDays: ed.over ? median(days) : null,
    peakReg: mode(rows.map((r) => r.purchaseDate?.getHours()).filter((h) => h != null)),
    peakEnt: ed.hasScans ? mode(rows.filter((r) => r.scanDate).map((r) => r.scanDate.getHours())) : null,
    female: genders.length ? round1((100 * genders.filter((r) => r.gender === 'F').length) / genders.length) : null,
    under18: withAge ? round1((100 * ages[0]) / withAge) : null,
    age18to24: withAge ? round1((100 * ages[1]) / withAge) : null,
    over25: withAge ? round1((100 * ages[2]) / withAge) : null,
    returning: people.size ? round1((100 * returning) / people.size) : null,
    newcomers: ed.date ? people.size - returning : null,
    back30: entered ? round1((100 * back) / entered) : null,
    openLead: ed.openLead ?? null,
    seasonNo: ed.seasonNo ?? null,
  };
}

/** People in common between every pair of row lists (a night, or a group of nights). */
export function audienceOverlap(rowLists) {
  const sets = rowLists.map((rows) => new Set(rows.map(personKey).filter(Boolean)));
  return sets.map((_, i) => sets.map((__, j) => {
    if (i === j) return { n: sets[i].size, pct: 100 };
    let n = 0;
    for (const k of sets[i]) if (sets[j].has(k)) n++;
    return { n, pct: sets[i].size ? round1((100 * n) / sets[i].size) : 0 };
  }));
}

/**
 * Projection of an upcoming night from nights chosen by hand: each reference says
 * "at this point I had X, I ended with Y" (same rule as the tracker). With a count
 * typed in from the portal ({ value, at }) the point is the moment it was typed.
 */
export function projectFromSet(target, refs, records, now = new Date(), typed = null) {
  const dataAsOf = latestPurchase(records);
  const reference = typed ? typed.at : dataAsOf && dataAsOf < now ? dataAsOf : now;
  const current = typed ? typed.value : target.reg;
  const comps = refs.filter((r) => r.over && r.date).map((r) => {
    const cutoff = samePointFor(r.date, reference, target.date);
    return { ed: r, eventDate: r.date, atSamePointAdjusted: r.rows.filter((x) => x.purchaseDate && x.purchaseDate <= cutoff).length, totalFinal: r.reg };
  });
  const summary = summarizeComparisons(comps, current, false);
  return { reference, current, pointDaysBefore: Math.max(0, dayDiff(reference, target.date)), comps, ...summary };
}
