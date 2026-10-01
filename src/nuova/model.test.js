import {
  indexEditions, brandTable, groupTable, peopleStats, curveByDays, curveByHours,
  editionMetrics, attendanceIndex, audienceOverlap, projectFromSet, tonightEdition, liveNight,
  indexSeries, withSeries, withoutSeries, upcomingEvents, peersOf,
} from './model';
import { daysBeforeEvent } from '../utils/eventTime';

const NOW = new Date(2026, 9, 1, 15, 0);
const H = 3600000;

// rows for one night: [hoursFromEventDayMidnight, phone, attended]
function night(brand, edition, eventDate, venue, people) {
  return people.map(([hours, phone, attended], i) => {
    const purchaseDate = new Date(eventDate.getTime() + hours * H);
    return {
      brand, editionLabel: edition, eventDate, location: venue, genres: ['commerciale'], category: 'standard',
      purchaseDate, daysBefore: daysBeforeEvent(purchaseDate, eventDate), attended,
      scanDate: attended ? new Date(eventDate.getTime() + 23 * H) : null,
      phone, email: `${phone}@x.it`, fullName: `P ${phone}`, gender: i % 2 ? 'F' : 'M', birthDate: new Date(2004, 0, 1),
    };
  });
}

const sep = new Date(2026, 8, 3), aug = new Date(2026, 7, 27), oct = new Date(2026, 9, 10);
const records = [
  ...night('GELSI', '27.08.26', aug, 'La Casa dei Gelsi', [[-30, '1', true], [12, '2', true], [20, '3', false], [21, '4', true]]),
  ...night('GELSI', '03.09.26', sep, 'La Casa dei Gelsi', [[-30, '1', true], [12, '2', false], [20, '5', true], [22, '6', true], [22.5, '7', true]]),
  ...night('ROOKIE', '10.10.26', oct, 'Studios', [[-240, '1', false], [-200, '8', false]]),
];

describe('model', () => {
  const eds = indexEditions(records, NOW);

  it('indexes nights with venue, conversion and status', () => {
    expect(eds.map((e) => e.key)).toEqual(['GELSI|27.08.26', 'GELSI|03.09.26', 'ROOKIE|10.10.26']);
    expect(eds[0]).toMatchObject({ reg: 4, ent: 3, conv: 75, over: true, venue: 'La Casa dei Gelsi' });
    expect(eds[2]).toMatchObject({ over: false, conv: null });
  });

  it('builds brand and venue tables from concluded nights', () => {
    const gelsi = brandTable(eds).find((b) => b.brand === 'GELSI');
    expect(gelsi).toMatchObject({ editions: 2, avgReg: 5, series: [4, 5], last: 5 });
    expect(brandTable(eds).find((b) => b.brand === 'ROOKIE')).toMatchObject({ editions: 0, next: oct });
    expect(groupTable(eds, (e) => [e.venue])).toEqual([{ key: 'La Casa dei Gelsi', brands: 1, editions: 2, avgReg: 5, conv: 77.8, total: 9 }]);
  });

  it('counts people once across nights', () => {
    const p = peopleStats(records, NOW);
    expect(p.total).toBe(8);
    expect(p.returned).toBe(1); // phone 1 came twice
  });

  it('aligns curves on days before and on the hours of the night', () => {
    const c = curveByDays(eds[1], 3, NOW);
    expect(c).toEqual([{ x: -3, y: 0 }, { x: -2, y: 1 }, { x: -1, y: 1 }, { x: 0, y: 5 }]);
    const h = curveByHours(eds[1], NOW);
    expect(h.find((p) => p.x === 21).y).toBe(3);
    expect(h.find((p) => p.x === 23).y).toBe(5);
    // upcoming night: nothing after now
    expect(curveByDays(eds[2], 10, NOW).filter((p) => p.y != null).map((p) => p.x)).toEqual([-10, -9]);
  });

  it('compares numbers, returning people and audience in common', () => {
    const m = editionMetrics(eds[1], attendanceIndex(records));
    expect(m).toMatchObject({ reg: 5, ent: 4, conv: 80, returning: 40 }); // phones 1 and 2 came on 27/8
    const o = audienceOverlap([eds[0], eds[1]]);
    expect(o[0][1]).toEqual({ n: 2, pct: 50 });
  });

  it('projects an upcoming night from nights chosen by hand', () => {
    const p = projectFromSet(eds[2], [eds[0], eds[1]], records, NOW);
    expect(p.comps).toHaveLength(2);
    expect(p.pointDaysBefore).toBe(9);
    expect(p.comps.every((c) => c.atSamePointAdjusted === 0)).toBe(true); // nobody 9 days before
    expect(p.projection).toBeNull();
  });

  it('finds the night in progress and compares it hour by hour', () => {
    const at = new Date(2026, 8, 3, 21, 30);
    const live = indexEditions(records, at);
    const tonight = tonightEdition(live, at);
    expect(tonight.key).toBe('GELSI|03.09.26');
    const view = liveNight(tonight, live, records.filter((r) => r.purchaseDate <= at), at);
    expect(view.now).toMatchObject({ reg: 3, regMed: 3 });
  });
});

describe('series', () => {
  const named = (rows, rawEventName) => rows.map((r) => ({ ...r, rawEventName }));
  const op25 = new Date(2025, 9, 18), ati = new Date(2025, 10, 22), op26 = new Date(2026, 9, 9);
  const recs = [
    // last year's opening: 2 registrations by 10 Oct 14:00 (same point as today), 5 in the end
    ...named(night('ATIPICO', '18.10.25', op25, 'TooLate', [[-240, '1', true], [-200, '2', true], [-100, '3', false], [20, '4', true], [22, '5', true]]), '18.10.25 TOO LATE OPENING PARTY - ATIPICO w/ IDRISS D'),
    ...named(night('ATIPICO', '22.11.25', ati, 'TooLate', [[-30, '1', true], [20, '6', true]]), 'VENERD� 22 NOVEMBRE - ATIPICO'),
    // this year's opening: its own brand, 3 registrations by 1 Oct 14:00
    ...named(night('TOO LATE - OPENING PARTY', '09.10.26', op26, 'TooLate', [[-336, '7', false], [-240, '8', false], [-178, '9', false]]), 'TOO LATE - OPENING PARTY w/GERMANO VENTURA'),
  ];
  const eds = indexEditions(recs, NOW);
  const config = { brands: { X: {} }, series: { 'Opening Too Late': [
    { name: '18.10.25 TOO LATE OPENING PARTY - ATIPICO w/ IDRISS D', date: '2025-10-18' },
    { name: 'TOO LATE - OPENING PARTY w/GERMANO VENTURA', date: '2026-10-09' },
  ] } };

  it('finds the nights of a series by export name and day, accents or not', () => {
    const idx = indexSeries(eds, config.series);
    expect(idx.list[0].eds.map((e) => e.key)).toEqual(['ATIPICO|18.10.25', 'TOO LATE - OPENING PARTY|09.10.26']);
    expect(idx.ofEdition.get('ATIPICO|22.11.25')).toBeUndefined();
    const accents = indexSeries(eds, { A: [{ name: 'VENERDÌ 22 NOVEMBRE - ATIPICO', date: '2025-11-22' }, { name: 'VENERDÌ 22 NOVEMBRE - ATIPICO', date: '2025-11-29' }] });
    expect(accents.list[0]).toMatchObject({ hidden: 1 });
    expect(accents.list[0].eds.map((e) => e.key)).toEqual(['ATIPICO|22.11.25']);
  });

  it('compares a night with its series instead of its brand', () => {
    const plain = upcomingEvents(recs, eds, NOW, 60);
    expect(plain[0]).toMatchObject({ series: null });
    expect(plain[0].tracker.comparisons).toHaveLength(0);
    const idx = indexSeries(eds, config.series);
    const [item] = upcomingEvents(recs, eds, NOW, 60, idx);
    expect(item.series).toBe('Opening Too Late');
    expect(item.tracker.currentRegistrations).toBe(3);
    expect(item.tracker.pointDaysBefore).toBe(8);
    expect(item.tracker.comparisons).toHaveLength(1); // the Atipico of November stays out
    expect(item.tracker.comparisons[0]).toMatchObject({ atSamePointAdjusted: 2, totalFinal: 5 });
    expect(item.tracker.avgAtSamePoint).toBe(2);
    expect(item.retarget).toBe(4); // came to last year's opening (phones 1, 2, 4, 5), not registered yet
    expect(peersOf(eds[2], eds, idx).series).toBe('Opening Too Late');
    expect(peersOf(eds[1], eds, idx)).toMatchObject({ series: null });
  });

  it('saves a series keeping nights hidden by the venue filter', () => {
    const before = { ...config, series: { Opening: [{ name: 'OLD 2024', date: '2024-11-09' }, { name: 'VENERDÌ 22 NOVEMBRE - ATIPICO', date: '2025-11-22' }] } };
    const after = withSeries(before, 'Opening', [eds[0], eds[2]], eds);
    expect(after.brands).toEqual({ X: {} });
    expect(after.series.Opening).toEqual([
      { name: 'OLD 2024', date: '2024-11-09' },
      { name: '18.10.25 TOO LATE OPENING PARTY - ATIPICO w/ IDRISS D', date: '2025-10-18' },
      { name: 'TOO LATE - OPENING PARTY w/GERMANO VENTURA', date: '2026-10-09' },
    ]);
    expect(withoutSeries(after, 'Opening').series).toEqual({});
  });
});
