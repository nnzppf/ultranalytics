/**
 * Brand registry.
 * A brand is recognised from the event name via `keywords` (accent/case-insensitive,
 * tolerant to the "�" characters the ticketing export produces). The edition is NOT
 * configured here: it is derived from the event date (see csvProcessor).
 * Order matters: the first brand whose keyword matches wins, so keep the more
 * specific brands first (e.g. "GIOVEDI GELSI W/DOBLE SOUND" is Giovedì Gelsi).
 */
export const BRAND_REGISTRY = {
  "GIOVEDÌ GELSI": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["giovedi gelsi"],
  },
  "JE SUIS MIMÌ": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["je suis mimi", "saltacoda"],
  },
  "-100 ALLA MATURITA": {
    category: "young",
    genres: ["student"],
    keywords: ["100 alla maturita"],
  },
  "LA MATURANDA": {
    category: "young",
    genres: ["student"],
    keywords: ["la maturanda"],
  },
  "EUPHORIA": {
    category: "young",
    genres: ["student"],
    keywords: ["euphoria"],
  },
  "ROOKIE": {
    category: "young",
    genres: ["live", "student"],
    keywords: ["rookie"],
  },
  "STUDIOS PRESENTA: GLOCKY": {
    category: "young",
    genres: ["live", "student"],
    keywords: ["glocky"],
  },
  "STUDIOS CLUB OPENING PARTY": {
    category: "standard",
    genres: ["elettronica"],
    keywords: ["studios club opening party"],
  },
  "ATIPICO": {
    category: "standard",
    genres: ["elettronica"],
    keywords: ["atipico"],
  },
  "ULTRAVIVID": {
    category: "standard",
    genres: ["commerciale", "elettronica"],
    keywords: ["ultravivid"],
  },
  "PURPLE RAIN": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["purple rain"],
  },
  "POLPETTE": {
    category: "standard",
    genres: ["elettronica", "aperitivo"],
    keywords: ["polpette"],
  },
  "2000 MANIA": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["2000 mania"],
  },
  "JESUS LOVES DISCO": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["jesus loves disco"],
  },
  "AMARCORD": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["amarcord"],
  },
  "VISION": {
    category: "standard",
    genres: ["elettronica"],
    keywords: ["vision"],
  },
  "PLUMA": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["pluma"],
  },
  "BESAME": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["besame"],
  },
  "SUNDAYS X GG": {
    category: "standard",
    genres: ["commerciale", "aperitivo"],
    keywords: ["sundays"],
  },
  "DOBLE SOUND": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["doble sound"],
  },
  "EL PARTY RICO": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["party rico"],
  },
  "HALFTIME": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["halftime"],
  },
  "SPAZIODETOX": {
    category: "standard",
    genres: ["elettronica"],
    keywords: ["spaziodetox"],
  },
  "FOREVER": {
    category: "standard",
    genres: ["commerciale"],
    keywords: ["forever"],
  },
};

/**
 * Event dates for events whose name carries no date, as "YYYY-MM-DD".
 * Keys are matched like brand keywords. Past events don't need an entry
 * (their date is inferred from the door scans); upcoming ones do.
 */
export const EVENT_DATE_OVERRIDES = {
  "rookie w/nabi": "2026-10-10",
  "too late - opening party w/germano ventura": "2026-10-09",
};

export const GENRE_LABELS = {
  commerciale: { label: "Commerciale", color: "#8b5cf6", icon: "Music" },
  elettronica: { label: "Elettronica", color: "#06b6d4", icon: "Zap" },
  live: { label: "Live", color: "#f59e0b", icon: "Mic" },
  student: { label: "Student", color: "#10b981", icon: "GraduationCap" },
  aperitivo: { label: "Aperitivo", color: "#ec4899", icon: "Wine" },
};

export const CATEGORY_LABELS = {
  standard: { label: "Standard", color: "#8b5cf6" },
  young: { label: "Young", color: "#10b981" },
  senior: { label: "Senior", color: "#f59e0b" },
};

export const EXCLUDED_EVENTS = [
  "evento registrazione gratuita",
  "evento test",
  "besame summer tour",
  "deco 90",
];

export const SENIOR_EVENTS = [
  "mamma mia",
  "mammamia",
  "io&te",
  "red carpet exclusive party",
  "il natale ai gelsi",
  "il capodanno gelsi",
  "pompon cartoon carnival",
];
