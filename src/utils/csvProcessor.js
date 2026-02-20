import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parseDateTime, parseItalianDate, isSentinelDate } from './dateParser';
import { matchBrand, extractEventDate } from './eventNameCleaner';
import { DAYS_JS, getFascia } from '../config/constants';

/**
 * Parse a birth date string. Returns Date or null.
 * Handles DD/MM/YYYY and YYYY-MM-DD. Returns null for sentinel dates (1970).
 */
function parseBirthDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s.startsWith('01/01/1970') || s === '1970-01-01') return null;

  // DD/MM/YYYY
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) return d;
    return null;
  }

  // YYYY-MM-DD (Getfy format)
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) return d;
    return null;
  }

  return null;
}

/**
 * Parse a file (CSV, TSV, XLSX) into rows.
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const name = file.name.toLowerCase();

    if (name.endsWith('.csv') || name.endsWith('.tsv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      });
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        resolve(rows);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error(`Formato file non supportato: ${file.name}`));
    }
  });
}

/**
 * Find a column in row keys (case-insensitive partial match).
 */
function findCol(keys, candidates) {
  const lowerKeys = keys.map(k => k.toLowerCase());
  for (const c of candidates) {
    const idx = lowerKeys.findIndex(k => k.includes(c));
    if (idx >= 0) return keys[idx];
  }
  return null;
}

/**
 * Detect if the data looks like our biglietti format.
 */
function isBigliettiFormat(keys) {
  const lower = keys.map(k => k.toLowerCase());
  return lower.some(k => k.includes('data_acquisto') || k.includes('acquisto_biglietto')) &&
         lower.some(k => k.includes('data_scansione') || k.includes('scansione')) &&
         lower.some(k => k.includes('evento'));
}

/**
 * Process rows from biglietti CSV format into enriched records.
 */
function processBigliettiRows(rows, customConfig) {
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
  const dateCol = findCol(keys, ['data_acquisto_biglietto', 'data_acquisto']);
  const scanCol = findCol(keys, ['data_scansione', 'scansione']);
  const nameCol = findCol(keys, ['name', 'nome']);
  const surnameCol = findCol(keys, ['surname', 'cognome']);
  const eventCol = findCol(keys, ['evento', 'event']);
  const locationCol = findCol(keys, ['location', 'luogo', 'sede']);
  const promoterCol = findCol(keys, ['promoter', 'pr']);
  const emailCol = findCol(keys, ['email', 'e-mail']);
  const phoneCol = findCol(keys, ['cellulare', 'telefono', 'phone', 'contatto']);
  const genderCol = findCol(keys, ['sesso', 'gender']);
  const birthCol = findCol(keys, ['data_nascita', 'nascita']);
  const codeCol = findCol(keys, ['codice', 'code']);

  const records = [];

  for (const row of rows) {
    const rawEventName = (row[eventCol] || '').trim();
    if (!rawEventName) continue;

    // Match brand
    const brandMatch = matchBrand(rawEventName, customConfig);
    if (!brandMatch) continue; // excluded
    if (brandMatch.category === 'senior') continue; // skip senior for now

    // Parse dates
    const purchaseDate = parseDateTime(row[dateCol]);
    if (!purchaseDate) continue;

    const rawScan = (row[scanCol] || '').trim();
    const attended = !isSentinelDate(rawScan);
    const scanDate = attended ? parseDateTime(rawScan) : null;

    // Extract event date from event name
    const eventDate = extractEventDate(rawEventName);

    // Calculate days before event
    let daysBefore = null;
    if (eventDate && purchaseDate) {
      daysBefore = Math.max(0, Math.floor((eventDate - purchaseDate) / 86400000));
    }

    const name = (row[nameCol] || '').trim();
    const surname = (row[surnameCol] || '').trim();

    records.push({
      rawEventName,
      brand: brandMatch.brand,
      editionLabel: brandMatch.editionLabel,
      category: brandMatch.category,
      genres: brandMatch.genres,
      purchaseDate,
      scanDate,
      attended,
      eventDate,
      daysBefore,
      name,
      surname,
      fullName: `${name} ${surname}`.trim(),
      email: (row[emailCol] || '').trim().toLowerCase(),
      phone: (row[phoneCol] || '').trim(),
      gender: (row[genderCol] || '').trim().toUpperCase() || null,
      birthDate: parseBirthDate(row[birthCol]),
      location: (row[locationCol] || '').trim(),
      promoter: (row[promoterCol] || '').trim() || null,
      code: (row[codeCol] || '').trim(),
      hour: purchaseDate.getHours(),
      dayOfWeek: DAYS_JS[purchaseDate.getDay()],
      fascia: getFascia(purchaseDate.getHours()),
    });
  }

  return records;
}

/**
 * Process rows from a generic/legacy CSV format (like the old app expected).
 */
function processGenericRows(rows, eventName, customConfig) {
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
  const dateCol = findCol(keys, ['data', 'date', 'data_acquisto']) || keys[0];
  const timeCol = findCol(keys, ['ora', 'time', 'orario']) || keys[1];
  const nameCol = findCol(keys, ['nome', 'name', 'client']) || keys[2];
  const dowCol = findCol(keys, ['giorno', 'settimana', 'day']);
  const fasciaCol = findCol(keys, ['fascia', 'orari']);
  const partCol = findCol(keys, ['partecipat', 'ha part', 'attended']);

  const records = [];

  for (const row of rows) {
    let dateStr = (row[dateCol] || '').toString().trim();
    if (timeCol && row[timeCol]) dateStr += ' ' + row[timeCol].toString().trim();

    const purchaseDate = parseItalianDate(dateStr) || parseDateTime(dateStr);
    if (!purchaseDate) continue;

    const rawPart = (row[partCol] || '').toString().toLowerCase().trim();
    const attended = ['s', 'si', 'sì', '1', 'true', 'yes'].includes(rawPart);

    const fullName = (row[nameCol] || '').trim();
    const brandMatch = matchBrand(eventName, customConfig);

    records.push({
      rawEventName: eventName,
      brand: brandMatch?.brand || eventName,
      editionLabel: brandMatch?.editionLabel || 'single',
      category: brandMatch?.category || 'unknown',
      genres: brandMatch?.genres || [],
      purchaseDate,
      scanDate: null,
      attended,
      eventDate: null,
      daysBefore: null,
      name: fullName,
      surname: '',
      fullName,
      email: '',
      phone: '',
      gender: null,
      birthDate: null,
      location: '',
      promoter: null,
      code: '',
      hour: purchaseDate.getHours(),
      dayOfWeek: row[dowCol] || DAYS_JS[purchaseDate.getDay()],
      fascia: row[fasciaCol] || getFascia(purchaseDate.getHours()),
    });
  }

  return records;
}

/**
 * Detect if the data looks like our utenti format (user registry).
 */
export function isUtentiFormat(keys) {
  const lower = keys.map(k => k.toLowerCase());
  return lower.some(k => k.includes('data_registrazione')) &&
         lower.some(k => k.includes('data_nascita')) &&
         !lower.some(k => k.includes('evento'));
}

/**
 * Process rows from utenti.csv into user records for the birthday calendar.
 */
export function processUtentiRows(rows) {
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
  const nameCol = findCol(keys, ['name', 'nome']);
  const surnameCol = findCol(keys, ['surname', 'cognome']);
  const emailCol = findCol(keys, ['email', 'e-mail']);
  const phoneCol = findCol(keys, ['cellulare', 'telefono', 'phone']);
  const genderCol = findCol(keys, ['sesso', 'gender']);
  const birthCol = findCol(keys, ['data_nascita', 'nascita']);
  const regDateCol = findCol(keys, ['data_registrazione', 'registrazione']);

  const users = [];

  for (const row of rows) {
    const name = (row[nameCol] || '').trim();
    const surname = (row[surnameCol] || '').trim();
    const fullName = `${name} ${surname}`.trim();
    if (!fullName) continue;

    const birthDate = parseBirthDate(row[birthCol]);
    const email = (row[emailCol] || '').trim().toLowerCase();
    const phone = (row[phoneCol] || '').trim();
    const gender = (row[genderCol] || '').trim().toUpperCase() || null;
    const regDate = parseDateTime(row[regDateCol]);

    users.push({
      name,
      surname,
      fullName,
      email,
      phone,
      gender,
      birthDate,
      registrationDate: regDate,
    });
  }

  return users;
}

/**
 * Main entry: process an array of {file, eventName} into enriched records.
 */
export async function processFiles(fileList) {
  const allRecords = [];

  for (const { file, eventName } of fileList) {
    const rows = await parseFile(file);
    const keys = rows.length > 0 ? Object.keys(rows[0]) : [];

    if (isBigliettiFormat(keys)) {
      allRecords.push(...processBigliettiRows(rows));
    } else {
      allRecords.push(...processGenericRows(rows, eventName));
    }
  }

  return allRecords;
}

/**
 * Process raw rows (already parsed) - for when files are already loaded.
 */
export function processRawRows(rows, eventName, customConfig) {
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];

  if (isBigliettiFormat(keys)) {
    return processBigliettiRows(rows, customConfig);
  }
  return processGenericRows(rows, eventName, customConfig);
}
