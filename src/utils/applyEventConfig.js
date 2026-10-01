/**
 * Apply event config (renames, edition renames, exclusions, overrides) to data records.
 *
 * Edition renames made before editions were keyed by date are keyed by the raw
 * event name (e.g. "22.11.25 ATIPICO w/ DANTE from LOSTBOYS"): they are matched
 * on the record's rawEventName too, so the names given in the catalog still apply.
 */
export function applyEventConfig(records, config) {
  return records.map(d => {
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
