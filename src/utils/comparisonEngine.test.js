import { computeWhereAreWeNow, summarizeComparisons, computeEditionUserLists } from './comparisonEngine';
import { daysBeforeEvent, isEditionOver, conversionOf } from './eventTime';

// Registration pattern of an edition, in hours from the event-day midnight, with
// the share of final registrations arriving at that moment (sums to 1): most
// people register on the day, some at the door after midnight.
const PATTERN = [
  [-72, 0.05], [-50, 0.05], [-30, 0.1], [-20, 0.1], [-6, 0.1],
  [12, 0.1], [14, 0.1], [18, 0.15], [21, 0.15], [23, 0.05], [24.5, 0.05],
];

const at = (eventDate, hours) => new Date(eventDate.getTime() + hours * 3600000);

function edition(brand, label, eventDate, total, until = Infinity) {
  const rows = [];
  for (const [hours, share] of PATTERN) {
    if (hours > until) continue;
    for (let i = 0; i < Math.round(total * share); i++) {
      const purchaseDate = at(eventDate, hours);
      rows.push({ brand, editionLabel: label, eventDate, purchaseDate, daysBefore: daysBeforeEvent(purchaseDate, eventDate), attended: false });
    }
  }
  return rows;
}

const past = (n, total) => edition('B', `past${n}`, new Date(2026, 5, 4 + 7 * n), total);
const pastEditions = [past(0, 200), past(1, 250), past(2, 300), past(3, 350)];
const target = new Date(2026, 9, 1); // 1 Oct 2026

describe('daysBeforeEvent', () => {
  it('counts calendar days, the day before at 18:00 is 1', () => {
    expect(daysBeforeEvent(new Date(2026, 8, 30, 18), target)).toBe(1);
    expect(daysBeforeEvent(new Date(2026, 9, 1, 9), target)).toBe(0);
    expect(daysBeforeEvent(new Date(2026, 9, 2, 1), target)).toBe(0); // door, after midnight
  });

  it('an edition is over at 6:00 the morning after', () => {
    expect(isEditionOver(target, new Date(2026, 9, 2, 5))).toBe(false);
    expect(isEditionOver(target, new Date(2026, 9, 2, 7))).toBe(true);
  });
});

describe('computeWhereAreWeNow', () => {
  it('compares at the time the data stops, not at the current time', () => {
    // Export taken at 14:00 on the event day, looked at at 22:00, edition in line (300)
    const rows = [...pastEditions.flat(), ...edition('B', 'now', target, 300, 14)];
    const r = computeWhereAreWeNow(rows, 'B', 'now', null, { now: at(target, 22) });
    expect(r.snapshotHour).toBe('14:00');
    expect(r.isDataStale).toBe(false);
    const sameSize = r.comparisons.find(c => c.editionLabel === 'past2');
    expect(sameSize.deltaPercent).toBe(0);
  });

  it('after midnight compares with the past editions after their midnight', () => {
    const rows = [...pastEditions.flat(), ...edition('B', 'now', target, 300, 24.5)];
    const r = computeWhereAreWeNow(rows, 'B', 'now', null, { now: at(target, 25) });
    expect(r.isEventPast).toBe(false);
    expect(r.comparisons.find(c => c.editionLabel === 'past2').deltaPercent).toBe(0);
    expect(r.projection.value).toBe(300);
  });

  it('uses the current time when the count is typed in by hand', () => {
    const rows = [...pastEditions.flat(), ...edition('B', 'now', target, 300, 14)];
    const r = computeWhereAreWeNow(rows, 'B', 'now', { mode: 'now', value: 285 }, { now: at(target, 21.5) });
    expect(r.snapshotHour).toBe('21:30');
    // By 21:30 an edition of 300 had 90% of its registrations
    expect(r.comparisons.find(c => c.editionLabel === 'past2').atSamePointAdjusted).toBe(270);
    expect(r.currentRegistrations).toBe(285);
  });

  it('leaves out editions still on sale or without a date', () => {
    const future = edition('B', 'next', new Date(2026, 9, 8), 300, -100);
    const undated = edition('B', 'senza data', new Date(2026, 5, 1), 50).map(r => ({ ...r, eventDate: null }));
    const rows = [...pastEditions.flat(), ...edition('B', 'now', target, 300, 14), ...future, ...undated];
    const r = computeWhereAreWeNow(rows, 'B', 'now', null, { now: at(target, 14) });
    expect(r.comparisons.map(c => c.editionLabel).sort()).toEqual(['past0', 'past1', 'past2', 'past3']);
  });

  it('projects with the median and a range, flagged unreliable when early', () => {
    const rows = [...pastEditions.flat(), ...edition('B', 'now', target, 300, -6)];
    const r = computeWhereAreWeNow(rows, 'B', 'now', null, { now: at(target, -6) });
    expect(r.pointDaysBefore).toBe(1);
    expect(r.projection.value).toBe(300);
    expect(r.projection.basedOn).toBe(4);
    expect(r.projection.reliable).toBe(true); // 40% of final by then
    const early = computeWhereAreWeNow([...pastEditions.flat(), ...edition('B', 'now', target, 300, -72)], 'B', 'now', null, { now: at(target, -72) });
    expect(early.projection.reliable).toBe(false); // 5% of final by then
  });

  it('keeps the current curve where the data stops', () => {
    const rows = [...pastEditions.flat(), ...edition('B', 'now', target, 300, -30)];
    const r = computeWhereAreWeNow(rows, 'B', 'now', null, { now: at(target, -30) });
    expect(Object.keys(r.targetCumulative).map(Number).sort()).toEqual([2, 3]);
  });
});

describe('conversionOf', () => {
  it('ignores nights still to come and nights whose scans are missing', () => {
    const now = new Date(2026, 9, 1, 12);
    const row = (ed, eventDate, attended) => ({ brand: 'B', editionLabel: ed, eventDate, attended });
    const rows = [
      row('a', new Date(2026, 8, 1), true), row('a', new Date(2026, 8, 1), false), // 50%
      row('noscan', new Date(2026, 8, 8), false), row('noscan', new Date(2026, 8, 8), false),
      row('future', new Date(2026, 9, 3), false),
    ];
    expect(conversionOf(rows, now)).toBe(50);
    expect(conversionOf(rows.slice(2), now)).toBeNull();
  });
});

describe('computeEditionUserLists', () => {
  it('retargets only people who came, once per phone, not if already registered', () => {
    const ev = (label, d) => new Date(2026, 8, d);
    const rows = [
      { brand: 'B', editionLabel: 'old', eventDate: ev('old', 1), phone: '333 111 2222', email: 'a@x.it', fullName: 'A', attended: true },
      { brand: 'B', editionLabel: 'old', eventDate: ev('old', 1), phone: '3331112222', email: 'a2@x.it', fullName: 'A', attended: true },
      { brand: 'B', editionLabel: 'old', eventDate: ev('old', 1), phone: '3330000000', email: 'never@x.it', fullName: 'N', attended: false },
      { brand: 'B', editionLabel: 'old', eventDate: ev('old', 1), phone: '3339999999', email: 'c@x.it', fullName: 'C', attended: true },
      { brand: 'B', editionLabel: 'new', eventDate: ev('new', 20), phone: '+39 333 999 9999', email: 'c-new@x.it', fullName: 'C', attended: false },
    ];
    const { retarget } = computeEditionUserLists(rows, 'B', 'new');
    expect(retarget.map(u => u.fullName)).toEqual(['A']);
  });
});

describe('summarizeComparisons', () => {
  it('counts editions with nobody registered yet as zero in the average', () => {
    const s = summarizeComparisons([
      { atSamePointAdjusted: 0, totalFinal: 100 },
      { atSamePointAdjusted: 30, totalFinal: 300 },
    ], 10, false);
    expect(s.avgAtSamePoint).toBe(15);
  });

  it('does not project once the event is over', () => {
    expect(summarizeComparisons([{ atSamePointAdjusted: 100, totalFinal: 100 }], 90, true).projection).toBeNull();
  });
});
