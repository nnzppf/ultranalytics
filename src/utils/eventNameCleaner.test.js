import { matchBrand, extractEventDate, editionLabelFromDate, repairText, stripDatePrefix } from './eventNameCleaner';

const day = d => d && `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

describe('matchBrand', () => {
  it.each([
    ['GIOVED� GELSI - 25 GIUGNO', 'GIOVEDÌ GELSI'],
    ['GIOVEDI\' 9 LUGLIO - GIOVEDI GELSI W/DOBLE SOUND', 'GIOVEDÌ GELSI'],
    ['SABATO 28 MARZO - DOBLE SOUND in BARCHESSA', 'DOBLE SOUND'],
    ['�100 ALLA MATURIT� - IL PARTY ESCLUSIVO PER I MATURANDI', '-100 ALLA MATURITA'],
    ['18.10.25 TOO LATE OPENING PARTY - ATIPICO w/ IDRISS D', 'ATIPICO'],
    ['31.10.26 JE SUIS MIMI\' HALLOWEEN PARTY', 'JE SUIS MIMÌ'],
    ['TOO LATE - OPENING PARTY w/GERMANO VENTURA', 'TOO LATE - OPENING PARTY'],
  ])('%s → %s', (raw, brand) => {
    expect(matchBrand(raw).brand).toBe(brand);
  });

  it('excludes test events, also with broken accents', () => {
    expect(matchBrand('29.11 DEC� 90')).toBeNull();
    expect(matchBrand('Evento test scanner')).toBeNull();
  });

  it('flags senior events', () => {
    expect(matchBrand('10.10 MAMMA MIA � Il Venerd� Gelsi').category).toBe('senior');
  });
});

describe('extractEventDate', () => {
  it('takes the year from when people registered', () => {
    expect(day(extractEventDate('SABATO 17 OTTOBRE - FOREVER', new Date(2026, 8, 30)))).toBe('2026-10-17');
    expect(day(extractEventDate('26.09 MAMMAMIA', new Date(2025, 8, 9)))).toBe('2025-9-26');
    expect(day(extractEventDate('31.12 SALTACODA', new Date(2025, 11, 20)))).toBe('2025-12-31');
  });

  it('reads explicit years and overrides', () => {
    expect(day(extractEventDate('24 Gennaio 2026 - 2000 Mania'))).toBe('2026-1-24');
    expect(day(extractEventDate('04.10.25 STUDIOS CLUB OPENING PARTY'))).toBe('2025-10-4');
    expect(day(extractEventDate('ROOKIE w/NABI'))).toBe('2026-10-10');
  });

  it('does not read numbers that are not dates', () => {
    expect(extractEventDate('AMARCORD - ESTATE ITALIANA')).toBeNull();
    expect(day(extractEventDate('GIOVEDI GELSI 12BANCONI EDITION - 18 GIUGNO', new Date(2026, 5, 15)))).toBe('2026-6-18');
  });
});

describe('labels', () => {
  it('formats editions and repairs names', () => {
    expect(editionLabelFromDate(new Date(2026, 9, 31))).toBe('31.10.26');
    expect(editionLabelFromDate(null)).toBe('senza data');
    expect(repairText('VENERD� 12 DICEMBRE - L�APERITIVO')).toBe("VENERDÌ 12 DICEMBRE - L'APERITIVO");
    expect(stripDatePrefix('SABATO 13 DICEMBRE - ULTRAVIVID - TRAP NIGHT')).toBe('ULTRAVIVID - TRAP NIGHT');
  });
});
