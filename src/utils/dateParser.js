import { MESI_IT } from '../config/constants';

/**
 * Parse "DD/MM/YYYY HH:MM" or "DD/MM/YYYY HH:MM:SS" format (biglietti CSV)
 */
export function parseDateTime(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();
  // DD/MM/YYYY HH:MM or DD/MM/YYYY HH:MM:SS
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    return new Date(
      parseInt(m[3]),
      parseInt(m[2]) - 1,
      parseInt(m[1]),
      parseInt(m[4]),
      parseInt(m[5]),
      m[6] ? parseInt(m[6]) : 0
    );
  }
  return null;
}

/**
 * Parse Italian date formats: "08 Dic 2025", "08/12/2025", with optional time
 */
export function parseItalianDate(raw) {
  if (!raw) return null;
  const s = raw.toString().trim();

  // Try "DD Mese YYYY" with optional time
  const m1 = s.match(/^(\d{1,2})\s+([A-Za-zÀ-ú]+)\s+(\d{4})(?:\s+(\d{1,2})[.:](\d{2}))?/);
  if (m1) {
    const month = MESI_IT[m1[2].toLowerCase().substring(0, 3)];
    if (month !== undefined) {
      return new Date(
        parseInt(m1[3]),
        month,
        parseInt(m1[1]),
        m1[4] ? parseInt(m1[4]) : 0,
        m1[5] ? parseInt(m1[5]) : 0
      );
    }
  }

  // Try "DD/MM/YYYY" with optional time
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})[.:](\d{2}))?/);
  if (m2) {
    return new Date(
      parseInt(m2[3]),
      parseInt(m2[2]) - 1,
      parseInt(m2[1]),
      m2[4] ? parseInt(m2[4]) : 0,
      m2[5] ? parseInt(m2[5]) : 0
    );
  }

  return null;
}

/**
 * Check if a date_scansione value represents "not attended" (sentinel value)
 */
export function isSentinelDate(str) {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim();
  return s === '' || s.startsWith('01/01/1970') || s === '0000-00-00 00:00:00';
}
