import { DAYS_SHORT, FASCE_SHORT, getFascia } from '../config/constants';

/**
 * Get hourly registration distribution with configurable granularity.
 */
export function getHourlyData(data, granularity = 'hourly') {
  const buckets = {};

  if (granularity === 'hourly') {
    for (let h = 0; h < 24; h++) buckets[`${String(h).padStart(2,'0')}:00`] = 0;
  } else if (granularity === '30min') {
    for (let h = 0; h < 24; h++) {
      buckets[`${String(h).padStart(2,'0')}:00`] = 0;
      buckets[`${String(h).padStart(2,'0')}:30`] = 0;
    }
  } else {
    for (let h = 0; h < 24; h++) {
      for (const m of ['00','15','30','45']) buckets[`${String(h).padStart(2,'0')}:${m}`] = 0;
    }
  }

  for (const d of data) {
    if (!d.purchaseDate) continue;
    const h = d.purchaseDate.getHours();
    const min = d.purchaseDate.getMinutes();
    let key;
    if (granularity === 'hourly') key = `${String(h).padStart(2,'0')}:00`;
    else if (granularity === '30min') key = `${String(h).padStart(2,'0')}:${min < 30 ? '00' : '30'}`;
    else key = `${String(h).padStart(2,'0')}:${String(Math.floor(min/15)*15).padStart(2,'0')}`;
    if (buckets[key] !== undefined) buckets[key]++;
  }

  return Object.entries(buckets).map(([hour, registrazioni]) => ({ hour, registrazioni }));
}

/**
 * Hourly data stacked by a grouping key (brand, genre, etc.)
 */
export function getHourlyDataByGroup(data, groupKey, granularity = 'hourly') {
  const groups = [...new Set(data.map(d => d[groupKey]))].filter(Boolean);
  const base = getHourlyData([], granularity);

  const result = base.map(b => {
    const obj = { hour: b.hour };
    groups.forEach(g => { obj[g] = 0; });
    return obj;
  });

  for (const d of data) {
    if (!d.purchaseDate || !d[groupKey]) continue;
    const h = d.purchaseDate.getHours();
    const min = d.purchaseDate.getMinutes();
    let key;
    if (granularity === 'hourly') key = `${String(h).padStart(2,'0')}:00`;
    else if (granularity === '30min') key = `${String(h).padStart(2,'0')}:${min < 30 ? '00' : '30'}`;
    else key = `${String(h).padStart(2,'0')}:${String(Math.floor(min/15)*15).padStart(2,'0')}`;

    const row = result.find(r => r.hour === key);
    if (row && row[d[groupKey]] !== undefined) row[d[groupKey]]++;
  }

  return { data: result, groups };
}

/**
 * Day-of-week distribution.
 */
export function getDowData(data) {
  const buckets = {};
  DAYS_SHORT.forEach(d => { buckets[d] = { giorno: d, count: 0, partecipato: 0 }; });

  for (const d of data) {
    if (!d.dayOfWeek) continue;
    const short = d.dayOfWeek.substring(0, 3);
    if (buckets[short]) {
      buckets[short].count++;
      if (d.attended) buckets[short].partecipato++;
    }
  }
  return DAYS_SHORT.map(d => buckets[d]);
}

/**
 * Day-of-week data stacked by group.
 */
export function getDowDataByGroup(data, groupKey) {
  const groups = [...new Set(data.map(d => d[groupKey]))].filter(Boolean);
  const result = DAYS_SHORT.map(d => {
    const obj = { giorno: d };
    groups.forEach(g => { obj[g] = 0; });
    return obj;
  });

  for (const d of data) {
    if (!d.dayOfWeek) continue;
    const short = d.dayOfWeek.substring(0, 3);
    const row = result.find(r => r.giorno === short);
    if (row && d[groupKey] && row[d[groupKey]] !== undefined) row[d[groupKey]]++;
  }
  return { data: result, groups };
}

/**
 * Fascia oraria distribution.
 */
export function getFasciaData(data) {
  const buckets = {};
  FASCE_SHORT.forEach(f => { buckets[f] = { fascia: f, count: 0, partecipato: 0 }; });

  for (const d of data) {
    const f = d.fascia || getFascia(d.hour);
    if (buckets[f]) {
      buckets[f].count++;
      if (d.attended) buckets[f].partecipato++;
    }
  }
  return FASCE_SHORT.map(f => buckets[f]);
}

/**
 * Fascia data stacked by group.
 */
export function getFasciaDataByGroup(data, groupKey) {
  const groups = [...new Set(data.map(d => d[groupKey]))].filter(Boolean);
  const result = FASCE_SHORT.map(f => {
    const obj = { fascia: f };
    groups.forEach(g => { obj[g] = 0; });
    return obj;
  });

  for (const d of data) {
    const f = d.fascia || getFascia(d.hour);
    const row = result.find(r => r.fascia === f);
    if (row && d[groupKey] && row[d[groupKey]] !== undefined) row[d[groupKey]]++;
  }
  return { data: result, groups };
}

/**
 * Days-before-event distribution.
 */
export function getDaysBeforeData(data, maxDays = 14) {
  const buckets = {};
  for (let i = maxDays; i >= 0; i--) {
    const label = i === 0 ? 'Giorno evento' : `-${i}`;
    buckets[i] = { days: label, dayNum: i, count: 0 };
  }

  for (const d of data) {
    if (d.daysBefore === null || d.daysBefore === undefined) continue;
    const key = Math.min(d.daysBefore, maxDays);
    if (buckets[key]) buckets[key].count++;
  }

  return Object.values(buckets).sort((a, b) => b.dayNum - a.dayNum);
}

/**
 * Days-before-event stacked by group (e.g., by edition label).
 */
export function getDaysBeforeDataByGroup(data, groupKey, maxDays = 14) {
  const groups = [...new Set(data.map(d => d[groupKey]))].filter(Boolean);
  const result = [];
  for (let i = maxDays; i >= 0; i--) {
    const obj = { days: i === 0 ? 'Giorno evento' : `-${i}`, dayNum: i };
    groups.forEach(g => { obj[g] = 0; });
    result.push(obj);
  }

  for (const d of data) {
    if (d.daysBefore === null || d.daysBefore === undefined || !d[groupKey]) continue;
    const key = Math.min(d.daysBefore, maxDays);
    const row = result.find(r => r.dayNum === key);
    if (row && row[d[groupKey]] !== undefined) row[d[groupKey]]++;
  }

  return { data: result, groups };
}

/**
 * Daily trend (date → total, partecipato).
 */
export function getTrendData(data) {
  const byDate = {};
  for (const d of data) {
    if (!d.purchaseDate) continue;
    const key = d.purchaseDate.toLocaleDateString('it');
    if (!byDate[key]) byDate[key] = { date: key, total: 0, partecipato: 0, dateObj: new Date(d.purchaseDate) };
    byDate[key].total++;
    if (d.attended) byDate[key].partecipato++;
  }
  return Object.values(byDate).sort((a, b) => a.dateObj - b.dateObj);
}

/**
 * Daily trend stacked by group.
 */
export function getTrendDataByGroup(data, groupKey) {
  const groups = [...new Set(data.map(d => d[groupKey]))].filter(Boolean);
  const byDate = {};

  for (const d of data) {
    if (!d.purchaseDate || !d[groupKey]) continue;
    const key = d.purchaseDate.toLocaleDateString('it');
    if (!byDate[key]) {
      byDate[key] = { date: key, dateObj: new Date(d.purchaseDate) };
      groups.forEach(g => { byDate[key][g] = 0; });
    }
    byDate[key][d[groupKey]]++;
  }

  return {
    data: Object.values(byDate).sort((a, b) => a.dateObj - b.dateObj),
    groups,
  };
}

/**
 * Conversion rate by fascia.
 */
export function getConversionByFascia(data) {
  const buckets = {};
  FASCE_SHORT.forEach(f => { buckets[f] = { fascia: f, total: 0, attended: 0 }; });

  for (const d of data) {
    const f = d.fascia || getFascia(d.hour);
    if (buckets[f]) {
      buckets[f].total++;
      if (d.attended) buckets[f].attended++;
    }
  }

  return FASCE_SHORT.map(f => ({
    fascia: f,
    conversione: buckets[f].total > 0
      ? parseFloat(((buckets[f].attended / buckets[f].total) * 100).toFixed(1))
      : 0,
    registrazioni: buckets[f].total,
  }));
}

/**
 * Build heatmap data (7 days × 24 hours).
 */
export function getHeatmapData(data) {
  const grid = {};
  DAYS_SHORT.forEach(d => {
    grid[d] = {};
    for (let h = 0; h < 24; h++) grid[d][h] = 0;
  });

  for (const d of data) {
    if (!d.dayOfWeek || d.hour === undefined) continue;
    const short = d.dayOfWeek.substring(0, 3);
    if (grid[short]) grid[short][d.hour]++;
  }

  return grid;
}

/**
 * User statistics with segmentation.
 */
export function getUserStats(data) {
  const byUser = {};

  for (const d of data) {
    const key = d.email || d.fullName || d.name;
    if (!key) continue;

    if (!byUser[key]) {
      byUser[key] = {
        name: d.fullName || d.name,
        email: d.email,
        phone: d.phone,
        birthDate: d.birthDate || null,
        totalRegs: 0,
        totalParticipated: 0,
        events: {},
        lastReg: null,
      };
    }

    // Keep most complete contact info across records
    if (d.phone && !byUser[key].phone) byUser[key].phone = d.phone;
    if (d.email && !byUser[key].email) byUser[key].email = d.email;
    if (d.birthDate && !byUser[key].birthDate) byUser[key].birthDate = d.birthDate;

    byUser[key].totalRegs++;
    if (d.attended) byUser[key].totalParticipated++;

    const evKey = d.brand || d.rawEventName;
    if (!byUser[key].events[evKey]) {
      byUser[key].events[evKey] = { event: evKey, count: 0, participated: 0 };
    }
    byUser[key].events[evKey].count++;
    if (d.attended) byUser[key].events[evKey].participated++;

    if (!byUser[key].lastReg || d.purchaseDate > byUser[key].lastReg) {
      byUser[key].lastReg = d.purchaseDate;
    }
  }

  return Object.values(byUser).map(u => {
    const events = Object.values(u.events);
    const conversion = u.totalRegs > 0
      ? parseFloat(((u.totalParticipated / u.totalRegs) * 100).toFixed(1))
      : 0;
    const eventCount = events.length;

    let segment;
    if (conversion >= 80) segment = 'vip';
    else if (eventCount >= 3) segment = 'fedeli';
    else if (conversion === 0) segment = 'ghost';
    else segment = 'occasionali';

    return {
      ...u,
      events,
      eventCount,
      conversion,
      segment,
    };
  });
}

/**
 * Get event/edition statistics summary.
 */
export function getEventStats(data) {
  const byEvent = {};

  for (const d of data) {
    const key = `${d.brand}|||${d.editionLabel}`;
    if (!byEvent[key]) {
      byEvent[key] = {
        brand: d.brand,
        editionLabel: d.editionLabel,
        rawEventName: d.rawEventName,
        location: d.location,
        category: d.category,
        genres: d.genres,
        eventDate: d.eventDate,
        registrations: 0,
        entries: 0,
      };
    }
    byEvent[key].registrations++;
    if (d.attended) byEvent[key].entries++;
  }

  return Object.values(byEvent).map(e => ({
    ...e,
    conversion: e.registrations > 0
      ? parseFloat(((e.entries / e.registrations) * 100).toFixed(1))
      : 0,
  })).sort((a, b) => b.registrations - a.registrations);
}

/**
 * Yearly average cumulative registration curves.
 * Groups editions by year, builds cumulative curves per edition,
 * then averages them per year. Returns Recharts-ready data.
 *
 * @returns {{ data: Array<{day: number, [year]: number}>, years: string[] }}
 */
export function getYearlyAvgCurves(data, maxDays = 30) {
  // 1. Group records by edition
  const byEdition = {};
  for (const d of data) {
    if (!d.editionLabel || d.daysBefore == null || !d.eventDate) continue;
    if (!byEdition[d.editionLabel]) {
      byEdition[d.editionLabel] = { year: d.eventDate.getFullYear(), rows: [] };
    }
    byEdition[d.editionLabel].rows.push(d);
  }

  // 2. Build cumulative curve for each edition: { daysBefore → cumulative count }
  const editionCurves = {};
  for (const [label, { year, rows }] of Object.entries(byEdition)) {
    // Count registrations per daysBefore
    const daily = {};
    for (const r of rows) {
      const db = Math.min(r.daysBefore, maxDays);
      daily[db] = (daily[db] || 0) + 1;
    }
    // Build cumulative from maxDays down to 0
    const cumulative = {};
    let sum = 0;
    for (let d = maxDays; d >= 0; d--) {
      sum += (daily[d] || 0);
      cumulative[d] = sum;
    }
    editionCurves[label] = { year, cumulative };
  }

  // 3. Group editions by year
  const byYear = {};
  for (const [, { year, cumulative }] of Object.entries(editionCurves)) {
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(cumulative);
  }

  const years = Object.keys(byYear).sort();
  if (years.length === 0) return { data: [], years: [] };

  // 4. Average cumulative curves per year → Recharts data points
  const chartData = [];
  for (let d = maxDays; d >= 0; d--) {
    const point = { day: d === 0 ? 0 : -d, dayNum: d };
    for (const year of years) {
      const curves = byYear[year];
      const vals = curves.map(c => c[d]).filter(v => v != null);
      point[year] = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    }
    chartData.push(point);
  }

  return { data: chartData, years };
}
