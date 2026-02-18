/**
 * Script Node.js per caricare i CSV (biglietti + utenti) su Firebase Firestore.
 * Eseguire con: node scripts/uploadData.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

// Firebase config (stessa dell'app)
const firebaseConfig = {
  apiKey: "AIzaSyDQ_pdzqlEXZZOhe7poiv-wkgoUNg3Bqag",
  authDomain: "ultranalytics-8582c.firebaseapp.com",
  projectId: "ultranalytics-8582c",
  storageBucket: "ultranalytics-8582c.firebasestorage.app",
  messagingSenderId: "306745766555",
  appId: "1:306745766555:web:aa1cc6556f51dbd75c0c3e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---- BRAND MATCHING (simplified from eventConfig.js) ----
const BRAND_REGISTRY = {
  'BESAME': { category: 'standard', genres: ['commerciale'], matchPatterns: ['besame'] },
  'PLUMA': { category: 'standard', genres: ['commerciale'], matchPatterns: ['pluma'] },
  'ULTRAVIVID': { category: 'standard', genres: ['commerciale', 'elettronica'], matchPatterns: ['ultravivid'] },
  'ATIPICO': { category: 'standard', genres: ['elettronica'], matchPatterns: ['atipico'] },
  'STUDIOS CLUB OPENING PARTY': { category: 'standard', genres: ['elettronica'], matchPatterns: ['studios club opening party'] },
  'PURPLE RAIN': { category: 'standard', genres: ['commerciale'], matchPatterns: ['purple rain'] },
  '2000 MANIA': { category: 'standard', genres: ['commerciale'], matchPatterns: ['2000 mania', '2000mania'] },
  'POLPETTE': { category: 'standard', genres: ['elettronica', 'aperitivo'], matchPatterns: ['polpette'] },
  'AMARCORD': { category: 'standard', genres: ['commerciale'], matchPatterns: ['amarcord'] },
  'VISION': { category: 'standard', genres: ['elettronica'], matchPatterns: ['vision'] },
  'SALTACODA': { category: 'standard', genres: ['commerciale'], matchPatterns: ['saltacoda'] },
  'DOBLE SOUND': { category: 'standard', genres: ['commerciale'], matchPatterns: ['doble sound', 'doble'] },
  'SUNDAYS X GG': { category: 'standard', genres: ['commerciale', 'aperitivo'], matchPatterns: ['sundays', 'gg'] },
  'LOVE by Polpette': { category: 'standard', genres: ['elettronica'], matchPatterns: ['love by polpette', 'love polpette'] },
  'Rookie': { category: 'young', genres: ['live', 'student'], matchPatterns: ['rookie'] },
  '-100 ALLA MATURITÀ': { category: 'young', genres: ['student'], matchPatterns: ['-100 alla maturit', '100 alla maturit', 'maturita'] },
  'GLOCKY': { category: 'young', genres: ['live', 'student'], matchPatterns: ['glocky'] },
  'Euphoria': { category: 'young', genres: ['student'], matchPatterns: ['euphoria'] },
};

const EXCLUDED_PATTERNS = ['test app', 'evento test', 'evento registrazione gratuita', 'evento test scanner', 'besame summer tour'];
const SENIOR_PATTERNS = [
  'mamma mia', 'mammamia', 'io&te', 'io & te',
  'red carpet exclusive party', 'il natale ai gelsi',
  'il capodanno gelsi', 'pompon cartoon carnival',
  'deco 90', 'decò 90',
];

function matchBrand(rawName) {
  const lower = rawName.toLowerCase().trim();

  // Check excluded
  for (const p of EXCLUDED_PATTERNS) {
    if (lower.includes(p)) return null;
  }

  // Check senior
  for (const p of SENIOR_PATTERNS) {
    if (lower.includes(p)) return { brand: 'DECÒ 90', category: 'senior', genres: ['commerciale'], editionLabel: rawName };
  }

  // Match brands
  for (const [brand, config] of Object.entries(BRAND_REGISTRY)) {
    for (const pattern of config.matchPatterns) {
      if (lower.includes(pattern)) {
        return { brand, category: config.category, genres: config.genres, editionLabel: rawName };
      }
    }
  }

  return { brand: rawName, category: 'unknown', genres: [], editionLabel: rawName };
}

// ---- DATE PARSING ----
function parseDateTime(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // DD/MM/YYYY HH:MM:SS or DD/MM/YYYY HH:MM
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]), parseInt(m[4]), parseInt(m[5]), parseInt(m[6] || 0));
  }
  return null;
}

function isSentinelDate(raw) {
  if (!raw) return true;
  const s = String(raw).trim();
  return s.startsWith('01/01/1970') || s === '1970-01-01';
}

function parseBirthDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s.startsWith('01/01/1970') || s === '1970-01-01') return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) return d;
  }
  return null;
}

// ---- FASCE ----
const DAYS_JS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
function getFascia(h) {
  if (h >= 6 && h < 12) return 'Mattina';
  if (h >= 12 && h < 18) return 'Pomeriggio';
  if (h >= 18 && h < 22) return 'Sera';
  return 'Notte';
}

// ---- ITALIAN MONTHS ----
const MESI_IT = {
  'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
  'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
  'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11,
};
const MONTH_RE = '(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)';

// ---- EVENT DATE EXTRACTION ----
function extractEventDate(rawName) {
  if (!rawName) return null;
  const s = rawName.trim();

  // DD.MM.YY or DD.MM.YYYY
  let m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    return new Date(year, parseInt(m[2]) - 1, parseInt(m[1]));
  }

  // DD MeseItaliano YYYY
  m = s.match(new RegExp(`(\\d{1,2})\\s+(${MONTH_RE})\\s+(\\d{4})`, 'i'));
  if (m) {
    const month = MESI_IT[m[2].toLowerCase()];
    if (month !== undefined) return new Date(parseInt(m[3]), month, parseInt(m[1]));
  }

  // DD MESE (no year) - assume season 2025/2026
  m = s.match(new RegExp(`(\\d{1,2})\\s+(${MONTH_RE})`, 'i'));
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

// ---- PROCESS BIGLIETTI ----
function processBigliettiRows(rows) {
  const records = [];

  for (const row of rows) {
    const rawEventName = (row.evento || '').trim();
    if (!rawEventName) continue;

    const brandMatch = matchBrand(rawEventName);
    if (!brandMatch) continue; // excluded
    if (brandMatch.category === 'senior') continue;

    const purchaseDate = parseDateTime(row.data_acquisto_biglietto);
    if (!purchaseDate) continue;

    const rawScan = (row.data_scansione || '').trim();
    const attended = !isSentinelDate(rawScan);
    const scanDate = attended ? parseDateTime(rawScan) : null;
    const eventDate = extractEventDate(rawEventName);

    let daysBefore = null;
    if (eventDate && purchaseDate) {
      daysBefore = Math.max(0, Math.floor((eventDate - purchaseDate) / 86400000));
    }

    const name = (row.name || '').trim();
    const surname = (row.surname || '').trim();

    records.push({
      rawEventName,
      brand: brandMatch.brand,
      editionLabel: brandMatch.editionLabel,
      category: brandMatch.category,
      genres: brandMatch.genres,
      purchaseDate: purchaseDate.toISOString(),
      scanDate: scanDate?.toISOString() || null,
      attended,
      eventDate: eventDate?.toISOString() || null,
      daysBefore,
      name,
      surname,
      fullName: `${name} ${surname}`.trim(),
      email: (row.email || '').trim().toLowerCase(),
      phone: (row.cellulare || '').trim(),
      gender: (row.sesso || '').trim().toUpperCase() || null,
      birthDate: parseBirthDate(row.data_nascita)?.toISOString() || null,
      location: (row.location || '').trim(),
      promoter: (row.promoter || '').trim() || null,
      code: (row.codice || '').trim(),
      hour: purchaseDate.getHours(),
      dayOfWeek: DAYS_JS[purchaseDate.getDay()],
      fascia: getFascia(purchaseDate.getHours()),
    });
  }

  return records;
}

// ---- PROCESS UTENTI ----
function processUtentiRows(rows) {
  const users = [];

  for (const row of rows) {
    const name = (row.name || '').trim();
    const surname = (row.surname || '').trim();
    const fullName = `${name} ${surname}`.trim();
    if (!fullName) continue;

    const birthDate = parseBirthDate(row.data_nascita);
    const regDate = parseDateTime(row.data_registrazione);

    users.push({
      name,
      surname,
      fullName,
      email: (row.email || '').trim().toLowerCase(),
      phone: (row.cellulare || '').trim(),
      gender: (row.sesso || '').trim().toUpperCase() || null,
      birthDate: birthDate?.toISOString() || null,
      registrationDate: regDate?.toISOString() || null,
    });
  }

  return users;
}

// ---- CHUNK HELPER ----
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---- MAIN ----
async function main() {
  console.log('🚀 Caricamento dati su Firebase...\n');

  // 0. Clean old data
  console.log('🧹 Pulizia vecchi dati...');
  const oldSnap = await getDocs(collection(db, 'datasets'));
  for (const dsDoc of oldSnap.docs) {
    // Delete sub-collections
    const recSnap = await getDocs(collection(db, 'datasets', dsDoc.id, 'records'));
    for (const d of recSnap.docs) await deleteDoc(d.ref);
    const uSnap = await getDocs(collection(db, 'datasets', dsDoc.id, 'utenti'));
    for (const d of uSnap.docs) await deleteDoc(d.ref);
    await deleteDoc(dsDoc.ref);
    console.log(`   Eliminato: ${dsDoc.id}`);
  }
  console.log('   ✅ Pulizia completata\n');

  // 1. Parse biglietti
  console.log('📄 Parsing biglietti-18-02.csv...');
  const bigliettiRaw = readFileSync('C:\\Users\\filza\\Desktop\\CLUB DATA\\biglietti-18-02.csv', 'utf-8');
  const bigliettiRows = parse(bigliettiRaw, { columns: true, skip_empty_lines: true });
  console.log(`   ${bigliettiRows.length} righe trovate`);

  const records = processBigliettiRows(bigliettiRows);
  console.log(`   ${records.length} record processati (dopo filtri)\n`);

  // 2. Parse utenti
  console.log('📄 Parsing utenti.csv...');
  const utentiRaw = readFileSync('C:\\Users\\filza\\Desktop\\CLUB DATA\\utenti.csv', 'utf-8');
  const utentiRows = parse(utentiRaw, { columns: true, skip_empty_lines: true });
  console.log(`   ${utentiRows.length} righe trovate`);

  const users = processUtentiRows(utentiRows);
  console.log(`   ${users.length} utenti processati\n`);

  // 3. Upload biglietti to Firestore
  const bigliettiId = `ds_biglietti_18_02`;
  console.log(`☁️  Salvando biglietti su Firestore (${records.length} record)...`);

  await setDoc(doc(db, 'datasets', bigliettiId), {
    fileName: 'biglietti-18-02.csv',
    fileType: 'biglietti',
    fileUrl: null,
    recordCount: records.length,
    uploadedAt: serverTimestamp(),
  });

  const CHUNK_SIZE = 500;
  const recordChunks = chunkArray(records, CHUNK_SIZE);
  for (let i = 0; i < recordChunks.length; i++) {
    await setDoc(
      doc(db, 'datasets', bigliettiId, 'records', `chunk_${i}`),
      { items: recordChunks[i], index: i }
    );
    process.stdout.write(`   Chunk ${i + 1}/${recordChunks.length} salvato\r`);
  }
  console.log(`\n   ✅ Biglietti salvati (${recordChunks.length} chunk)\n`);

  // 4. Upload utenti to Firestore
  const utentiId = `ds_utenti`;
  console.log(`☁️  Salvando utenti su Firestore (${users.length} utenti)...`);

  await setDoc(doc(db, 'datasets', utentiId), {
    fileName: 'utenti.csv',
    fileType: 'utenti',
    fileUrl: null,
    recordCount: users.length,
    uploadedAt: serverTimestamp(),
  });

  const userChunks = chunkArray(users, CHUNK_SIZE);
  for (let i = 0; i < userChunks.length; i++) {
    await setDoc(
      doc(db, 'datasets', utentiId, 'utenti', `chunk_${i}`),
      { items: userChunks[i], index: i }
    );
    process.stdout.write(`   Chunk ${i + 1}/${userChunks.length} salvato\r`);
  }
  console.log(`\n   ✅ Utenti salvati (${userChunks.length} chunk)\n`);

  // 5. Verify
  console.log('🔍 Verifica...');
  const snap = await getDocs(collection(db, 'datasets'));
  console.log(`   ${snap.size} dataset trovati su Firestore`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`   - ${d.id}: ${data.fileName} (${data.fileType}, ${data.recordCount} record)`);
  });

  console.log('\n🎉 Completato! I dati sono pronti nel cloud.');
  process.exit(0);
}

main().catch(e => {
  console.error('❌ Errore:', e);
  process.exit(1);
});
