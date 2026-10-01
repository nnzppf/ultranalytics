import { mergeRecordLists, mergeUserLists, isSuperseded, linkPeopleByPhone, normalizePhone } from './datasetMerge';

const ticket = (code, purchaseDate, attended = false, extra = {}) => ({
  code, purchaseDate, attended, scanDate: attended ? '2026-02-21T23:30:00.000Z' : null, ...extra,
});

describe('mergeRecordLists', () => {
  it('counts a ticket once even if the exports disagree on its time', () => {
    const feb = [ticket('a1', '2026-01-10T19:00:00.000Z'), ticket('b2', '2026-01-11T19:00:00.000Z')];
    const oct = [ticket('a1', '2026-01-10T20:00:00.000Z'), ticket('c3', '2026-09-01T10:00:00.000Z')];
    const merged = mergeRecordLists([feb, oct]);
    expect(merged.map(r => r.code).sort()).toEqual(['a1', 'b2', 'c3']);
    expect(merged.find(r => r.code === 'a1').purchaseDate).toBe('2026-01-10T20:00:00.000Z');
  });

  it('never loses a scan, re-aligning it to the newer export', () => {
    const feb = [ticket('a1', '2026-02-20T19:00:00.000Z', true)];
    const oct = [ticket('a1', '2026-02-20T20:00:00.000Z', false)];
    const [merged] = mergeRecordLists([feb, oct]);
    expect(merged.attended).toBe(true);
    expect(merged.scanDate).toBe('2026-02-22T00:30:00.000Z');
  });

  it('keeps records without a code', () => {
    const merged = mergeRecordLists([[ticket('', '2024-11-01T20:00:00.000Z')], [ticket('', '2024-11-01T20:00:00.000Z')]]);
    expect(merged).toHaveLength(2);
  });
});

describe('isSuperseded', () => {
  it('is true only if every ticket and every scan is in the newer data', () => {
    const older = [ticket('a1', 'x', true), ticket('b2', 'y')];
    expect(isSuperseded(older, [ticket('a1', 'x', true), ticket('b2', 'y'), ticket('c3', 'z')], 'biglietti')).toBe(true);
    expect(isSuperseded(older, [ticket('a1', 'x', false), ticket('b2', 'y')], 'biglietti')).toBe(false);
    expect(isSuperseded(older, [ticket('a1', 'x', true)], 'biglietti')).toBe(false);
  });
});

describe('isSuperseded (users)', () => {
  it('keeps an older export holding a field the newer one lacks', () => {
    const older = [{ email: 'a@x.it', phone: '3331112222', birthDate: '2000-01-01' }];
    expect(isSuperseded(older, [{ email: 'a@x.it', phone: '3331112222', birthDate: null }], 'utenti')).toBe(false);
    expect(isSuperseded(older, [{ email: 'a@x.it', phone: '3331112222', birthDate: '2000-01-01' }], 'utenti')).toBe(true);
  });
});

describe('users', () => {
  it('keeps accounts sharing a phone apart, and merges the same email', () => {
    const merged = mergeUserLists([
      [{ email: 'a@x.it', phone: '3331112222', birthDate: '2000-01-01' }, { email: 'b@x.it', phone: '3331112222' }],
      [{ email: 'a@x.it', phone: '333 111 2222', birthDate: null }],
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.find(u => u.email === 'a@x.it').birthDate).toBe('2000-01-01');
  });

  it('links old-platform tickets to people through the phone', () => {
    const records = [{ code: 'old', email: '', phone: '+39 333 111 2222' }, { code: 'new', email: 'A@x.it', phone: '3331112222' }];
    const linked = linkPeopleByPhone(records, []);
    expect(linked[0].email).toBe('a@x.it');
  });

  it('normalizes Italian numbers', () => {
    expect(normalizePhone("'+393331112222")).toBe('3331112222');
    expect(normalizePhone('0039 333 1112222')).toBe('3331112222');
    expect(normalizePhone('123')).toBe('');
  });
});
