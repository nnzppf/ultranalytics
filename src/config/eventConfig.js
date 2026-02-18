export const BRAND_REGISTRY = {
  "BESAME": {
    category: "standard",
    genres: ["commerciale"],
    matchPatterns: [
      { edition: "01.11.25", patterns: ["01.11.25 besame"] },
      { edition: "03.01.26", patterns: ["sabato 3 gennaio - besame"] },
    ]
  },
  "STUDIOS CLUB OPENING PARTY": {
    category: "standard",
    genres: ["elettronica"],
    matchPatterns: [
      { edition: "04.10.25", patterns: ["04.10.25 studios club opening party"] },
    ]
  },
  "PLUMA": {
    category: "standard",
    genres: ["commerciale"],
    matchPatterns: [
      { edition: "06.12.25", patterns: ["06.12 pluma"] },
    ]
  },
  "ULTRAVIVID": {
    category: "standard",
    genres: ["commerciale", "elettronica"],
    matchPatterns: [
      { edition: "15.11.25", patterns: ["15.11.25 ultravivid"] },
      { edition: "13.12.25", patterns: ["sabato 13 dicembre - ultravivid"] },
      { edition: "31.01.26", patterns: ["31 gennaio - ultravivid"] },
    ]
  },
  "ATIPICO": {
    category: "standard",
    genres: ["elettronica"],
    matchPatterns: [
      { edition: "18.10.25", patterns: ["18.10.25 too late opening party - atipico"] },
      { edition: "22.11.25", patterns: ["22.11.25 atipico"] },
      { edition: "17.01.26", patterns: ["17 gennaio - atipico"] },
      { edition: "21.02.26", patterns: ["21 febbraio - atipico"] },
    ]
  },
  "PURPLE RAIN": {
    category: "standard",
    genres: ["commerciale"],
    matchPatterns: [
      { edition: "20.12.25", patterns: ["20.12.25 purple rain"] },
      { edition: "14.02.26", patterns: ["sabato 14 febbraio - purple rain"] },
    ]
  },
  "POLPETTE": {
    category: "standard",
    genres: ["elettronica", "aperitivo"],
    matchPatterns: [
      { edition: "23.11.25", patterns: ["23.11.25 polpette 7th bday"] },
      { edition: "24.12.25", patterns: ["24 dicembre - polpette classic presenta: vigilia"] },
      { edition: "15.02.26", patterns: ["15 febbraio - love is everywhere by polpette"] },
    ]
  },
  "2000 MANIA": {
    category: "standard",
    genres: ["commerciale"],
    matchPatterns: [
      { edition: "29.11.25", patterns: ["29.11 2000 mania"] },
      { edition: "26.12.25", patterns: ["26.12 - 2000 mania", "26 dicembre - doble sound"] },
      { edition: "24.01.26", patterns: ["24 gennaio 2026 - 2000 mania"] },
    ]
  },
  "SALTACODA": {
    category: "standard",
    genres: ["commerciale"],
    matchPatterns: [
      { edition: "31.12.25", patterns: ["31.12 saltacoda"] },
    ]
  },
  "AMARCORD": {
    category: "standard",
    genres: ["commerciale"],
    matchPatterns: [
      { edition: "12.12.25", patterns: ["12 dicembre - amarcord"] },
      { edition: "27.02.26", patterns: ["amarcord - venerd"] },
    ]
  },
  "VISION": {
    category: "standard",
    genres: ["elettronica"],
    matchPatterns: [
      { edition: "06.12.25", patterns: ["sabato 6 dicembre - vision"] },
      { edition: "07.02.26", patterns: ["sabato 7 febbraio - vision"] },
    ]
  },
  "DOBLE SOUND": {
    category: "standard",
    genres: ["commerciale"],
    matchPatterns: [
      { edition: "26.12.25", patterns: ["26 dicembre - doble sound"] },
    ]
  },
  "SUNDAYS X GG": {
    category: "standard",
    genres: ["commerciale", "aperitivo"],
    matchPatterns: [
      { edition: "07.12.25", patterns: ["domenica 7 dicembre - sundays"] },
    ]
  },
  "ROOKIE": {
    category: "young",
    genres: ["live", "student"],
    matchPatterns: [
      { edition: "07.02.26", patterns: ["07 febbraio - rookie", "febbraio - rookie"] },
    ]
  },
  "-100 ALLA MATURITA": {
    category: "young",
    genres: ["student"],
    matchPatterns: [
      { edition: "2026", patterns: ["\u2013100 alla maturit", "-100 alla maturit"] },
    ]
  },
  "STUDIOS PRESENTA: GLOCKY": {
    category: "young",
    genres: ["live", "student"],
    matchPatterns: [
      { edition: "27.12.25", patterns: ["27.12.25 studios presenta: glocky"] },
    ]
  },
  "EUPHORIA": {
    category: "young",
    genres: ["student"],
    matchPatterns: [
      { edition: "Carnival 2026", patterns: ["euphoria: jungle carnival", "euphoria"] },
    ]
  },
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
  "evento test scanner",
  "besame summer tour",
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
