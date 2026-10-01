/**
 * Merging of overlapping exports. Pure functions on serialized items (dates as ISO
 * strings, as stored in Firestore), so they can be tested without Firebase.
 *
 * Rules, from comparing the Feb 2026 export with the Oct 2026 one:
 * - a ticket is identified by its code alone: the same ticket can come back with a
 *   different registration time (the exports disagree by 1h in winter);
 * - the newer copy of a ticket wins, but a scan is never lost: the platform dropped
 *   all the scans of one event between the two exports;
 * - a user is identified by email (phone if missing); old-platform tickets, which
 *   have no email, are linked to people through the phone number.
 */

/** Italian mobile number without prefix/spaces, or '' if unusable. */
export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('0039')) d = d.slice(4);
  else if (d.startsWith('39') && d.length === 12) d = d.slice(2);
  return d.length >= 9 ? d : '';
}

export function recordKey(r) {
  return r.code || null;
}

// Email first: accounts sharing a phone (families) are different people
export function userKey(u) {
  return (u.email || '').toLowerCase() || normalizePhone(u.phone) || null;
}

/** Newer copy of a ticket, keeping the scan if only the older copy has it. */
function mergeTicket(older, newer) {
  if (!older.attended || newer.attended) return newer;
  // Re-align the old scan time to the newer export's clock
  const shift = older.purchaseDate && newer.purchaseDate
    ? new Date(newer.purchaseDate) - new Date(older.purchaseDate)
    : 0;
  const scanDate = older.scanDate ? new Date(new Date(older.scanDate).getTime() + shift).toISOString() : null;
  return { ...newer, attended: true, scanDate };
}

/** Merge record lists, oldest dataset first. */
export function mergeRecordLists(lists) {
  const byKey = new Map();
  const unkeyed = [];
  for (const items of lists) {
    for (const item of items) {
      const key = recordKey(item);
      if (!key) unkeyed.push(item);
      else byKey.set(key, byKey.has(key) ? mergeTicket(byKey.get(key), item) : item);
    }
  }
  return [...unkeyed, ...byKey.values()];
}

/** Merge user lists, oldest dataset first: newer copy wins, missing fields are kept. */
export function mergeUserLists(lists) {
  const byKey = new Map();
  const unkeyed = [];
  for (const items of lists) {
    for (const item of items) {
      const key = userKey(item);
      if (!key) { unkeyed.push(item); continue; }
      const prev = byKey.get(key);
      byKey.set(key, prev ? { ...prev, ...Object.fromEntries(Object.entries(item).filter(([, v]) => v)) } : item);
    }
  }
  return [...unkeyed, ...byKey.values()];
}

/**
 * True if a newer dataset makes `older` redundant: every item is in `newer`, and
 * every scan in `older` is also in `newer`.
 */
export function isSuperseded(olderItems, newerItems, fileType) {
  if (olderItems.length === 0) return false;
  const keyFn = fileType === 'utenti' ? userKey : recordKey;
  const newer = new Map();
  for (const item of newerItems) {
    const key = keyFn(item);
    if (key) newer.set(key, item);
  }
  return olderItems.every(item => {
    const key = keyFn(item);
    const match = key && newer.get(key);
    if (!match) return false;
    return fileType === 'utenti' || !item.attended || match.attended;
  });
}

/**
 * Give records without email (old platform) the email of the same phone number
 * elsewhere in the data, so the analytics, which identify people by email,
 * recognise them across platforms.
 */
export function linkPeopleByPhone(records, utenti) {
  const emailByPhone = new Map();
  for (const x of [...utenti, ...records]) {
    const phone = normalizePhone(x.phone);
    if (phone && x.email && !emailByPhone.has(phone)) emailByPhone.set(phone, x.email.toLowerCase());
  }
  return records.map(r => {
    if (r.email) return r;
    const email = emailByPhone.get(normalizePhone(r.phone));
    return email ? { ...r, email } : r;
  });
}
