import { indexEditions, attendanceIndex, editionMetrics, upcomingEvents, nightId, lookupNight } from './model';
import {
  curveBySales, groupCurve, groupCatalog, suggestionsFor, expectedEntries, projectionAccuracy,
  accuracyFor, audienceFlow, encodeTable, decodeTable,
} from './compare';
import { applyDates } from '../utils/applyEventConfig';
import { daysBeforeEvent } from '../utils/eventTime';
import { nightNameKey } from '../utils/eventNameCleaner';

const NOW = new Date(2026, 9, 1, 15, 0);
const H = 3600000;

// rows for one night: [hoursFromEventDayMidnight, phone, attended]
function night(brand, rawEventName, eventDate, venue, people) {
  return people.map(([hours, phone, attended]) => {
    const purchaseDate = new Date(eventDate.getTime() + hours * H);
    return {
      brand, editionLabel: rawEventName, rawEventName, eventDate, location: venue, genres: ['commerciale'], category: 'standard',
      purchaseDate, daysBefore: daysBeforeEvent(purchaseDate, eventDate), attended,
      scanDate: attended ? new Date(eventDate.getTime() + 23 * H) : null, phone, email: `${phone}@x.it`, fullName: `P ${phone}`,
    };
  });
}

const a1 = new Date(2025, 9, 18), a2 = new Date(2025, 10, 15), b1 = new Date(2025, 10, 22), a3 = new Date(2026, 9, 9);
const records = [
  ...night('A', 'A OPENING', a1, 'TooLate', [[-240, '1', true], [-200, '2', true], [-100, '3', false], [20, '4', true], [22, '5', true]]),
  ...night('A', 'A NOVEMBRE', a2, 'TooLate', [[-150, '1', true], [-30, '6', true], [10, '7', true], [21, '8', true], [22.5, '9', false], [23, '10', false]]),
  ...night('B', 'B NOVEMBRE', b1, 'TooLate', [[-30, '1', true], [20, '14', true]]),
  ...night('A', 'A OPENING 2026', a3, 'TooLate', [[-336, '11', false], [-240, '12', false], [-178, '13', false]]),
];
const eds = indexEditions(records, NOW);
const byName = (n) => eds.find((e) => e.rawName === n);
const [A1, A2, B1, A3] = ['A OPENING', 'A NOVEMBRE', 'B NOVEMBRE', 'A OPENING 2026'].map(byName);

describe('compare', () => {
  it('knows the season, the position in it and when registrations opened', () => {
    expect([A1.season, A3.season]).toEqual(['25-26', '26-27']);
    expect([A1.seasonNo, A2.seasonNo, A3.seasonNo]).toEqual([1, 2, 1]);
    expect([A1.venueSeasonNo, A2.venueSeasonNo, B1.venueSeasonNo, A3.venueSeasonNo]).toEqual([1, 2, 3, 1]);
    expect(A1.openLead).toBe(10);
  });

  it('aligns curves on the day registrations opened', () => {
    const c = curveBySales(A1, 12, NOW);
    expect(c.slice(0, 2)).toEqual([{ x: 0, y: 1 }, { x: 1, y: 2 }]);
    expect(c[5]).toEqual({ x: 5, y: 3 });
    expect(c[10]).toEqual({ x: 10, y: 5 });
    expect(c[11].y).toBeNull(); // the night is over: the curve stops on the event day
  });

  it('draws a group as median and min–max, keeping finished nights at their final value', () => {
    const g = groupCurve([[{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: null }], [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 4 }]]);
    expect(g[2]).toEqual({ x: 2, y: 3.5, min: 3, max: 4 });
  });

  it('builds groups of concluded nights', () => {
    const groups = groupCatalog(eds, null);
    const brand = groups.find((g) => g.key === 'g:brand:A|25-26');
    expect(brand.eds.map((e) => e.rawName)).toEqual(['A OPENING', 'A NOVEMBRE']);
    expect(groups.find((g) => g.kind === 'giorno').label).toBe('TooLate · sabato · 25-26');
    expect(groups.some((g) => g.key.startsWith('g:brand:B'))).toBe(false); // one night is not a group
  });

  it('suggests last year, season openers and the latest of the brand', () => {
    const s = suggestionsFor(A3, eds, null);
    expect(s.map((x) => x.id)).toEqual(['anno', 'brand']); // season openers = same night as a year ago
    expect(s[0].keys).toEqual([A1.key]);
    expect(s[1].keys).toEqual([A1.key, A2.key]);
  });

  it('expects entries from early and late registrations', () => {
    const reference = new Date(2026, 9, 1, 14, 0);
    const e = expectedEntries(A3, [A1, A2], reference, 3, { value: 9, low: 6, high: 12 });
    expect(e.early).toBe(83.3); // A1: 2 of 2 registered by then came in; A2: nobody yet, 4 of 6 overall
    expect(e.late).toBe(66.7);
    expect(e.basedOn).toBe(2);
    expect(e.value).toBe(Math.round(3 * (5 / 6) + 6 * (2 / 3)));
  });

  it('measures how far past projections were from the final count', () => {
    const acc = projectionAccuracy(eds, null);
    const at7 = acc.overall.find((p) => p.d === 7);
    expect(at7).toMatchObject({ n: 1, typical: 58, within20: 0, bias: -58 }); // A2 at 7 days: 1 × 5/2 = 2.5 vs 6
    expect(acc.overall.find((p) => p.d === 14).n).toBe(0);
    expect(accuracyFor(acc, 'A', 6)).toMatchObject({ d: 7, scope: 'all' }); // under 3 cases: all nights
  });

  it('follows the audience to the next nights', () => {
    const f = audienceFlow(A1, eds, NOW);
    expect(f).toMatchObject({ people: 4, back: 1, backPct: 25, complete: true });
    expect(f.top.map((t) => t.brand).sort()).toEqual(['A', 'B']);
  });

  it('counts newcomers, returns within 30 days and the opening lead', () => {
    const m = editionMetrics(A2, attendanceIndex(records), NOW);
    expect(m).toMatchObject({ newcomers: 5, back30: 25, openLead: 7, seasonNo: 2 });
  });

  it('uses a count typed in from the portal when newer than the export', () => {
    const counts = { [nightId(A3)]: { value: 10, at: new Date(2026, 9, 1, 14, 30).toISOString(), by: 'filippo' } };
    expect(lookupNight(counts, A3).value).toBe(10);
    const [item] = upcomingEvents(records, eds, NOW, 60, null, counts);
    expect(item.manual.value).toBe(10);
    expect(item.tracker.currentRegistrations).toBe(10);
    const old = { [nightId(A3)]: { value: 10, at: new Date(2026, 9, 1, 9, 0).toISOString() } };
    expect(upcomingEvents(records, eds, NOW, 60, null, old)[0].manual).toBeNull(); // the export is newer
  });

  it('dates events from the catalog', () => {
    const undated = [{ rawEventName: 'MISTERY NIGHT', brand: 'M', editionLabel: 'MISTERY NIGHT', eventDate: null, purchaseDate: new Date(2026, 9, 1, 12) }];
    const [r] = applyDates(undated, { [nightNameKey('MISTERY NIGHT')]: { name: 'MISTERY NIGHT', date: '2026-10-20' } });
    expect(r.eventDate).toEqual(new Date(2026, 9, 20));
    expect(r.editionLabel).toBe('20.10.26');
    expect(r.daysBefore).toBe(19);
  });

  it('puts a table in a link and reads it back', () => {
    const p = encodeTable(['A|18.10.25', 'g:brand:A|25-26'], 'numeri');
    expect(decodeTable(p)).toEqual({ keys: ['A|18.10.25', 'g:brand:A|25-26'], view: 'numeri' });
    expect(decodeTable('A|18.10.25')).toBeNull();
    expect(decodeTable('tavolo:{oops')).toBeNull();
  });
});
