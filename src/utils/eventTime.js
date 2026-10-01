/**
 * Time rules shared by the whole app.
 * - Days before the event are calendar days: a registration made the day before
 *   at 18:00 is 1 day before, not 0 (the old floor of the hour difference said 0).
 * - Registrations after midnight at the door belong to the event day.
 * - An edition is over at 6:00 the morning after the event.
 */

const DAY_MS = 86400000;

export function midnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBeforeEvent(purchaseDate, eventDate) {
  if (!purchaseDate || !eventDate) return null;
  return Math.max(0, Math.round((midnight(eventDate) - midnight(purchaseDate)) / DAY_MS));
}

export function isEditionOver(eventDate, now = new Date()) {
  if (!eventDate) return false;
  const end = midnight(eventDate);
  end.setDate(end.getDate() + 1);
  end.setHours(6, 0, 0, 0);
  return now > end;
}

/** Calendar-day difference b - a (negative if b is before a). */
export function dayDiff(a, b) {
  return Math.round((midnight(b) - midnight(a)) / DAY_MS);
}

/** The same wall-clock moment relative to another event day: e.g. "2 days before at 14:10". */
export function samePointFor(eventDate, reference, referenceEventDate) {
  const point = midnight(eventDate);
  point.setDate(point.getDate() + dayDiff(referenceEventDate, reference));
  point.setHours(reference.getHours(), reference.getMinutes(), reference.getSeconds(), 999);
  return point;
}

/**
 * Conversion (entered / registered, %) over the editions that are over and whose
 * entries were exported (at least one scan): registrations to future nights, or
 * to nights whose scans are missing, are not no-shows. null when there is none.
 */
export function conversionOf(records, now = new Date()) {
  const scanned = new Set();
  for (const r of records) if (r.attended) scanned.add(`${r.brand}|${r.editionLabel}`);
  let total = 0, entered = 0;
  for (const r of records) {
    if (!scanned.has(`${r.brand}|${r.editionLabel}`) || !isEditionOver(r.eventDate, now)) continue;
    total++;
    if (r.attended) entered++;
  }
  return total > 0 ? parseFloat(((entered / total) * 100).toFixed(1)) : null;
}

export function latestPurchase(rows) {
  let latest = null;
  for (const r of rows) {
    if (r.purchaseDate && (!latest || r.purchaseDate > latest)) latest = r.purchaseDate;
  }
  return latest;
}
