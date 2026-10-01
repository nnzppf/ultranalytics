/**
 * Storage format 2 for uploaded datasets: about 4x less data to download than
 * format 1 (one object per registration with every field spelled out).
 * - event fields (name, brand, edition, genres, venue, date) are stored once per
 *   event in the dataset metadata (`events`), each registration keeps an index;
 * - dates are epoch milliseconds;
 * - fields that can be derived (full name, hour, weekday, time band, days before)
 *   are not stored; empty values are omitted.
 * expand* rebuild the format-1 shape (ISO date strings), which the merge and
 * deserialization code works on.
 */
import { DAYS_JS, getFascia } from '../config/constants';

export const FORMAT = 2;

const ms = d => (d ? d.getTime() : null);
const iso = n => (n != null ? new Date(n).toISOString() : null);

// Firestore rejects undefined values: drop empty fields instead
function pack(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '' && v !== false) out[k] = v;
  }
  return out;
}

export function compactRecords(records) {
  const events = [];
  const index = new Map();
  const items = records.map(r => {
    const event = {
      rawEventName: r.rawEventName || '',
      brand: r.brand || '',
      editionLabel: r.editionLabel || '',
      category: r.category || '',
      genres: r.genres || [],
      location: r.location || '',
      eventDate: ms(r.eventDate),
    };
    const key = JSON.stringify(event);
    if (!index.has(key)) {
      index.set(key, events.length);
      events.push(event);
    }
    return pack({
      c: r.code,
      p: ms(r.purchaseDate),
      s: ms(r.scanDate),
      a: r.attended ? 1 : null,
      e: index.get(key),
      n: r.name,
      sn: r.surname,
      m: r.email,
      t: r.phone,
      b: ms(r.birthDate),
      g: r.gender,
      r: r.promoter,
    });
  });
  return { events, items };
}

export function expandRecords(items, events) {
  return items.map(it => {
    const ev = events[it.e] || {};
    const purchase = it.p != null ? new Date(it.p) : null;
    const hour = purchase ? purchase.getHours() : null;
    const name = it.n || '';
    const surname = it.sn || '';
    return {
      rawEventName: ev.rawEventName || '',
      brand: ev.brand || '',
      editionLabel: ev.editionLabel || '',
      category: ev.category || '',
      genres: ev.genres || [],
      location: ev.location || '',
      eventDate: iso(ev.eventDate),
      purchaseDate: iso(it.p),
      scanDate: iso(it.s),
      attended: !!it.a,
      name,
      surname,
      fullName: `${name} ${surname}`.trim(),
      email: it.m || '',
      phone: it.t || '',
      gender: it.g || null,
      birthDate: iso(it.b),
      promoter: it.r || null,
      code: it.c || '',
      hour,
      dayOfWeek: purchase ? DAYS_JS[purchase.getDay()] : null,
      fascia: hour != null ? getFascia(hour) : null,
    };
  });
}

export function compactUsers(users) {
  return users.map(u => pack({
    n: u.name,
    sn: u.surname,
    m: u.email,
    t: u.phone,
    g: u.gender,
    b: ms(u.birthDate),
    r: ms(u.registrationDate),
  }));
}

export function expandUsers(items) {
  return items.map(it => {
    const name = it.n || '';
    const surname = it.sn || '';
    return {
      name,
      surname,
      fullName: `${name} ${surname}`.trim(),
      email: it.m || '',
      phone: it.t || '',
      gender: it.g || null,
      birthDate: iso(it.b),
      registrationDate: iso(it.r),
    };
  });
}
