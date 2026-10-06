import { indexEditions, attendanceIndex } from './model';
import {
  chipCatalog, resolveSet, describeSet, setName, setStats, insights, setOverlap, setFlow, presets,
  encodeSets, decodeSets, readStoredSets, rowDiff,
} from './sets';
import { daysBeforeEvent } from '../utils/eventTime';

const NOW = new Date(2026, 9, 1, 15, 0);
const H = 3600000;

// rows for one night: [hoursFromEventDayMidnight, phone, attended]
function night(brand, raw, eventDate, venue, genres, people) {
  return people.map(([hours, phone, attended]) => {
    const purchaseDate = new Date(eventDate.getTime() + hours * H);
    return {
      brand, editionLabel: raw, rawEventName: raw, eventDate, location: venue, genres, category: 'standard',
      purchaseDate, daysBefore: daysBeforeEvent(purchaseDate, eventDate), attended,
      scanDate: attended ? new Date(eventDate.getTime() + 23 * H) : null, phone, email: `${phone}@x.it`, fullName: `P ${phone}`,
      gender: Number(phone) % 2 ? 'M' : 'F', birthDate: new Date(2004, 0, 1),
    };
  });
}

const fri = new Date(2025, 9, 17), sat = new Date(2025, 9, 18), sat2 = new Date(2025, 10, 15), fri2 = new Date(2025, 10, 21), next = new Date(2026, 9, 9);
const many = (n, from, came = true) => Array.from({ length: n }, (_, i) => [20, String(from + i), came]);
const records = [
  ...night('AMARCORD', 'AMARCORD 17.10.25', fri, 'TooLate', ['commerciale'], many(10, 100)),
  ...night('ATIPICO', 'ATIPICO 18.10.25', sat, 'TooLate', ['elettronica'], [...many(4, 200), [10, '100', true]]),
  ...night('ATIPICO', 'ATIPICO 15.11.25', sat2, 'TooLate', ['elettronica'], [...many(4, 300), [10, '200', true]]),
  ...night('GELSI', 'GELSI 21.11.25', fri2, 'La Casa dei Gelsi', ['commerciale'], many(20, 400, false).map((p, i) => [p[0], p[1], i < 10])),
  ...night('ATIPICO', 'ATIPICO OPENING 2026', next, 'TooLate', ['elettronica'], many(3, 500, false).map((p) => [-100, p[1], false])),
];
const eds = indexEditions(records, NOW);
const key = (raw) => eds.find((e) => e.rawName === raw).key;
const catalog = chipCatalog(eds, null);
const set = (...chips) => ({ chips: chips.map(([kind, value]) => ({ kind, value })), excluded: [] });

describe('sets', () => {
  it('lists every element with how many nights it covers', () => {
    expect(catalog.find((c) => c.kind === 'brand' && c.value === 'ATIPICO').n).toBe(3);
    expect(catalog.find((c) => c.kind === 'dow' && c.value === 6)).toMatchObject({ label: 'sabato', n: 2 });
    expect(catalog.find((c) => c.kind === 'venue' && c.value === 'TooLate').n).toBe(4);
    expect(catalog.filter((c) => c.kind === 'night')[0].label).toBe('ATIPICO OPENING 2026'); // newest first
  });

  it('adds up elements of the same kind and narrows down across kinds', () => {
    const either = resolveSet(set(['brand', 'ATIPICO'], ['brand', 'AMARCORD']), eds, null);
    expect(either.done.map((e) => e.rawName)).toEqual(['AMARCORD 17.10.25', 'ATIPICO 18.10.25', 'ATIPICO 15.11.25']);
    expect(either.onSale.map((e) => e.rawName)).toEqual(['ATIPICO OPENING 2026']);
    const fridaysAtTooLate = resolveSet(set(['venue', 'TooLate'], ['dow', 5]), eds, null);
    expect(fridaysAtTooLate.done.map((e) => e.rawName)).toEqual(['AMARCORD 17.10.25']);
    expect(fridaysAtTooLate.onSale.map((e) => e.rawName)).toEqual(['ATIPICO OPENING 2026']); // a Friday too
    const plusNight = resolveSet(set(['venue', 'TooLate'], ['dow', 5], ['night', key('GELSI 21.11.25')]), eds, null);
    expect(plusNight.done.map((e) => e.rawName)).toEqual(['AMARCORD 17.10.25', 'GELSI 21.11.25']);
    const without = resolveSet({ ...set(['brand', 'ATIPICO']), excluded: [key('ATIPICO 18.10.25')] }, eds, null);
    expect(without.done.map((e) => e.rawName)).toEqual(['ATIPICO 15.11.25']);
    expect(without.excludedCount).toBe(1);
    expect(resolveSet(set(), eds, null).nights).toEqual([]);
  });

  it('describes a set in words and gives it a short name', () => {
    const s = set(['brand', 'ATIPICO'], ['brand', 'AMARCORD'], ['venue', 'TooLate'], ['dow', 6]);
    expect(describeSet(s, catalog)).toBe('Serate di ATIPICO o AMARCORD, a TooLate, di sabato');
    expect(setName(set(['dow', 6]), catalog, 'A')).toBe('sabato');
    expect(setName(set(['night', key('ATIPICO 18.10.25')]), catalog, 'A')).toBe('ATIPICO 18.10.25 18 ott 25');
    expect(setName(s, catalog, 'A')).toBe('A'); // too long: the letter
  });

  it('says what stands out between A and B', () => {
    const att = attendanceIndex(records);
    const sa = setStats(resolveSet(set(['dow', 5]), eds, null).done, att, NOW); // Amarcord 10, Gelsi 20 (half in)
    const sb = setStats(resolveSet(set(['dow', 6]), eds, null).done, att, NOW); // Atipico 5 and 5, all in
    expect(sa).toMatchObject({ nights: 2, reg: 15, people: 30 });
    expect(sb).toMatchObject({ nights: 2, reg: 5 });
    expect(rowDiff(sa.reg, sb.reg, 'n')).toBe(200);
    const found = insights(sa, sb, 'venerdì', 'sabato');
    expect(found[0]).toMatchObject({ key: 'newcomers', side: 'A' }); // 15 new people a night against 4
    expect(found.find((f) => f.key === 'reg').text).toBe('venerdì fa in media il 200% di registrati in più (15 contro 5 a serata).');
    expect(found.find((f) => f.key === 'conv')).toMatchObject({ side: 'B' }); // 100% against 66.7%
  });

  it('counts the people only in A, in both, only in B', () => {
    const a = resolveSet(set(['brand', 'AMARCORD']), eds, null).done;
    const b = resolveSet(set(['brand', 'ATIPICO']), eds, null).done;
    expect(setOverlap(a, b)).toMatchObject({ onlyA: 9, both: 1, onlyB: 8, pctOfA: 10 }); // phone 100 went to both
  });

  it('follows the audience of a set to the next nights', () => {
    const f = setFlow(resolveSet(set(['brand', 'AMARCORD']), eds, null).done, eds, NOW);
    expect(f).toMatchObject({ people: 10, backPct: 10, complete: true });
    expect(f.top[0]).toMatchObject({ brand: 'ATIPICO', pct: 10 });
  });

  it('offers ready-made questions', () => {
    const upcoming = [{ ed: eds.find((e) => e.rawName === 'ATIPICO OPENING 2026') }];
    const list = presets(eds, catalog, upcoming, null);
    expect(list.map((p) => p.id)).toEqual(['next', 'dow', 'genre', 'venue']);
    expect(list[0]).toMatchObject({ A: [{ kind: 'night', value: upcoming[0].ed.key }], B: [{ kind: 'brand', value: 'ATIPICO' }], view: 'previsione' });
  });

  it('puts both sets in a link and keeps only valid elements', () => {
    const p = encodeSets(set(['brand', 'ATIPICO']), set(['dow', 6]), 'curve');
    expect(decodeSets(p)).toEqual({ A: set(['brand', 'ATIPICO']), B: set(['dow', 6]), view: 'curve' });
    expect(decodeSets('insiemi:{bad')).toBeNull();
    expect(readStoredSets('{"A":{"chips":[{"kind":"brand","value":"X"},{"kind":3}]}}')).toEqual({ A: set(['brand', 'X']), B: set() });
  });
});
