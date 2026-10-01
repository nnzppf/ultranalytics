import { BRAND_REGISTRY, EXCLUDED_EVENTS, SENIOR_EVENTS, EVENT_DATE_OVERRIDES } from '../config/eventConfig';
import { MESI_IT } from '../config/constants';

const BAD = '�'; // what the ticketing export leaves in place of accents, apostrophes and dashes
const MONTH_RE = '(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)';
const DAY_RE = `(?:luned[iì${BAD}]|marted[iì${BAD}]|mercoled[iì${BAD}]|gioved[iì${BAD}]|venerd[iì${BAD}]|sabato|domenica)`;

/**
 * Lowercase, strip accents and apostrophes, unify dashes. Keeps "�" so that
 * fuzzyIncludes can treat it as a wildcard.
 */
/**
 * Event name reduced to letters and digits, accented letters dropped whole, so
 * "VENERDÌ" and the export's "VENERD�" give the same key. Identifies a night in
 * the catalog (dates, notes, series) across exports and brand renames.
 */
export function nightNameKey(raw) {
  return String(raw || '').toLowerCase().normalize('NFD').replace(/[a-z][\u0300-\u036f]+/g, '').replace(/[^a-z0-9]/g, '');
}

export function normalizeName(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’‘`]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const fuzzyCache = new Map();

/**
 * Substring match of a normalized pattern inside a normalized name, where a "�"
 * in the name may stand for a vowel/dash or for a dropped apostrophe.
 * "giovedi gelsi" matches "gioved� gelsi", "deco 90" matches "dec� 90".
 */
export function fuzzyIncludes(normText, pattern) {
  const p = normalizeName(pattern);
  if (!p) return false;
  if (normText.includes(p)) return true;
  if (!normText.includes(BAD)) return false;
  let re = fuzzyCache.get(p);
  if (!re) {
    const parts = [...p].map(ch => {
      if (/[aeiou-]/.test(ch)) return `[${ch === '-' ? '\\-' : ch}${BAD}]`;
      return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    re = new RegExp(parts.join(`${BAD}?`));
    fuzzyCache.set(p, re);
  }
  return re.test(normText);
}

/**
 * Best-effort repair of "�" for display: "GIOVED�" → "GIOVEDÌ", "L�APERITIVO" → "L'APERITIVO".
 */
export function repairText(raw) {
  if (!raw || !raw.includes(BAD)) return raw;
  return raw
    .replace(new RegExp(`(luned|marted|mercoled|gioved|venerd)${BAD}`, 'gi'),
      (_, d) => d + (d === d.toUpperCase() ? 'Ì' : 'ì'))
    .replace(new RegExp(`(maturit)${BAD}`, 'gi'), (_, w) => w + (w === w.toUpperCase() ? 'À' : 'à'))
    .replace(new RegExp(`(dec)${BAD}`, 'gi'), (_, w) => w + (w === w.toUpperCase() ? 'Ò' : 'ò'))
    .replace(new RegExp(`([A-Za-z])${BAD}([A-Za-z])`, 'g'), "$1'$2")
    .replace(new RegExp(BAD, 'g'), '–');
}

/**
 * Strip dates, weekdays and guest suffixes from an event name, to use it as a brand.
 * "SABATO 13 DICEMBRE - ULTRAVIVID - TRAP NIGHT" → "ULTRAVIVID - TRAP NIGHT"
 * "TOO LATE - OPENING PARTY w/GERMANO VENTURA" → "TOO LATE - OPENING PARTY"
 */
export function stripDatePrefix(rawName) {
  let name = repairText(String(rawName || '')).trim();
  const dash = '\\s*[-–—]?\\s*';

  name = name.replace(new RegExp(`^${DAY_RE}'?\\s*`, 'i'), '');
  name = name.replace(new RegExp(`^\\d{1,2}\\.\\d{1,2}(?:\\.\\d{2,4})?${dash}`), '');
  name = name.replace(new RegExp(`^\\d{1,2}\\s+${MONTH_RE}(?:\\s+\\d{4})?${dash}`, 'i'), '');
  name = name.replace(new RegExp(`^${DAY_RE}'?\\s*`, 'i'), '');
  name = name.replace(new RegExp(`\\s*[-–—]?\\s*(?:${DAY_RE}'?\\s*)?\\d{1,2}\\s+${MONTH_RE}(?:\\s+\\d{4})?\\s*$`, 'i'), '');
  name = name.replace(/\s+w\/.*$/i, '');
  name = name.replace(/^\s*[-–—]\s*/, '').replace(/\s*[-–—]\s*$/, '').trim();

  return name || String(rawName || '').trim();
}

/**
 * Pick the year for a day/month without year: the first occurrence that is not
 * well before the registrations (refDate = typical registration date).
 */
function resolveYear(day, month, refDate) {
  if (!refDate) return new Date(month >= 8 ? 2025 : 2026, month, day);
  const floor = refDate.getTime() - 30 * 86400000;
  for (const y of [refDate.getFullYear() - 1, refDate.getFullYear(), refDate.getFullYear() + 1]) {
    const d = new Date(y, month, day);
    if (d.getTime() >= floor) return d;
  }
  return new Date(refDate.getFullYear() + 1, month, day);
}

function validDayMonth(day, month) {
  return day >= 1 && day <= 31 && month >= 0 && month <= 11;
}

/**
 * Extract the calendar date of the event from its name.
 * @param rawName - event name as exported
 * @param refDate - optional typical registration date, used when the name has no year
 */
export function extractEventDate(rawName, refDate) {
  if (!rawName) return null;
  const s = normalizeName(rawName);

  for (const [pattern, iso] of Object.entries(EVENT_DATE_OVERRIDES)) {
    if (fuzzyIncludes(s, pattern)) {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
  }

  // DD.MM.YY or DD.MM.YYYY
  let m = s.match(/(?:^|\D)(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?!\d)/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    const day = parseInt(m[1]), month = parseInt(m[2]) - 1;
    if (validDayMonth(day, month)) return new Date(year, month, day);
  }

  // DD Mese YYYY
  m = s.match(new RegExp(`(?:^|\\D)(\\d{1,2})\\s+(${MONTH_RE})\\s+(\\d{4})`));
  if (m) return new Date(parseInt(m[3]), MESI_IT[m[2]], parseInt(m[1]));

  // DD Mese (no year)
  m = s.match(new RegExp(`(?:^|\\D)(\\d{1,2})\\s+(${MONTH_RE})`));
  if (m) return resolveYear(parseInt(m[1]), MESI_IT[m[2]], refDate);

  // DD.MM (no year)
  m = s.match(/(?:^|\D)(\d{1,2})\.(\d{1,2})(?![\d.])/);
  if (m) {
    const day = parseInt(m[1]), month = parseInt(m[2]) - 1;
    if (validDayMonth(day, month)) return resolveYear(day, month, refDate);
  }

  return null;
}

/** Edition label from the event date: "DD.MM.YY". */
export function editionLabelFromDate(date) {
  if (!date) return 'senza data';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${String(date.getFullYear()).slice(-2)}`;
}

/**
 * Match a raw event name to a brand.
 * Returns { brand, category, genres }, { brand: null, category: 'senior' } for senior
 * events, or null if the event is excluded. The edition is set by the caller.
 *
 * @param rawEventName - the raw event name from the file
 * @param customConfig - optional custom config from Firebase with renames, aliases, exclusions
 */
export function matchBrand(rawEventName, customConfig) {
  const norm = normalizeName(rawEventName);

  // Check exclusions (static + custom)
  if (EXCLUDED_EVENTS.some(ex => fuzzyIncludes(norm, ex))) return null;
  if (customConfig?.excludedBrands?.some(ex => fuzzyIncludes(norm, ex))) return null;

  // Check senior (skip for now)
  if (SENIOR_EVENTS.some(s => fuzzyIncludes(norm, s))) {
    return { brand: null, category: 'senior', genres: [] };
  }

  // Try matching against custom aliases first (from merge)
  if (customConfig?.brands) {
    for (const [brandName, cfg] of Object.entries(customConfig.brands)) {
      if (cfg.aliases?.some(alias => fuzzyIncludes(norm, alias))) {
        return {
          brand: cfg.displayName || brandName,
          category: cfg.category || 'standard',
          genres: cfg.genres || [],
        };
      }
    }
  }

  // Try matching against the brand keywords
  for (const [brandName, config] of Object.entries(BRAND_REGISTRY)) {
    if (config.keywords.some(k => fuzzyIncludes(norm, k))) {
      const custom = customConfig?.brands?.[brandName];
      return {
        brand: customConfig?.renames?.[brandName] || custom?.displayName || brandName,
        category: custom?.category || config.category,
        genres: custom?.genres?.length ? custom.genres : config.genres,
      };
    }
  }

  // Unmatched - use cleaned name as brand
  const fallbackBrand = stripDatePrefix(rawEventName);
  const renamedBrand = customConfig?.renames?.[fallbackBrand] || fallbackBrand;
  const fallbackCustom = customConfig?.brands?.[fallbackBrand] || customConfig?.brands?.[renamedBrand];
  return {
    brand: renamedBrand,
    category: fallbackCustom?.category || 'unknown',
    genres: fallbackCustom?.genres || [],
  };
}
