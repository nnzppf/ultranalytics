import { BRAND_REGISTRY, EXCLUDED_EVENTS, SENIOR_EVENTS } from '../config/eventConfig';
import { MESI_IT } from '../config/constants';

const ITALIAN_DAYS_RE = /^(?:luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)['']?\s*/i;
const ITALIAN_MONTH_RE = '(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)';

/**
 * Strip date prefixes/suffixes from event names.
 * "SABATO 13 DICEMBRE - ULTRAVIVID - TRAP NIGHT" → "ULTRAVIVID - TRAP NIGHT"
 * "01.11.25 BESAME" → "BESAME"
 */
export function stripDatePrefix(rawName) {
  let name = rawName.trim();

  // 1. Strip leading day-of-week
  name = name.replace(ITALIAN_DAYS_RE, '');

  // 2. Strip DD.MM.YY prefix
  name = name.replace(/^\d{1,2}\.\d{1,2}\.\d{2,4}\s+/, '');

  // 3. Strip DD.MM prefix (no year), followed by space or dash
  name = name.replace(/^\d{1,2}\.\d{1,2}\s*[-–—]\s*/, '');
  name = name.replace(/^\d{1,2}\.\d{1,2}\s+/, '');

  // 4. Strip "DD Mese YYYY - " or "DD MESE - "
  const monthDashRe = new RegExp(`^\\d{1,2}\\s+${ITALIAN_MONTH_RE}(?:\\s+\\d{4})?\\s*[-–—]\\s*`, 'i');
  name = name.replace(monthDashRe, '');

  // 5. Handle suffix: "AMARCORD - VENERDÌ 27 FEBBRAIO"
  const suffixRe = new RegExp(
    `\\s*[-–—]\\s*(?:${ITALIAN_DAYS_RE.source})?\\s*\\d{1,2}\\s+${ITALIAN_MONTH_RE}(?:\\s+\\d{4})?\\s*$`,
    'i'
  );
  name = name.replace(suffixRe, '');

  // 6. Clean up remaining leading dashes/spaces
  name = name.replace(/^\s*[-–—]\s*/, '').trim();

  return name;
}

/**
 * Try to extract the calendar date of the event from the raw event name.
 */
export function extractEventDate(rawName) {
  if (!rawName) return null;
  const s = rawName.trim();

  // DD.MM.YY or DD.MM.YYYY
  let m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    return new Date(year, parseInt(m[2]) - 1, parseInt(m[1]));
  }

  // DD MeseItaliano YYYY
  m = s.match(new RegExp(`(\\d{1,2})\\s+(${ITALIAN_MONTH_RE})\\s+(\\d{4})`, 'i'));
  if (m) {
    const month = MESI_IT[m[2].toLowerCase()];
    if (month !== undefined) return new Date(parseInt(m[3]), month, parseInt(m[1]));
  }

  // DD MESE (no year) - assume season 2025/2026
  m = s.match(new RegExp(`(\\d{1,2})\\s+(${ITALIAN_MONTH_RE})`, 'i'));
  if (m) {
    const month = MESI_IT[m[2].toLowerCase()];
    if (month !== undefined) {
      const year = month >= 8 ? 2025 : 2026;
      return new Date(year, month, parseInt(m[1]));
    }
  }

  // DD.MM (no year)
  m = s.match(/(\d{1,2})\.(\d{1,2})(?!\.\d)/);
  if (m) {
    const month = parseInt(m[2]) - 1;
    const year = month >= 8 ? 2025 : 2026;
    return new Date(year, month, parseInt(m[1]));
  }

  return null;
}

/**
 * Match a raw event name to a brand in BRAND_REGISTRY.
 * Returns { brand, editionLabel, category, genres } or null if excluded/senior.
 *
 * @param rawEventName - the raw event name from the file
 * @param customConfig - optional custom config from Firebase with renames, aliases, exclusions
 */
export function matchBrand(rawEventName, customConfig) {
  const lower = rawEventName.toLowerCase().trim();

  // Check exclusions (static + custom)
  if (EXCLUDED_EVENTS.some(ex => lower.includes(ex))) return null;
  if (customConfig?.excludedBrands?.some(ex => lower.includes(ex.toLowerCase()))) return null;

  // Check senior (skip for now)
  if (SENIOR_EVENTS.some(s => lower.includes(s))) {
    return { brand: null, editionLabel: null, category: 'senior', genres: [] };
  }

  // Try matching against custom aliases first (from merge)
  if (customConfig?.brands) {
    for (const [brandName, cfg] of Object.entries(customConfig.brands)) {
      if (cfg.aliases) {
        for (const alias of cfg.aliases) {
          if (lower.includes(alias.toLowerCase())) {
            return {
              brand: cfg.displayName || brandName,
              editionLabel: 'unknown',
              category: cfg.category || 'standard',
              genres: cfg.genres || [],
            };
          }
        }
      }
    }
  }

  // Try matching against all brands in BRAND_REGISTRY
  for (const [brandName, config] of Object.entries(BRAND_REGISTRY)) {
    for (const mp of config.matchPatterns) {
      for (const pattern of mp.patterns) {
        if (lower.includes(pattern.toLowerCase())) {
          // Apply custom config overrides if available
          const custom = customConfig?.brands?.[brandName];
          const finalBrand = customConfig?.renames?.[brandName] || custom?.displayName || brandName;
          return {
            brand: finalBrand,
            editionLabel: mp.edition,
            category: custom?.category || config.category,
            genres: custom?.genres?.length ? custom.genres : config.genres,
          };
        }
      }
    }
  }

  // Fallback: try matching cleaned name against brand names
  const cleaned = stripDatePrefix(rawEventName).toLowerCase();
  for (const [brandName, config] of Object.entries(BRAND_REGISTRY)) {
    if (cleaned.includes(brandName.toLowerCase()) || brandName.toLowerCase().includes(cleaned)) {
      const custom = customConfig?.brands?.[brandName];
      const finalBrand = customConfig?.renames?.[brandName] || custom?.displayName || brandName;
      return {
        brand: finalBrand,
        editionLabel: 'unknown',
        category: custom?.category || config.category,
        genres: custom?.genres?.length ? custom.genres : config.genres,
      };
    }
  }

  // Unmatched - use cleaned name as brand
  const fallbackBrand = stripDatePrefix(rawEventName);
  // Check if this fallback brand should be renamed
  const renamedBrand = customConfig?.renames?.[fallbackBrand] || fallbackBrand;
  const fallbackCustom = customConfig?.brands?.[fallbackBrand] || customConfig?.brands?.[renamedBrand];
  return {
    brand: renamedBrand,
    editionLabel: 'single',
    category: fallbackCustom?.category || 'unknown',
    genres: fallbackCustom?.genres || [],
  };
}
