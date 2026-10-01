import { compactRecords, expandRecords, compactUsers, expandUsers } from './compactFormat';

const event = {
  rawEventName: 'GIOVEDÌ GELSI - 3 SETTEMBRE', brand: 'GIOVEDÌ GELSI', editionLabel: '03.09.26',
  category: 'standard', genres: ['commerciale'], location: 'La Casa dei Gelsi', eventDate: new Date(2026, 8, 3),
};
const record = (code, extra = {}) => ({
  ...event, code, purchaseDate: new Date(2026, 8, 3, 22, 14), scanDate: null, attended: false,
  name: 'Mario', surname: 'Rossi', fullName: 'Mario Rossi', email: 'mario@x.it', phone: '3331112222',
  gender: 'M', birthDate: new Date(2000, 0, 2), promoter: null, ...extra,
});

it('stores event fields once and gives back the same registration', () => {
  const records = [record('a1'), record('a2', { attended: true, scanDate: new Date(2026, 8, 3, 23, 40), promoter: 'lanza' })];
  const { events, items } = compactRecords(records);
  expect(events).toHaveLength(1);
  expect(JSON.stringify(items).length).toBeLessThan(JSON.stringify(records).length / 2);

  const [a, b] = expandRecords(items, events);
  expect(a).toMatchObject({
    rawEventName: event.rawEventName, brand: 'GIOVEDÌ GELSI', editionLabel: '03.09.26', genres: ['commerciale'],
    location: 'La Casa dei Gelsi', eventDate: event.eventDate.toISOString(), code: 'a1',
    purchaseDate: new Date(2026, 8, 3, 22, 14).toISOString(), scanDate: null, attended: false,
    fullName: 'Mario Rossi', email: 'mario@x.it', phone: '3331112222', gender: 'M',
    birthDate: new Date(2000, 0, 2).toISOString(), promoter: null, hour: 22, dayOfWeek: 'Giovedì',
  });
  expect(b).toMatchObject({ attended: true, scanDate: new Date(2026, 8, 3, 23, 40).toISOString(), promoter: 'lanza' });
});

it('never stores undefined (Firestore rejects it)', () => {
  const { items } = compactRecords([record('x', { email: undefined, gender: undefined })]);
  expect(Object.values(items[0]).includes(undefined)).toBe(false);
});

it('gives back the same user', () => {
  const users = [{ name: 'Anna', surname: 'Bianchi', email: 'a@x.it', phone: '3330000000', gender: 'F',
    birthDate: new Date(1999, 4, 5), registrationDate: new Date(2025, 9, 4, 17, 47, 19) }];
  const [u] = expandUsers(compactUsers(users));
  expect(u).toEqual({
    name: 'Anna', surname: 'Bianchi', fullName: 'Anna Bianchi', email: 'a@x.it', phone: '3330000000', gender: 'F',
    birthDate: new Date(1999, 4, 5).toISOString(), registrationDate: new Date(2025, 9, 4, 17, 47, 19).toISOString(),
  });
});
