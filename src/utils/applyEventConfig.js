import { nightNameKey, editionLabelFromDate } from './eventNameCleaner';
import { daysBeforeEvent } from './eventTime';

/**
 * Event dates set in the catalog ({ nameKey: { name, date: "YYYY-MM-DD" } }) for
 * events with no date in their name, or a wrong one: they win over the date found
 * at import, and the edition label and days-before follow.
 */
export function applyDates(records, dates) {
  if (!dates || !Object.keys(dates).length) return records;
  const byName = new Map();
  return records.map(r => {
    const name = r.rawEventName;
    if (!name) return r;
    if (!byName.has(name)) {
      const iso = dates[nightNameKey(name)]?.date;
      const [y, m, d] = (iso || '').split('-').map(Number);
      byName.set(name, iso ? new Date(y, m - 1, d) : null);
    }
    const date = byName.get(name);
    if (!date || (r.eventDate && r.eventDate.getTime() === date.getTime())) return r;
    return { ...r, eventDate: date, editionLabel: editionLabelFromDate(date), daysBefore: daysBeforeEvent(r.purchaseDate, date) };
  });
}

/**
 * Apply event config (renames, edition renames, exclusions, overrides) to data records.
 *
 * Edition renames made before editions were keyed by date are keyed by the raw
 * event name (e.g. "22.11.25 ATIPICO w/ DANTE from LOSTBOYS"): they are matched
 * on the record's rawEventName too, so the names given in the catalog still apply.
 */
export function applyEventConfig(records, config) {
  return applyDates(records, config.dates).map(d => {
    let brand = d.brand;
    let editionLabel = d.editionLabel;
    // Apply brand renames
    if (config.renames?.[brand]) {
      brand = config.renames[brand];
    }
    // Apply edition renames (check both original and renamed brand)
    const editionRenames = { ...config.editionRenames?.[d.brand], ...config.editionRenames?.[brand] };
    editionLabel = editionRenames[editionLabel] || editionRenames[d.rawEventName] || editionLabel;
    // Apply custom config (category, genres, venue)
    const brandConfig = config.brands?.[d.brand] || config.brands?.[brand];
    return {
      ...d,
      brand,
      editionLabel,
      category: brandConfig?.category || d.category,
      genres: brandConfig?.genres?.length ? brandConfig.genres : d.genres,
      location: brandConfig?.venue || d.location,
    };
  }).filter(d => !config.excludedBrands?.includes(d.brand));
}
