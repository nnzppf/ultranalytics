/**
 * Comparison Engine - Multi-level comparison and "Where Are We Now" feature.
 */

/**
 * Build a cumulative registration curve for an edition, indexed by days-before-event.
 * Returns { [daysBefore]: cumulativeCount }
 */
function buildCumulativeCurve(rows) {
  if (!rows.length) return {};

  const withDays = rows
    .filter(r => r.daysBefore !== null && r.daysBefore !== undefined)
    .sort((a, b) => b.daysBefore - a.daysBefore);

  if (!withDays.length) return {};

  const maxDays = Math.max(...withDays.map(r => r.daysBefore));
  const cumulative = {};
  let running = 0;

  for (let d = maxDays; d >= 0; d--) {
    running += withDays.filter(r => r.daysBefore === d).length;
    cumulative[d] = running;
  }

  return cumulative;
}

/**
 * "WHERE ARE WE NOW" - The killer feature.
 * For a given brand and target edition (upcoming/current), compare registration
 * progress against the same point in time of previous editions.
 */
export function computeWhereAreWeNow(allData, targetBrand, targetEdition) {
  const brandData = allData.filter(d => d.brand === targetBrand);
  const targetRows = brandData.filter(d => d.editionLabel === targetEdition);

  if (!targetRows.length) return null;

  const targetEventDate = targetRows[0].eventDate;
  if (!targetEventDate) return null;

  const now = new Date();
  const currentDaysBefore = Math.max(0, Math.floor((targetEventDate - now) / 86400000));
  const currentRegistrations = targetRows.length;
  const currentAttended = targetRows.filter(r => r.attended).length;

  // Get all other editions for this brand
  const otherEditions = [...new Set(brandData.map(d => d.editionLabel))]
    .filter(e => e !== targetEdition);

  const comparisons = [];

  for (const edLabel of otherEditions) {
    const edRows = brandData.filter(d => d.editionLabel === edLabel);
    if (!edRows.length) continue;

    const edEventDate = edRows[0].eventDate;
    const cumulative = buildCumulativeCurve(edRows);
    const totalFinal = edRows.length;
    const totalAttended = edRows.filter(r => r.attended).length;
    const atSamePoint = cumulative[currentDaysBefore] || 0;

    const delta = currentRegistrations - atSamePoint;
    const deltaPercent = atSamePoint > 0
      ? parseFloat(((delta / atSamePoint) * 100).toFixed(1))
      : null;
    const projectedFinal = atSamePoint > 0
      ? Math.round((currentRegistrations / atSamePoint) * totalFinal)
      : null;

    comparisons.push({
      editionLabel: edLabel,
      eventDate: edEventDate,
      totalFinal,
      totalAttended,
      finalConversion: totalFinal > 0 ? parseFloat(((totalAttended / totalFinal) * 100).toFixed(1)) : 0,
      cumulative,
      atSamePoint,
      delta,
      deltaPercent,
      projectedFinal,
    });
  }

  // Build the target's own cumulative curve
  const targetCumulative = buildCumulativeCurve(targetRows);

  // Average metrics
  const validComps = comparisons.filter(c => c.atSamePoint > 0);
  const avgAtSamePoint = validComps.length
    ? Math.round(validComps.reduce((s, c) => s + c.atSamePoint, 0) / validComps.length)
    : 0;
  const avgProjectedFinal = validComps.length
    ? Math.round(validComps.reduce((s, c) => s + (c.projectedFinal || 0), 0) / validComps.length)
    : 0;
  const avgFinal = comparisons.length
    ? Math.round(comparisons.reduce((s, c) => s + c.totalFinal, 0) / comparisons.length)
    : 0;

  // Build overlay chart data (all editions on same x-axis of days-before)
  const maxDaysAll = Math.max(
    ...comparisons.map(c => Math.max(...Object.keys(c.cumulative).map(Number), 0)),
    ...Object.keys(targetCumulative).map(Number),
    0
  );

  const overlayData = [];
  for (let d = maxDaysAll; d >= 0; d--) {
    const point = { daysBefore: d, label: d === 0 ? 'Evento' : `-${d}` };
    point[targetEdition] = targetCumulative[d] || null;
    for (const comp of comparisons) {
      point[comp.editionLabel] = comp.cumulative[d] || null;
    }
    overlayData.push(point);
  }

  return {
    brand: targetBrand,
    edition: targetEdition,
    eventDate: targetEventDate,
    currentDaysBefore,
    currentRegistrations,
    currentAttended,
    currentConversion: currentRegistrations > 0
      ? parseFloat(((currentAttended / currentRegistrations) * 100).toFixed(1))
      : 0,
    comparisons,
    avgAtSamePoint,
    avgProjectedFinal,
    avgFinal,
    progressPercent: avgFinal > 0 ? Math.round((currentRegistrations / avgFinal) * 100) : 0,
    overlayData,
    allEditionLabels: [targetEdition, ...comparisons.map(c => c.editionLabel)],
    targetCumulative,
  };
}

/**
 * Cross-brand comparison: compare brandA editions vs brandB editions.
 * Shows all editions of both brands on the same cumulative chart,
 * with summary stats for each brand.
 */
export function computeCrossBrandComparison(allData, brandA, brandB) {
  const dataA = allData.filter(d => d.brand === brandA);
  const dataB = allData.filter(d => d.brand === brandB);

  if (!dataA.length || !dataB.length) return null;

  const editionsA = [...new Set(dataA.map(d => d.editionLabel))].filter(Boolean);
  const editionsB = [...new Set(dataB.map(d => d.editionLabel))].filter(Boolean);

  // Build edition stats for each brand
  function buildEditionStats(rows, editions, brandName) {
    return editions.map(ed => {
      const edRows = rows.filter(r => r.editionLabel === ed);
      const attended = edRows.filter(r => r.attended).length;
      const eventDate = edRows[0]?.eventDate;
      const cumulative = buildCumulativeCurve(edRows);
      return {
        brand: brandName,
        editionLabel: ed,
        displayLabel: `${brandName} ${ed}`,
        totalRegistrations: edRows.length,
        totalAttended: attended,
        conversion: edRows.length > 0 ? parseFloat(((attended / edRows.length) * 100).toFixed(1)) : 0,
        eventDate,
        cumulative,
      };
    }).sort((a, b) => (a.eventDate || 0) - (b.eventDate || 0));
  }

  const statsA = buildEditionStats(dataA, editionsA, brandA);
  const statsB = buildEditionStats(dataB, editionsB, brandB);
  const allStats = [...statsA, ...statsB];

  // Brand-level aggregates
  function brandAgg(rows, editions) {
    const attended = rows.filter(r => r.attended).length;
    return {
      totalRegistrations: rows.length,
      avgPerEdition: editions.length > 0 ? Math.round(rows.length / editions.length) : 0,
      totalAttended: attended,
      avgConversion: rows.length > 0 ? parseFloat(((attended / rows.length) * 100).toFixed(1)) : 0,
      editionCount: editions.length,
    };
  }

  const aggA = brandAgg(dataA, editionsA);
  const aggB = brandAgg(dataB, editionsB);

  // Build overlay chart: all editions of both brands on same x-axis (days-before)
  const maxDaysAll = Math.max(
    ...allStats.map(s => Math.max(...Object.keys(s.cumulative).map(Number), 0)),
    0
  );

  const overlayData = [];
  for (let d = maxDaysAll; d >= 0; d--) {
    const point = { daysBefore: d, label: d === 0 ? 'Evento' : `-${d}` };
    for (const s of allStats) {
      point[s.displayLabel] = s.cumulative[d] || null;
    }
    overlayData.push(point);
  }

  return {
    brandA, brandB,
    statsA, statsB,
    aggA, aggB,
    overlayData,
    allEditionLabels: allStats.map(s => s.displayLabel),
    allStats,
    isCrossBrand: true,
  };
}

/**
 * Compare brands (aggregated across all their editions).
 */
export function compareBrands(allData, brandNames = null) {
  const brands = brandNames || [...new Set(allData.map(d => d.brand))].filter(Boolean);

  return brands.map(brand => {
    const rows = allData.filter(d => d.brand === brand);
    const editions = [...new Set(rows.map(d => d.editionLabel))];
    const attended = rows.filter(r => r.attended).length;

    // Growth: first edition vs last edition
    let growth = null;
    if (editions.length >= 2) {
      const editionStats = editions.map(ed => ({
        edition: ed,
        count: rows.filter(r => r.editionLabel === ed).length,
        eventDate: rows.find(r => r.editionLabel === ed)?.eventDate,
      })).sort((a, b) => (a.eventDate || 0) - (b.eventDate || 0));

      const first = editionStats[0].count;
      const last = editionStats[editionStats.length - 1].count;
      growth = first > 0 ? parseFloat((((last - first) / first) * 100).toFixed(1)) : null;
    }

    return {
      brand,
      category: rows[0]?.category,
      genres: rows[0]?.genres || [],
      location: rows[0]?.location,
      editionCount: editions.length,
      totalRegistrations: rows.length,
      avgPerEdition: editions.length > 0 ? Math.round(rows.length / editions.length) : 0,
      totalAttended: attended,
      avgConversion: rows.length > 0
        ? parseFloat(((attended / rows.length) * 100).toFixed(1))
        : 0,
      growth,
      editions,
    };
  }).sort((a, b) => b.totalRegistrations - a.totalRegistrations);
}

/**
 * Compare genres (aggregated).
 */
export function compareGenres(allData, excludeBrand = null) {
  const genreSet = new Set();
  allData.forEach(d => d.genres?.forEach(g => genreSet.add(g)));
  const genres = [...genreSet];

  return genres.map(genre => {
    // Exclude the selected brand from genre stats so comparisons are fair
    const rows = allData.filter(d => d.genres?.includes(genre) && (!excludeBrand || d.brand !== excludeBrand));
    const brands = [...new Set(rows.map(d => d.brand))];
    const attended = rows.filter(r => r.attended).length;

    return {
      genre,
      brandCount: brands.length,
      brands,
      totalRegistrations: rows.length,
      avgPerBrand: brands.length > 0 ? Math.round(rows.length / brands.length) : 0,
      totalAttended: attended,
      avgConversion: rows.length > 0
        ? parseFloat(((attended / rows.length) * 100).toFixed(1))
        : 0,
    };
  }).sort((a, b) => b.totalRegistrations - a.totalRegistrations);
}

/**
 * Compare locations.
 */
export function compareLocations(allData) {
  const locations = [...new Set(allData.map(d => d.location))].filter(Boolean);

  return locations.map(loc => {
    const rows = allData.filter(d => d.location === loc);
    const brands = [...new Set(rows.map(d => d.brand))];
    const attended = rows.filter(r => r.attended).length;

    return {
      location: loc,
      brandCount: brands.length,
      brands,
      totalRegistrations: rows.length,
      totalAttended: attended,
      avgConversion: rows.length > 0
        ? parseFloat(((attended / rows.length) * 100).toFixed(1))
        : 0,
    };
  }).sort((a, b) => b.totalRegistrations - a.totalRegistrations);
}

/**
 * Get all brands that have multiple editions (for "Where Are We Now" candidates).
 */
export function getBrandsWithMultipleEditions(allData) {
  const brandEditions = {};
  for (const d of allData) {
    if (!d.brand) continue;
    if (!brandEditions[d.brand]) brandEditions[d.brand] = new Set();
    brandEditions[d.brand].add(d.editionLabel);
  }
  return Object.entries(brandEditions)
    .filter(([_, eds]) => eds.size >= 2)
    .map(([brand, eds]) => ({ brand, editions: [...eds] }));
}

/**
 * Compute registered users and retarget users for a specific brand + edition.
 * Registered = unique users in the target edition.
 * Retarget = unique users from past editions of the same brand NOT in the target edition.
 */
export function computeEditionUserLists(allData, targetBrand, targetEdition) {
  const brandData = allData.filter(d => d.brand === targetBrand);
  const targetRows = brandData.filter(d => d.editionLabel === targetEdition);

  if (!targetRows.length) return { registered: [], retarget: [], eventDate: null };

  const eventDate = targetRows[0].eventDate;

  // --- Registered users (current edition) ---
  const regMap = {};
  for (const d of targetRows) {
    const key = (d.email || d.fullName || d.name || '').toLowerCase().trim();
    if (!key) continue;
    if (!regMap[key]) {
      regMap[key] = {
        fullName: d.fullName || d.name,
        email: d.email,
        phone: d.phone,
        birthDate: d.birthDate || null,
        attended: d.attended,
      };
    }
    // Keep most complete contact info
    if (d.phone && !regMap[key].phone) regMap[key].phone = d.phone;
    if (d.email && !regMap[key].email) regMap[key].email = d.email;
    if (d.attended) regMap[key].attended = true;
  }
  const registered = Object.values(regMap);

  // --- Retarget users (past editions, not in current) ---
  const currentKeys = new Set(Object.keys(regMap));
  const retargetMap = {};

  for (const d of brandData) {
    if (d.editionLabel === targetEdition) continue;
    const key = (d.email || d.fullName || d.name || '').toLowerCase().trim();
    if (!key || currentKeys.has(key)) continue;

    if (!retargetMap[key]) {
      retargetMap[key] = {
        fullName: d.fullName || d.name,
        email: d.email,
        phone: d.phone,
        birthDate: d.birthDate || null,
        pastEditions: new Set(),
        lastEventDate: null,
      };
    }
    if (d.phone && !retargetMap[key].phone) retargetMap[key].phone = d.phone;
    if (d.email && !retargetMap[key].email) retargetMap[key].email = d.email;
    retargetMap[key].pastEditions.add(d.editionLabel);
    if (d.eventDate && (!retargetMap[key].lastEventDate || d.eventDate > retargetMap[key].lastEventDate)) {
      retargetMap[key].lastEventDate = d.eventDate;
    }
  }

  const retarget = Object.values(retargetMap).map(u => ({
    ...u,
    pastEditions: [...u.pastEditions],
    pastEditionCount: u.pastEditions.size || u.pastEditions.length,
  }));

  // Sort: users with phone first (actionable), then by most recent event
  retarget.sort((a, b) => {
    if (a.phone && !b.phone) return -1;
    if (!a.phone && b.phone) return 1;
    return (b.lastEventDate || 0) - (a.lastEventDate || 0);
  });

  return { registered, retarget, eventDate };
}
