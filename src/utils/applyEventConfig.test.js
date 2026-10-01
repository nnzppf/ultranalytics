import { applyEventConfig } from './applyEventConfig';

const config = {
  brands: { ATIPICO: { category: 'standard', genres: ['elettronica'], venue: 'TooLate' } },
  editionRenames: {
    ATIPICO: {
      '22.11.25 ATIPICO w/ DANTE from LOSTBOYS': 'ATIPICO w/ DANTE from LOSTBOYS',
      '17.01.26': 'ATIPICO W/MATTIA FONTANA',
    },
  },
  excludedBrands: ['DECO 90'],
};

describe('applyEventConfig', () => {
  it('applies catalog edition names keyed by the old raw event name', () => {
    const [r] = applyEventConfig([{ brand: 'ATIPICO', editionLabel: '22.11.25', rawEventName: '22.11.25 ATIPICO w/ DANTE from LOSTBOYS' }], config);
    expect(r.editionLabel).toBe('ATIPICO w/ DANTE from LOSTBOYS');
    expect(r.location).toBe('TooLate');
  });

  it('applies edition names keyed by date and leaves the others alone', () => {
    const out = applyEventConfig([
      { brand: 'ATIPICO', editionLabel: '17.01.26', rawEventName: '17 GENNAIO - ATIPICO' },
      { brand: 'ATIPICO', editionLabel: '22.03.25', rawEventName: 'ATIPICO 22.03.25' },
    ], config);
    expect(out.map(r => r.editionLabel)).toEqual(['ATIPICO W/MATTIA FONTANA', '22.03.25']);
  });

  it('drops excluded brands', () => {
    expect(applyEventConfig([{ brand: 'DECO 90', editionLabel: 'x' }], config)).toHaveLength(0);
  });
});
