/**
 * Comparison Engine - Multi-level comparison and "Where Are We Now" feature.
 */
import { midnight, dayDiff, isEditionOver, samePointFor, latestPurchase, conversionOf } from './eventTime';
import { normalizePhone } from './datasetMerge';

/**
 * Simple linear regression: y = a*x + b
 * Returns { a, b, r2 } or null if insufficient data.
 */
export function linReg(points) {
  const n = points.length;
  if (n < 2) return null;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const xm = xs.reduce((s, v) => s + v, 0) / n;
  const ym = ys.reduce((s, v) => s + v, 0) / n;
  let ssxy = 0, ssxx = 0, ssyy = 0;
  for (let i = 0; i < n; i++) {
    ssxy += (xs[i] - xm) * (ys[i] - ym);
    ssxx += (xs[i] - xm) ** 2;
    ssyy += (ys[i] - ym) ** 2;
  }
  if (ssxx === 0) return null;
  const a = ssxy / ssxx;
  const b = ym - a * xm;
  const r2 = ssyy > 0 ? (ssxy ** 2) / (ssxx * ssyy) : 0;
  return { a, b, r2 };
}

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
 * Final registrations expected for a night on sale, from past nights at the same
 * point: [{ atSamePointAdjusted, totalFinal, eventDate }].
 *
 * Two estimates are blended:
 * - the pace: the current count times the median of final / count-at-this-point;
 * - the level: the average final of the last 3 nights.
 * Far from the event past nights had only a small share of their final by now, so
 * the pace multiplies a small, noisy number by 10-40: its weight is the square
 * root of that typical share, and the level weighs the rest. Measured on past
 * nights (Confronta > stime) this took the typical error from ±39% to ±23% three
 * days out and from ±23% to ±16% the day before, without the old underestimate.
 * The range blends the pace's interquartile range (min-max under 4 nights) with
 * the lowest and highest of the last 3 finals. Never below the current count.
 * Flagged unreliable when fewer than 3 nights back it or, at this point, past
 * nights typically had less than 20% of their final.
 */
export function projectFinal(comps, current) {
  const valid = comps.filter(c => c.totalFinal > 0);
  if (!valid.length || !(current > 0)) return null;
  const ratios = valid
    .filter(c => c.atSamePointAdjusted > 0)
    .map(c => c.totalFinal / c.atSamePointAdjusted)
    .sort((a, b) => a - b);
  const completion = quantile(valid.map(c => c.atSamePointAdjusted / c.totalFinal).sort((a, b) => a - b), 0.5);
  const w = ratios.length ? Math.sqrt(Math.min(1, completion)) : 0;
  const recent = [...valid].sort((a, b) => (a.eventDate || 0) - (b.eventDate || 0)).slice(-3).map(c => c.totalFinal);
  const level = recent.reduce((s, v) => s + v, 0) / recent.length;
  const ratio = (q, fallback) => (ratios.length ? (ratios.length >= 4 ? quantile(ratios, q) : fallback) : 0);
  const blend = (r, lvl) => Math.max(current, Math.round(w * current * r + (1 - w) * lvl));
  return {
    value: blend(ratio(0.5, quantile(ratios, 0.5)), level),
    low: blend(ratio(0.25, ratios[0]), Math.min(...recent)),
    high: blend(ratio(0.75, ratios[ratios.length - 1]), Math.max(...recent)),
    pace: ratios.length ? Math.round(current * quantile(ratios, 0.5)) : null,
    level: Math.round(level),
    paceWeight: Math.round(w * 100) / 100,
    basedOn: valid.length,
    typicalCompletion: completion,
    reliable: valid.length >= 3 && completion >= 0.2,
  };
}

/**
 * Averages at the same point and projection (see projectFinal) from the past
 * nights: the one place KPIs, chart, year filters and the AI report get them.
 */
export function summarizeComparisons(comps, currentRegistrations, isEventPast) {
  const n = comps.length;
  const avgAtSamePoint = n ? Math.round(comps.reduce((s, c) => s + (c.atSamePointAdjusted || 0), 0) / n) : 0;
  const avgFinal = n ? Math.round(comps.reduce((s, c) => s + c.totalFinal, 0) / n) : 0;
  const progressPercent = avgFinal > 0 ? Math.round((currentRegistrations / avgFinal) * 100) : 0;
  const projection = isEventPast ? null : projectFinal(comps, currentRegistrations);
  return { avgAtSamePoint, avgFinal, progressPercent, projection };
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * "WHERE ARE WE NOW" - The killer feature.
 * For a given brand and target edition (upcoming/current), compare registration
 * progress against the same point in time of previous editions.
 *
 * The same point is a wall-clock moment relative to the event day ("2 days before
 * at 14:10", "after midnight at 01:30"). It is the time of the newest registration
 * in the data, because the data is as recent as the last export; when the current
 * count is typed in by hand (overrides) it is now. Only past editions that are
 * over and have a date are compared.
 *
 * overrides: optional object with two modes
 *   { mode: 'now', value: 70 }           — override current total only
 *   { mode: 'daily', days: { 2: 55, 1: 65, 0: 70 } } — cumulative totals for specific days-before
 * options: { now, dataAsOf } — injectable clock and data freshness (tests)
 */
export function computeWhereAreWeNow(allData, targetBrand, targetEdition, overrides, options = {}) {
  const brandData = allData.filter(d => d.brand === targetBrand);
  const targetRows = brandData.filter(d => d.editionLabel === targetEdition);

  if (!targetRows.length) return null;

  const targetEventDate = targetRows[0].eventDate;
  if (!targetEventDate) return null;

  const now = options.now || new Date();
  const eventDay = midnight(targetEventDate);
  // Days to the event as of today (badge, manual inputs)
  const currentDaysBefore = Math.max(0, dayDiff(now, eventDay));
  // Event is "past" only after 6am the day after (door registrations until ~3am)
  const isEventPast = isEditionOver(targetEventDate, now);
  const dataRegistrations = targetRows.length;
  const currentAttended = targetRows.filter(r => r.attended).length;

  const hasOverride = !isEventPast && !!overrides && (
    (overrides.mode === 'now' && overrides.value > 0) ||
    (overrides.mode === 'daily' && overrides.days?.[currentDaysBefore] > 0)
  );
  const dataAsOf = options.dataAsOf !== undefined ? options.dataAsOf : latestPurchase(allData);
  const reference = (hasOverride || !dataAsOf || dataAsOf > now) ? now : dataAsOf;
  // Days before the event at the comparison point (where the data stops)
  const pointDaysBefore = isEventPast ? 0 : Math.max(0, dayDiff(reference, eventDay));
  const isDataStale = !isEventPast && !hasOverride && !!dataAsOf && (now - dataAsOf) > 12 * 3600000;

  // Build the target's own cumulative curve from file data, up to where the data stops
  const rawTargetCumulative = buildCumulativeCurve(targetRows);
  if (!isEventPast) {
    for (const d of Object.keys(rawTargetCumulative).map(Number)) {
      if (d < pointDaysBefore) delete rawTargetCumulative[d];
    }
  }

  // Detect missing/incomplete days based on actual registration timestamps
  const rowsWithDays = targetRows.filter(r => r.daysBefore !== null && r.daysBefore !== undefined);
  const mostRecentDataDay = rowsWithDays.length > 0
    ? Math.min(...rowsWithDays.map(r => r.daysBefore))
    : currentDaysBefore;

  // Check if the most recent data day is "complete" (last registration after 23:00)
  const recentDayRows = rowsWithDays.filter(r => r.daysBefore === mostRecentDataDay);
  const latestPurchaseHour = recentDayRows.reduce((max, r) => {
    const h = r.purchaseDate ? r.purchaseDate.getHours() : 0;
    return h > max ? h : max;
  }, 0);
  const isRecentDayComplete = latestPurchaseHour >= 23;

  // Build missing days list
  const missingDays = [];
  // Start from mostRecentDataDay if incomplete, otherwise from the day after
  const startDay = isRecentDayComplete ? mostRecentDataDay - 1 : mostRecentDataDay;
  for (let d = startDay; d >= currentDaysBefore; d--) {
    missingDays.push(d);
  }
  // Always include today if not already there
  if (!missingDays.includes(currentDaysBefore)) {
    missingDays.push(currentDaysBefore);
  }
  missingDays.sort((a, b) => b - a); // descending (farthest day first)

  // Apply overrides to cumulative curve
  const targetCumulative = { ...rawTargetCumulative };
  let currentRegistrations = dataRegistrations;
  let isOverridden = false;

  if (!isEventPast && overrides) {
    if (overrides.mode === 'now' && overrides.value != null && overrides.value > 0) {
      currentRegistrations = overrides.value;
      isOverridden = overrides.value !== dataRegistrations;
      // Patch the cumulative curve at currentDaysBefore
      targetCumulative[currentDaysBefore] = overrides.value;
    } else if (overrides.mode === 'daily' && overrides.days) {
      // Merge daily cumulative values into the curve
      const sortedDays = Object.keys(overrides.days).map(Number).sort((a, b) => b - a);
      for (const d of sortedDays) {
        const val = overrides.days[d];
        if (val != null && val > 0) {
          targetCumulative[d] = val;
        }
      }
      // currentRegistrations = value at currentDaysBefore (today)
      if (overrides.days[currentDaysBefore] != null && overrides.days[currentDaysBefore] > 0) {
        currentRegistrations = overrides.days[currentDaysBefore];
        isOverridden = currentRegistrations !== dataRegistrations;
      }
    }

    // Fill gaps between last file data point and override point(s)
    // Cumulative curves must be monotonically non-decreasing, so days
    // without explicit data should carry forward the last known value.
    const allDays = Object.keys(targetCumulative).map(Number).sort((a, b) => b - a);
    if (allDays.length > 0) {
      const maxDay = allDays[0];
      const minDay = allDays[allDays.length - 1];
      let carry = 0;
      for (let d = maxDay; d >= minDay; d--) {
        if (targetCumulative[d] != null) {
          // Ensure monotonically non-decreasing
          if (targetCumulative[d] < carry) targetCumulative[d] = carry;
          carry = targetCumulative[d];
        } else {
          // Fill gap: carry forward last known value
          targetCumulative[d] = carry;
        }
      }
    }
  }

  // Past editions of this brand that are over and have a date: editions still
  // on sale (weekly events) or undated would drag the averages down
  const otherEditions = [...new Set(brandData.map(d => d.editionLabel))]
    .filter(e => e !== targetEdition);

  const comparisons = [];

  for (const edLabel of otherEditions) {
    const edRows = brandData.filter(d => d.editionLabel === edLabel);
    if (!edRows.length) continue;

    const edEventDate = edRows[0].eventDate;
    if (!edEventDate || !isEditionOver(edEventDate, now)) continue;
    const cumulative = buildCumulativeCurve(edRows);
    const totalFinal = edRows.length;
    const totalAttended = edRows.filter(r => r.attended).length;
    const atSamePoint = cumulative[pointDaysBefore] || 0;

    // Registrations that had arrived by the same moment relative to this edition's day
    const cutoff = samePointFor(edEventDate, reference, targetEventDate);
    const atSamePointAdjusted = isEventPast
      ? totalFinal
      : edRows.filter(r => r.purchaseDate && r.purchaseDate <= cutoff).length;

    const delta = currentRegistrations - atSamePointAdjusted;
    const deltaPercent = atSamePointAdjusted > 0
      ? parseFloat(((delta / atSamePointAdjusted) * 100).toFixed(1))
      : null;
    const projectedFinal = (!isEventPast && atSamePointAdjusted > 0)
      ? Math.round((currentRegistrations / atSamePointAdjusted) * totalFinal)
      : null;

    // What % of final registrations this edition had at the same point (time-adjusted)
    const completionPercent = totalFinal > 0
      ? parseFloat(((atSamePointAdjusted / totalFinal) * 100).toFixed(1))
      : 0;

    comparisons.push({
      editionLabel: edLabel,
      eventDate: edEventDate,
      totalFinal,
      totalAttended,
      // No scans at all means the entries were not exported, not that nobody came
      finalConversion: totalAttended > 0 ? parseFloat(((totalAttended / totalFinal) * 100).toFixed(1)) : null,
      cumulative,
      atSamePoint,
      atSamePointAdjusted,
      delta,
      deltaPercent,
      projectedFinal,
      completionPercent,
    });
  }

  const { avgAtSamePoint, avgFinal, progressPercent, projection } =
    summarizeComparisons(comparisons, currentRegistrations, isEventPast);

  // Build overlay chart data (all editions on same x-axis of days-before)
  const maxDaysAll = Math.max(
    ...comparisons.map(c => Math.max(...Object.keys(c.cumulative).map(Number), 0)),
    ...Object.keys(targetCumulative).map(Number),
    0
  );

  const overlayData = [];
  for (let d = maxDaysAll; d >= 0; d--) {
    const point = { daysBefore: d, label: d === 0 ? 'Evento' : `-${d}` };
    point[targetEdition] = targetCumulative[d] != null ? targetCumulative[d] : null;
    for (const comp of comparisons) {
      point[comp.editionLabel] = comp.cumulative[d] != null ? comp.cumulative[d] : null;
    }
    overlayData.push(point);
  }

  const pad = n => String(n).padStart(2, '0');
  return {
    brand: targetBrand,
    edition: targetEdition,
    eventDate: targetEventDate,
    currentDaysBefore,
    pointDaysBefore,
    isEventPast,
    currentRegistrations,
    dataRegistrations,
    isOverridden,
    missingDays,
    currentAttended,
    currentConversion: isEventPast && currentAttended > 0
      ? parseFloat(((currentAttended / currentRegistrations) * 100).toFixed(1))
      : null,
    comparisons,
    avgAtSamePoint,
    avgFinal,
    progressPercent,
    projection,
    overlayData,
    allEditionLabels: [targetEdition, ...comparisons.map(c => c.editionLabel)],
    targetCumulative,
    dataAsOf,
    isDataStale,
    referenceTime: reference,
    snapshotHour: `${pad(reference.getHours())}:${pad(reference.getMinutes())}`,
  };
}

/**
 * Cross-brand comparison: compare brandA editions vs brandB editions.
 * Shows all editions of both brands on the same cumulative chart,
 * with summary stats for each brand.
 */
export function computeCrossBrandComparison(allData, brandA, brandB, specificEditionB = null) {
  const dataA = allData.filter(d => d.brand === brandA);
  const dataB = allData.filter(d => d.brand === brandB);

  if (!dataA.length || !dataB.length) return null;

  const editionsA = [...new Set(dataA.map(d => d.editionLabel))].filter(Boolean);
  const allEditionsB = [...new Set(dataB.map(d => d.editionLabel))].filter(Boolean);
  // If a specific edition is selected, filter to just that one
  const editionsB = specificEditionB ? allEditionsB.filter(e => e === specificEditionB) : allEditionsB;
  if (editionsB.length === 0) return null;

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
        conversion: conversionOf(edRows),
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
      avgConversion: conversionOf(rows),
      editionCount: editions.length,
    };
  }

  const aggA = brandAgg(dataA, editionsA);
  // When a specific edition is selected, filter dataB to only that edition's rows
  const filteredDataB = specificEditionB ? dataB.filter(d => editionsB.includes(d.editionLabel)) : dataB;
  const aggB = brandAgg(filteredDataB, editionsB);

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

    // Growth: first vs last concluded edition (one still on sale has a partial count)
    let growth = null;
    const editionStats = editions.map(ed => ({
      edition: ed,
      count: rows.filter(r => r.editionLabel === ed).length,
      eventDate: rows.find(r => r.editionLabel === ed)?.eventDate,
    })).filter(e => isEditionOver(e.eventDate)).sort((a, b) => a.eventDate - b.eventDate);
    if (editionStats.length >= 2) {

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
      avgConversion: conversionOf(rows),
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
      avgPerEdition: (() => {
        const eds = new Set(rows.map(d => `${d.brand}|${d.editionLabel}`)).size;
        return eds > 0 ? Math.round(rows.length / eds) : 0;
      })(),
      totalAttended: attended,
      avgConversion: conversionOf(rows),
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
      avgConversion: conversionOf(rows),
    };
  }).sort((a, b) => b.totalRegistrations - a.totalRegistrations);
}

/**
 * Get all brands available for the Live Tracker (1+ edition), brands with an
 * upcoming edition first (nearest first). defaultEdition is the edition to open:
 * tonight's or the next one, otherwise the most recent.
 */
export function getBrandsForTracker(allData, now = new Date()) {
  const brandEditions = {};
  for (const d of allData) {
    if (!d.brand) continue;
    if (!brandEditions[d.brand]) brandEditions[d.brand] = {};
    if (!brandEditions[d.brand][d.editionLabel]) {
      brandEditions[d.brand][d.editionLabel] = d.eventDate || null;
    }
    // Keep the most reliable eventDate (non-null wins)
    if (d.eventDate && !brandEditions[d.brand][d.editionLabel]) {
      brandEditions[d.brand][d.editionLabel] = d.eventDate;
    }
  }
  return Object.entries(brandEditions)
    .filter(([_, eds]) => Object.keys(eds).length >= 1)
    .map(([brand, eds]) => {
      const sorted = Object.entries(eds).sort((a, b) => (a[1] || 0) - (b[1] || 0));
      const upcoming = sorted.find(([, date]) => date && !isEditionOver(date, now));
      return {
        brand,
        editions: sorted.map(([label]) => label),
        nextEventDate: upcoming ? upcoming[1] : null,
        defaultEdition: upcoming ? upcoming[0] : sorted[sorted.length - 1][0],
      };
    })
    .sort((a, b) => {
      if (a.nextEventDate && b.nextEventDate) return a.nextEventDate - b.nextEventDate;
      if (a.nextEventDate) return -1;
      if (b.nextEventDate) return 1;
      return a.brand.localeCompare(b.brand);
    });
}

/**
 * Compute registered users and retarget users for a specific brand + edition.
 * Registered = unique users in the target edition.
 * Retarget = people who came to past editions of the same brand and are NOT registered to the target edition.
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

  // --- Retarget users: people who came (scanned) to past editions and are not
  // registered to this one. Identified by phone first: the same person can register
  // with different emails, and two rows with one phone must get one message.
  const currentPhones = new Set(targetRows.map(d => normalizePhone(d.phone)).filter(Boolean));
  const currentEmails = new Set(targetRows.map(d => (d.email || '').toLowerCase()).filter(Boolean));
  const retargetMap = {};

  for (const d of brandData) {
    if (d.editionLabel === targetEdition || !d.attended) continue;
    const phone = normalizePhone(d.phone);
    const email = (d.email || '').toLowerCase();
    if ((phone && currentPhones.has(phone)) || (email && currentEmails.has(email))) continue;
    const key = phone || email || (d.fullName || d.name || '').toLowerCase().trim();
    if (!key) continue;

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

  // Sort: users with phone first (actionable), then who came most often, then most recent
  retarget.sort((a, b) => {
    if (a.phone && !b.phone) return -1;
    if (!a.phone && b.phone) return 1;
    if (b.pastEditionCount !== a.pastEditionCount) return b.pastEditionCount - a.pastEditionCount;
    return (b.lastEventDate || 0) - (a.lastEventDate || 0);
  });

  return { registered, retarget, eventDate };
}
