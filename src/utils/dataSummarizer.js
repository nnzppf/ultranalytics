import { BRAND_REGISTRY, GENRE_LABELS } from '../config/eventConfig';

/**
 * Builds a text summary of the club's data for the AI assistant.
 * Keeps it concise but informative — the AI needs context to answer well.
 */
export function buildDataSummary(data, analytics, userStats) {
  if (!data || !data.length || !analytics) return 'Nessun dato disponibile.';

  const lines = [];

  // General KPIs
  lines.push('## KPI GENERALI');
  lines.push(`Registrazioni totali: ${analytics.total}`);
  lines.push(`Presenze totali: ${analytics.entered}`);
  lines.push(`Tasso di conversione: ${analytics.conv}%`);
  lines.push(`Tasso no-show: ${analytics.noShowRate}%`);
  lines.push(`Numero brand/eventi: ${analytics.brands?.length || 0}`);
  lines.push('');

  // Per-event stats (fields: brand, editionLabel, registrations, entries, conversion, eventDate)
  if (analytics.eventStats && analytics.eventStats.length > 0) {
    lines.push('## STATISTICHE PER EVENTO (tutte le edizioni)');
    for (const ev of analytics.eventStats) {
      const name = ev.editionLabel || ev.brand || 'n/a';
      const date = ev.eventDate ? new Date(ev.eventDate).toLocaleDateString('it') : 'n/a';
      lines.push(`- ${name} (${ev.brand}): ${ev.registrations} reg, ${ev.entries} presenze, ${ev.conversion}% conversione, data: ${date}`);
    }
    lines.push('');
  }

  // Brand breakdown
  const brandMap = {};
  for (const r of data) {
    if (!r.brand) continue;
    if (!brandMap[r.brand]) brandMap[r.brand] = { total: 0, attended: 0, editions: new Set() };
    brandMap[r.brand].total++;
    if (r.attended) brandMap[r.brand].attended++;
    if (r.editionLabel) brandMap[r.brand].editions.add(r.editionLabel);
  }
  if (Object.keys(brandMap).length > 0) {
    lines.push('## BRAND');
    for (const [brand, stats] of Object.entries(brandMap).sort((a, b) => b[1].total - a[1].total)) {
      const conv = stats.total > 0 ? ((stats.attended / stats.total) * 100).toFixed(1) : 0;
      const config = BRAND_REGISTRY[brand];
      const genres = config?.genres?.map(g => GENRE_LABELS[g]?.label || g).join(', ') || 'n/a';
      const category = config?.category || 'n/a';
      lines.push(`- ${brand}: ${stats.total} reg, ${stats.attended} presenze, ${conv}% conv, ${stats.editions.size} edizioni, categoria: ${category}, generi: ${genres}`);
    }
    lines.push('');
  }

  // Category breakdown
  const catMap = {};
  for (const r of data) {
    const cat = r.category || 'unknown';
    if (!catMap[cat]) catMap[cat] = { total: 0, attended: 0 };
    catMap[cat].total++;
    if (r.attended) catMap[cat].attended++;
  }
  lines.push('## CATEGORIE (Standard/Young/Senior)');
  for (const [cat, stats] of Object.entries(catMap)) {
    const conv = stats.total > 0 ? ((stats.attended / stats.total) * 100).toFixed(1) : 0;
    lines.push(`- ${cat}: ${stats.total} reg, ${stats.attended} presenze, ${conv}% conv`);
  }
  lines.push('');

  // Genre breakdown
  const genreMap = {};
  for (const r of data) {
    const genres = r.genres || BRAND_REGISTRY[r.brand]?.genres || [];
    for (const g of genres) {
      if (!genreMap[g]) genreMap[g] = { total: 0, attended: 0 };
      genreMap[g].total++;
      if (r.attended) genreMap[g].attended++;
    }
  }
  if (Object.keys(genreMap).length > 0) {
    lines.push('## GENERI MUSICALI');
    for (const [genre, stats] of Object.entries(genreMap).sort((a, b) => b[1].total - a[1].total)) {
      const label = GENRE_LABELS[genre]?.label || genre;
      const conv = stats.total > 0 ? ((stats.attended / stats.total) * 100).toFixed(1) : 0;
      lines.push(`- ${label}: ${stats.total} reg, ${stats.attended} presenze, ${conv}% conv`);
    }
    lines.push('');
  }

  // Day of week performance (fields: giorno, count, partecipato)
  if (analytics.dowData && analytics.dowData.length > 0) {
    lines.push('## PERFORMANCE PER GIORNO DELLA SETTIMANA');
    for (const d of analytics.dowData) {
      lines.push(`- ${d.giorno}: ${d.count} registrazioni, ${d.partecipato || 0} presenze`);
    }
    lines.push('');
  }

  // Hourly registration peaks (fields: hour, registrazioni)
  if (analytics.hourlyReg && analytics.hourlyReg.length > 0) {
    const sorted = [...analytics.hourlyReg].sort((a, b) => b.registrazioni - a.registrazioni);
    lines.push('## PICCHI ORARI DI REGISTRAZIONE (top 5)');
    for (const h of sorted.slice(0, 5)) {
      lines.push(`- Ore ${h.hour}: ${h.registrazioni} registrazioni`);
    }
    lines.push('');
  }

  // Days before event registration pattern (fields: days, count)
  if (analytics.daysBeforeData && analytics.daysBeforeData.length > 0) {
    lines.push('## REGISTRAZIONI PER GIORNI PRIMA DELL\'EVENTO (globale)');
    const sorted = [...analytics.daysBeforeData].sort((a, b) => b.dayNum - a.dayNum);
    for (const d of sorted) {
      if (d.count > 0) lines.push(`- ${d.days}: ${d.count} registrazioni`);
    }
    lines.push('');
  }

  // Days before event per brand (detailed breakdown for each brand)
  const brandDaysBefore = {};
  for (const r of data) {
    if (!r.brand || r.daysBefore === null || r.daysBefore === undefined) continue;
    if (!brandDaysBefore[r.brand]) brandDaysBefore[r.brand] = {};
    const key = Math.min(r.daysBefore, 14);
    const label = key === 0 ? 'Giorno evento' : `-${key}`;
    if (!brandDaysBefore[r.brand][label]) brandDaysBefore[r.brand][label] = { count: 0, dayNum: key };
    brandDaysBefore[r.brand][label].count++;
  }
  if (Object.keys(brandDaysBefore).length > 0) {
    lines.push('## REGISTRAZIONI PER GIORNI PRIMA DELL\'EVENTO (per brand)');
    for (const [brand, days] of Object.entries(brandDaysBefore).sort((a, b) => {
      const totalA = Object.values(a[1]).reduce((s, d) => s + d.count, 0);
      const totalB = Object.values(b[1]).reduce((s, d) => s + d.count, 0);
      return totalB - totalA;
    })) {
      const entries = Object.entries(days).sort((a, b) => b[1].dayNum - a[1].dayNum);
      const detail = entries.map(([label, d]) => `${label}: ${d.count}`).join(', ');
      lines.push(`- ${brand}: ${detail}`);
    }
    lines.push('');
  }

  // Trend data (fields: date, total, partecipato) — all days, not just last 10
  if (analytics.trendData && analytics.trendData.length > 0) {
    lines.push('## TREND REGISTRAZIONI (cronologico, tutti i giorni)');
    for (const t of analytics.trendData) {
      const conv = t.total > 0 ? ((t.partecipato / t.total) * 100).toFixed(1) : 0;
      lines.push(`- ${t.date}: ${t.total} reg, ${t.partecipato} pres, ${conv}% conv`);
    }
    lines.push('');
  }

  // Per-edition detailed breakdown (days before, hourly peaks, day of week)
  const editionMap = {};
  for (const r of data) {
    if (!r.brand || !r.editionLabel) continue;
    const key = `${r.brand}|||${r.editionLabel}`;
    if (!editionMap[key]) editionMap[key] = { brand: r.brand, edition: r.editionLabel, eventDate: r.eventDate, rows: [] };
    editionMap[key].rows.push(r);
  }
  const editions = Object.values(editionMap).sort((a, b) => {
    const da = a.eventDate ? new Date(a.eventDate) : new Date(0);
    const db = b.eventDate ? new Date(b.eventDate) : new Date(0);
    return db - da;
  });
  if (editions.length > 0) {
    lines.push('## DETTAGLIO PER EDIZIONE (giorni prima, picchi orari, giorno settimana)');
    for (const ed of editions) {
      const date = ed.eventDate ? new Date(ed.eventDate).toLocaleDateString('it') : 'n/a';
      lines.push(`### ${ed.edition} (${ed.brand}) - ${date}`);

      // Days before distribution for this edition
      const daysBefore = {};
      for (const r of ed.rows) {
        if (r.daysBefore === null || r.daysBefore === undefined) continue;
        const k = Math.min(r.daysBefore, 14);
        daysBefore[k] = (daysBefore[k] || 0) + 1;
      }
      if (Object.keys(daysBefore).length > 0) {
        const dbEntries = Object.entries(daysBefore).sort((a, b) => Number(b[0]) - Number(a[0]));
        const dbStr = dbEntries.map(([d, c]) => `${d === '0' ? 'giorno evento' : `-${d}gg`}: ${c}`).join(', ');
        lines.push(`  Giorni prima: ${dbStr}`);
      }

      // Hourly peaks for this edition
      const hourly = {};
      for (const r of ed.rows) {
        if (!r.purchaseDate) continue;
        const h = r.purchaseDate.getHours();
        const hKey = `${String(h).padStart(2, '0')}:00`;
        hourly[hKey] = (hourly[hKey] || 0) + 1;
      }
      if (Object.keys(hourly).length > 0) {
        const topHours = Object.entries(hourly).sort((a, b) => b[1] - a[1]).slice(0, 5);
        lines.push(`  Picchi orari: ${topHours.map(([h, c]) => `${h}: ${c}`).join(', ')}`);
      }

      // Day of week for this edition
      const dow = {};
      for (const r of ed.rows) {
        if (!r.dayOfWeek) continue;
        const short = r.dayOfWeek.substring(0, 3);
        dow[short] = (dow[short] || 0) + 1;
      }
      if (Object.keys(dow).length > 0) {
        lines.push(`  Giorni settimana: ${Object.entries(dow).map(([d, c]) => `${d}: ${c}`).join(', ')}`);
      }
    }
    lines.push('');
  }

  // Brand edition trend comparison (growth/decline across editions)
  const brandEditions = {};
  for (const ed of editions) {
    if (!brandEditions[ed.brand]) brandEditions[ed.brand] = [];
    const attended = ed.rows.filter(r => r.attended).length;
    const conv = ed.rows.length > 0 ? ((attended / ed.rows.length) * 100).toFixed(1) : 0;
    brandEditions[ed.brand].push({
      edition: ed.edition,
      date: ed.eventDate ? new Date(ed.eventDate).toLocaleDateString('it') : 'n/a',
      regs: ed.rows.length,
      attended,
      conv,
    });
  }
  const brandsWithMultiple = Object.entries(brandEditions).filter(([, eds]) => eds.length > 1);
  if (brandsWithMultiple.length > 0) {
    lines.push('## CONFRONTO TRA EDIZIONI (trend crescita/calo per brand)');
    for (const [brand, eds] of brandsWithMultiple) {
      lines.push(`### ${brand}`);
      // Sort chronologically (oldest first)
      const sorted = [...eds].reverse();
      for (let i = 0; i < sorted.length; i++) {
        const e = sorted[i];
        let delta = '';
        if (i > 0) {
          const prev = sorted[i - 1];
          const diff = e.regs - prev.regs;
          const pct = prev.regs > 0 ? ((diff / prev.regs) * 100).toFixed(0) : 'n/a';
          delta = ` (${diff >= 0 ? '+' : ''}${diff} reg, ${diff >= 0 ? '+' : ''}${pct}% vs precedente)`;
        }
        lines.push(`- ${e.edition} (${e.date}): ${e.regs} reg, ${e.attended} pres, ${e.conv}% conv${delta}`);
      }
    }
    lines.push('');
  }

  // Hourly distribution per brand (top 5 hours per brand)
  const brandHourly = {};
  for (const r of data) {
    if (!r.brand || !r.purchaseDate) continue;
    if (!brandHourly[r.brand]) brandHourly[r.brand] = {};
    const h = `${String(r.purchaseDate.getHours()).padStart(2, '0')}:00`;
    brandHourly[r.brand][h] = (brandHourly[r.brand][h] || 0) + 1;
  }
  if (Object.keys(brandHourly).length > 0) {
    lines.push('## DISTRIBUZIONE ORARIA PER BRAND (top 5 ore)');
    for (const [brand, hours] of Object.entries(brandHourly).sort((a, b) => {
      const ta = Object.values(a[1]).reduce((s, v) => s + v, 0);
      const tb = Object.values(b[1]).reduce((s, v) => s + v, 0);
      return tb - ta;
    })) {
      const top = Object.entries(hours).sort((a, b) => b[1] - a[1]).slice(0, 5);
      lines.push(`- ${brand}: ${top.map(([h, c]) => `${h}: ${c}`).join(', ')}`);
    }
    lines.push('');
  }

  // Return rate per brand (users who came to 2+ editions of the same brand)
  const brandUserEditions = {};
  for (const r of data) {
    if (!r.brand || !r.editionLabel || !r.attended) continue;
    const userKey = r.email || r.fullName;
    if (!userKey) continue;
    if (!brandUserEditions[r.brand]) brandUserEditions[r.brand] = {};
    if (!brandUserEditions[r.brand][userKey]) brandUserEditions[r.brand][userKey] = new Set();
    brandUserEditions[r.brand][userKey].add(r.editionLabel);
  }
  if (Object.keys(brandUserEditions).length > 0) {
    lines.push('## TASSO DI RITORNO PER BRAND');
    for (const [brand, users] of Object.entries(brandUserEditions)) {
      const totalUsers = Object.keys(users).length;
      const returning = Object.values(users).filter(eds => eds.size > 1).length;
      const rate = totalUsers > 0 ? ((returning / totalUsers) * 100).toFixed(1) : 0;
      const avgEditions = totalUsers > 0
        ? (Object.values(users).reduce((s, eds) => s + eds.size, 0) / totalUsers).toFixed(1)
        : 0;
      lines.push(`- ${brand}: ${totalUsers} utenti, ${returning} tornanti (${rate}%), media ${avgEditions} edizioni/utente`);
    }
    lines.push('');
  }

  // Age demographics per brand
  const brandAges = {};
  const seenBrandAge = new Set();
  for (const r of data) {
    if (!r.brand || !r.birthDate || !(r.birthDate instanceof Date)) continue;
    const userKey = `${r.brand}|||${r.email || r.fullName}`;
    if (!userKey || seenBrandAge.has(userKey)) continue;
    seenBrandAge.add(userKey);
    const age = new Date().getFullYear() - r.birthDate.getFullYear();
    if (age <= 0 || age >= 100) continue;
    if (!brandAges[r.brand]) brandAges[r.brand] = [];
    brandAges[r.brand].push(age);
  }
  if (Object.keys(brandAges).length > 0) {
    lines.push('## ETÀ MEDIA PER BRAND');
    for (const [brand, ageList] of Object.entries(brandAges).sort((a, b) => b[1].length - a[1].length)) {
      const avg = (ageList.reduce((s, a) => s + a, 0) / ageList.length).toFixed(1);
      const min = Math.min(...ageList);
      const max = Math.max(...ageList);
      const brackets = { '18-21': 0, '22-25': 0, '26-30': 0, '31+': 0 };
      for (const a of ageList) {
        if (a <= 21) brackets['18-21']++;
        else if (a <= 25) brackets['22-25']++;
        else if (a <= 30) brackets['26-30']++;
        else brackets['31+']++;
      }
      const bStr = Object.entries(brackets).filter(([, c]) => c > 0).map(([r, c]) => `${r}: ${c}`).join(', ');
      lines.push(`- ${brand}: età media ${avg}, range ${min}-${max}, fasce: ${bStr} (su ${ageList.length} utenti)`);
    }
    lines.push('');
  }

  // User segments
  if (userStats && userStats.length > 0) {
    const segments = {};
    for (const u of userStats) {
      const seg = u.segment || 'unknown';
      segments[seg] = (segments[seg] || 0) + 1;
    }
    lines.push('## SEGMENTI UTENTI');
    lines.push(`Utenti unici totali: ${userStats.length}`);
    for (const [seg, count] of Object.entries(segments).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${seg}: ${count} utenti`);
    }
    lines.push('');

    // Top loyal users
    const topUsers = [...userStats].sort((a, b) => (b.totalParticipated || 0) - (a.totalParticipated || 0)).slice(0, 5);
    lines.push('## TOP 5 UTENTI PIU FEDELI');
    for (const u of topUsers) {
      lines.push(`- ${u.name}: ${u.totalParticipated} presenze su ${u.totalRegs} reg, ${u.eventCount} eventi diversi`);
    }
    lines.push('');
  }

  // Age distribution from birth dates
  const ages = [];
  const seen = new Set();
  for (const r of data) {
    if (!r.birthDate || !(r.birthDate instanceof Date)) continue;
    const key = r.email || r.fullName;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const age = new Date().getFullYear() - r.birthDate.getFullYear();
    if (age > 0 && age < 100) ages.push(age);
  }
  if (ages.length > 0) {
    const brackets = { '18-21': 0, '22-25': 0, '26-30': 0, '31-35': 0, '36-40': 0, '40+': 0 };
    for (const a of ages) {
      if (a <= 21) brackets['18-21']++;
      else if (a <= 25) brackets['22-25']++;
      else if (a <= 30) brackets['26-30']++;
      else if (a <= 35) brackets['31-35']++;
      else if (a <= 40) brackets['36-40']++;
      else brackets['40+']++;
    }
    lines.push('## DISTRIBUZIONE ETA');
    for (const [range, count] of Object.entries(brackets)) {
      if (count > 0) lines.push(`- ${range} anni: ${count} utenti (${((count / ages.length) * 100).toFixed(1)}%)`);
    }
    lines.push('');
  }

  // Correlation: days before registration vs no-show rate
  const daysBeforeNoShow = {};
  for (const r of data) {
    if (r.daysBefore === null || r.daysBefore === undefined) continue;
    const k = Math.min(r.daysBefore, 14);
    if (!daysBeforeNoShow[k]) daysBeforeNoShow[k] = { total: 0, attended: 0 };
    daysBeforeNoShow[k].total++;
    if (r.attended) daysBeforeNoShow[k].attended++;
  }
  if (Object.keys(daysBeforeNoShow).length > 0) {
    lines.push('## CORRELAZIONE: GIORNI PRIMA DELLA REGISTRAZIONE VS TASSO PRESENZA');
    lines.push('(Mostra se chi si registra prima viene di più o di meno)');
    for (const k of Object.keys(daysBeforeNoShow).map(Number).sort((a, b) => b - a)) {
      const d = daysBeforeNoShow[k];
      const conv = d.total > 0 ? ((d.attended / d.total) * 100).toFixed(1) : 0;
      const noShow = d.total > 0 ? (((d.total - d.attended) / d.total) * 100).toFixed(1) : 0;
      const label = k === 0 ? 'Giorno evento' : `-${k} giorni`;
      lines.push(`- ${label}: ${d.total} reg, ${d.attended} presenze, ${conv}% conversione, ${noShow}% no-show`);
    }
    lines.push('');
  }

  // Correlation: registration hour vs no-show rate
  const hourNoShow = {};
  for (const r of data) {
    if (!r.purchaseDate) continue;
    const h = `${String(r.purchaseDate.getHours()).padStart(2, '0')}:00`;
    if (!hourNoShow[h]) hourNoShow[h] = { total: 0, attended: 0 };
    hourNoShow[h].total++;
    if (r.attended) hourNoShow[h].attended++;
  }
  if (Object.keys(hourNoShow).length > 0) {
    lines.push('## CORRELAZIONE: ORA DI REGISTRAZIONE VS TASSO PRESENZA');
    lines.push('(Chi si registra alle 3 di notte viene davvero? E chi alle 18?)');
    for (const h of Object.keys(hourNoShow).sort()) {
      const d = hourNoShow[h];
      if (d.total < 3) continue; // skip ore con pochissimi dati
      const conv = d.total > 0 ? ((d.attended / d.total) * 100).toFixed(1) : 0;
      lines.push(`- ${h}: ${d.total} reg, ${conv}% conversione`);
    }
    lines.push('');
  }

  // Churn analysis: users who used to attend but stopped
  if (userStats && userStats.length > 0) {
    const churned = [];
    for (const u of userStats) {
      if (!u.events || u.totalParticipated < 2 || !u.lastReg) continue;
      const daysSinceLast = Math.floor((new Date() - u.lastReg) / (1000 * 60 * 60 * 24));
      if (daysSinceLast > 60) {
        churned.push({ name: u.name, participated: u.totalParticipated, daysSince: daysSinceLast, events: u.eventCount });
      }
    }
    if (churned.length > 0) {
      churned.sort((a, b) => b.participated - a.participated);
      lines.push('## ANALISI CHURN (utenti fedeli che non vengono più)');
      lines.push(`Utenti con 2+ presenze passate che non si registrano da 60+ giorni: ${churned.length}`);
      for (const u of churned.slice(0, 15)) {
        lines.push(`- ${u.name}: ${u.participated} presenze storiche, ${u.events} brand diversi, ultimo visto ${u.daysSince} giorni fa`);
      }
      lines.push('');
    }
  }

  // Cross-brand affinity: users who attend multiple brands
  const userBrands = {};
  for (const r of data) {
    if (!r.brand || !r.attended) continue;
    const userKey = r.email || r.fullName;
    if (!userKey) continue;
    if (!userBrands[userKey]) userBrands[userKey] = new Set();
    userBrands[userKey].add(r.brand);
  }
  const brandPairs = {};
  for (const brands of Object.values(userBrands)) {
    if (brands.size < 2) continue;
    const arr = [...brands].sort();
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const pair = `${arr[i]} + ${arr[j]}`;
        brandPairs[pair] = (brandPairs[pair] || 0) + 1;
      }
    }
  }
  if (Object.keys(brandPairs).length > 0) {
    lines.push('## AFFINITÀ CROSS-BRAND (utenti che partecipano a più brand)');
    lines.push('(Utile per cross-promozione: se chi va a X va anche a Y, promuovi Y al pubblico di X)');
    const multiBrandUsers = Object.values(userBrands).filter(b => b.size > 1).length;
    const totalAttenders = Object.keys(userBrands).length;
    lines.push(`Utenti multi-brand: ${multiBrandUsers} su ${totalAttenders} (${totalAttenders > 0 ? ((multiBrandUsers / totalAttenders) * 100).toFixed(1) : 0}%)`);
    const sortedPairs = Object.entries(brandPairs).sort((a, b) => b[1] - a[1]);
    for (const [pair, count] of sortedPairs.slice(0, 10)) {
      lines.push(`- ${pair}: ${count} utenti in comune`);
    }
    lines.push('');
  }

  // Event day of week vs conversion rate
  const eventDowConv = {};
  for (const ed of editions) {
    if (!ed.eventDate) continue;
    const eventDay = new Date(ed.eventDate);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const dow = dayNames[eventDay.getDay()];
    if (!eventDowConv[dow]) eventDowConv[dow] = { total: 0, attended: 0, events: 0 };
    eventDowConv[dow].events++;
    eventDowConv[dow].total += ed.rows.length;
    eventDowConv[dow].attended += ed.rows.filter(r => r.attended).length;
  }
  if (Object.keys(eventDowConv).length > 0) {
    lines.push('## GIORNO DELLA SETTIMANA DELL\'EVENTO VS CONVERSIONE');
    lines.push('(Gli eventi del sabato convertono meglio del venerdì?)');
    for (const [dow, d] of Object.entries(eventDowConv).sort((a, b) => b[1].total - a[1].total)) {
      const conv = d.total > 0 ? ((d.attended / d.total) * 100).toFixed(1) : 0;
      const avgRegs = d.events > 0 ? Math.round(d.total / d.events) : 0;
      lines.push(`- ${dow}: ${d.events} eventi, ${d.total} reg totali, media ${avgRegs} reg/evento, ${conv}% conversione`);
    }
    lines.push('');
  }

  // Social timing effectiveness: registration day of week relative to event day
  const regDowByEventDow = {};
  for (const r of data) {
    if (!r.purchaseDate || !r.eventDate || !r.dayOfWeek) continue;
    const eventDay = new Date(r.eventDate);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const eventDow = dayNames[eventDay.getDay()];
    const regDow = r.dayOfWeek.substring(0, 3);
    const key = `evento ${eventDow}`;
    if (!regDowByEventDow[key]) regDowByEventDow[key] = {};
    if (!regDowByEventDow[key][regDow]) regDowByEventDow[key][regDow] = 0;
    regDowByEventDow[key][regDow]++;
  }
  if (Object.keys(regDowByEventDow).length > 0) {
    lines.push('## EFFICACIA TEMPORALE: IN CHE GIORNO SI REGISTRANO PER EVENTI DI OGNI GIORNO');
    lines.push('(Se l\'evento è sabato, pubblicizzare lunedì o mercoledì porta più registrazioni?)');
    for (const [eventDow, regDays] of Object.entries(regDowByEventDow)) {
      const sorted = Object.entries(regDays).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [, c]) => s + c, 0);
      const detail = sorted.map(([d, c]) => `${d}: ${c} (${((c / total) * 100).toFixed(0)}%)`).join(', ');
      lines.push(`- ${eventDow}: ${detail}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Builds a text summary of the Live Tracker state for AI report generation.
 * Receives comparisonData from computeWhereAreWeNow().
 */
export function buildTrackerSummary(comparisonData) {
  if (!comparisonData) return 'Nessun dato tracker disponibile.';

  const {
    brand, edition, eventDate, currentDaysBefore, isEventPast,
    currentRegistrations, dataRegistrations, isOverridden,
    currentAttended, currentConversion,
    comparisons, avgAtSamePoint,
    regressionProjection, ensembleProjection,
    avgFinal, progressPercent, targetCumulative,
    snapshotHour,
  } = comparisonData;

  const lines = [];

  // Current edition overview
  lines.push('## EDIZIONE CORRENTE');
  lines.push(`Brand: ${brand}`);
  lines.push(`Edizione: ${edition}`);
  lines.push(`Data evento: ${eventDate ? eventDate.toLocaleDateString('it', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'n/a'}`);
  lines.push(`Stato: ${isEventPast ? 'Evento concluso' : `Mancano ${currentDaysBefore} giorni`}`);
  lines.push(`Snapshot ore: ${snapshotHour || 'n/a'}`);
  lines.push(`Registrazioni attuali: ${currentRegistrations}${isOverridden ? ` (dato live, da file: ${dataRegistrations})` : ''}`);
  if (isEventPast) {
    lines.push(`Presenze: ${currentAttended}`);
    lines.push(`Conversione: ${currentConversion}%`);
  }
  lines.push('');

  // Cumulative curve shape (key milestones)
  if (targetCumulative && Object.keys(targetCumulative).length > 0) {
    lines.push('## CURVA CUMULATIVA REGISTRAZIONI (edizione corrente)');
    const milestones = [30, 21, 14, 7, 5, 3, 2, 1, 0];
    for (const d of milestones) {
      if (targetCumulative[d] != null) {
        lines.push(`- A -${d} giorni: ${targetCumulative[d]} registrazioni`);
      }
    }
    lines.push('');
  }

  // Comparison with past editions
  if (comparisons.length > 0) {
    lines.push('## CONFRONTO CON EDIZIONI PRECEDENTI');
    lines.push(`Numero edizioni confrontate: ${comparisons.length}`);
    lines.push('');
    for (const c of comparisons) {
      const date = c.eventDate ? c.eventDate.toLocaleDateString('it') : 'n/a';
      const year = c.eventDate ? c.eventDate.getFullYear() : 'n/a';
      lines.push(`### ${c.editionLabel} (${date}, anno ${year})`);
      lines.push(`- Allo stesso punto (${isEventPast ? 'finale' : `-${currentDaysBefore}gg ${snapshotHour || ''}`}): ${c.atSamePointAdjusted ?? c.atSamePoint} registrazioni`);
      lines.push(`- Delta vs attuale: ${c.deltaPercent != null ? `${c.deltaPercent > 0 ? '+' : ''}${c.deltaPercent}%` : 'n/a'}`);
      lines.push(`- Registrazioni finali: ${c.totalFinal}`);
      lines.push(`- Presenze: ${c.totalAttended}, Conversione: ${c.finalConversion}%`);
      lines.push(`- Completamento a -${currentDaysBefore}gg: ${c.completionPercent}% del totale finale`);
      // Cumulative milestones for this edition
      if (c.cumulative) {
        const mils = [14, 7, 3, 1, 0].filter(d => c.cumulative[d] != null);
        if (mils.length > 0) {
          lines.push(`- Curva: ${mils.map(d => `-${d}gg: ${c.cumulative[d]}`).join(', ')}`);
        }
      }
    }
    lines.push('');
  }

  // Averages and projections
  lines.push('## MEDIE E PROIEZIONI');
  lines.push(`Media allo stesso punto: ${avgAtSamePoint}`);
  lines.push(`Media finale edizioni precedenti: ${avgFinal}`);
  lines.push(`Progresso vs media finale: ${progressPercent}%`);
  if (regressionProjection != null) {
    lines.push(`Proiezione (regressione lineare): ${regressionProjection}`);
  }
  if (ensembleProjection != null) {
    lines.push(`Proiezione (modello bilanciato): ${ensembleProjection}`);
  }
  lines.push('');

  // Year breakdown
  if (comparisons.length > 0) {
    const byYear = {};
    for (const c of comparisons) {
      if (!c.eventDate) continue;
      const year = c.eventDate.getFullYear();
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(c);
    }
    if (Object.keys(byYear).length > 1) {
      lines.push('## ANALISI PER ANNO');
      for (const [year, comps] of Object.entries(byYear).sort()) {
        const avgFinalYear = Math.round(comps.reduce((s, c) => s + c.totalFinal, 0) / comps.length);
        const avgSamePoint = Math.round(comps.reduce((s, c) => s + (c.atSamePointAdjusted ?? c.atSamePoint), 0) / comps.length);
        const avgConv = (comps.reduce((s, c) => s + c.finalConversion, 0) / comps.length).toFixed(1);
        lines.push(`- ${year}: ${comps.length} edizioni, media finale ${avgFinalYear}, media allo stesso punto ${avgSamePoint}, conversione media ${avgConv}%`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
