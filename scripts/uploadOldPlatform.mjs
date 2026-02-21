/**
 * Upload old-platform ATIPICO CSVs to Firebase.
 * Format: Codice, Nome, Contatto, Nascita, Ora di acquisto, Ora di arrivo, Ora di uscita, PR, Caparra
 *
 * Run: node scripts/uploadOldPlatform.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

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

// ---- Files to upload ----
const FILES = [
  {
    path: 'C:\\Users\\filza\\Downloads\\ATIPICO WMATTIAS CLAY + EDO ANTONELLO 9 NOVEMBRE 2024.csv',
    eventName: 'ATIPICO W/MATTIAS CLAY + EDO ANTONELLO 9.11.24',
    eventDate: new Date(2024, 10, 9), // Nov 9, 2024
  },
  {
    path: 'C:\\Users\\filza\\Downloads\\ATIPICO W MATTIA FONTANA 14 DICEMBRE.csv',
    eventName: 'ATIPICO W/MATTIA FONTANA 14.12.24',
    eventDate: new Date(2024, 11, 14), // Dec 14, 2024
  },
  {
    path: 'C:\\Users\\filza\\Downloads\\ATIPICO 22.03.csv',
    eventName: 'ATIPICO 22.03.25',
    eventDate: new Date(2025, 2, 22), // Mar 22, 2025
  },
  {
    path: 'C:\\Users\\filza\\Downloads\\ATIPICO ANNIVERSARY TOO LATE CLOSING PARTY.csv',
    eventName: 'ATIPICO ANNIVERSARY TOO LATE CLOSING PARTY 10.05.25',
    eventDate: new Date(2025, 4, 10), // May 10, 2025
  },
];

// ---- Helpers ----
const DAYS_JS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
function getFascia(h) {
  if (h >= 6 && h < 12) return 'Mattina';
  if (h >= 12 && h < 18) return 'Pomeriggio';
  if (h >= 18 && h < 22) return 'Sera';
  return 'Notte';
}

function parseISO(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.startsWith('0000')) return null;
  // YYYY-MM-DD HH:MM:SS
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  }
  return null;
}

function parseBirthDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.startsWith('0000') || s.startsWith('1970')) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) return d;
  }
  return null;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ---- Process one file ----
function processFile(fileCfg) {
  const raw = readFileSync(fileCfg.path, 'utf-8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true });

  const records = [];
  for (const row of rows) {
    const fullName = (row['Nome'] || '').trim();
    if (!fullName) continue;

    const purchaseDate = parseISO(row['Ora di acquisto']);
    if (!purchaseDate) continue;

    const arrivalRaw = (row['Ora di arrivo'] || '').trim();
    const attended = !arrivalRaw.startsWith('0000') && arrivalRaw !== '';
    const scanDate = attended ? parseISO(arrivalRaw) : null;

    let daysBefore = null;
    if (fileCfg.eventDate && purchaseDate) {
      daysBefore = Math.max(0, Math.floor((fileCfg.eventDate - purchaseDate) / 86400000));
    }

    // Split full name into name + surname
    const parts = fullName.split(/\s+/);
    const name = parts[0] || '';
    const surname = parts.slice(1).join(' ') || '';

    const promoterRaw = (row['PR'] || '').trim();

    records.push({
      rawEventName: fileCfg.eventName,
      brand: 'ATIPICO',
      editionLabel: fileCfg.eventName,
      category: 'standard',
      genres: ['elettronica'],
      purchaseDate: purchaseDate.toISOString(),
      scanDate: scanDate?.toISOString() || null,
      attended,
      eventDate: fileCfg.eventDate.toISOString(),
      daysBefore,
      name,
      surname,
      fullName,
      email: '',
      phone: (row['Contatto'] || '').trim(),
      gender: null,
      birthDate: parseBirthDate(row['Nascita'])?.toISOString() || null,
      location: '',
      promoter: (promoterRaw && promoterRaw !== '-') ? promoterRaw : null,
      code: (row['Codice'] || '').trim(),
      hour: purchaseDate.getHours(),
      dayOfWeek: DAYS_JS[purchaseDate.getDay()],
      fascia: getFascia(purchaseDate.getHours()),
    });
  }

  return records;
}

// ---- Main ----
async function main() {
  console.log('🚀 Upload vecchia piattaforma ATIPICO...\n');

  const CHUNK_SIZE = 500;
  let totalRecords = 0;

  for (const fileCfg of FILES) {
    const fileName = fileCfg.path.split('\\').pop();
    console.log(`📄 ${fileName}`);

    const records = processFile(fileCfg);
    console.log(`   ${records.length} record processati`);
    console.log(`   Presenze: ${records.filter(r => r.attended).length}/${records.length}`);
    totalRecords += records.length;

    // Upload to Firestore (append, no delete)
    const dsId = `ds_old_${fileCfg.eventName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}`;

    await setDoc(doc(db, 'datasets', dsId), {
      fileName,
      fileType: 'biglietti',
      fileUrl: null,
      recordCount: records.length,
      uploadedAt: serverTimestamp(),
    });

    const chunks = chunkArray(records, CHUNK_SIZE);
    for (let i = 0; i < chunks.length; i++) {
      await setDoc(
        doc(db, 'datasets', dsId, 'records', `chunk_${i}`),
        { items: chunks[i], index: i }
      );
    }
    console.log(`   ✅ Salvato su Firebase (${chunks.length} chunk)\n`);
  }

  console.log(`🎉 Completato! ${totalRecords} record totali caricati.`);
  process.exit(0);
}

main().catch(e => {
  console.error('❌ Errore:', e);
  process.exit(1);
});
