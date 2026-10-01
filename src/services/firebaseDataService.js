import { db } from '../config/firebase';
import {
  collection, doc, setDoc, getDocs, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore/lite';
import { BRAND_REGISTRY } from '../config/eventConfig';
import { mergeRecordLists, mergeUserLists, isSuperseded, linkPeopleByPhone } from '../utils/datasetMerge';
import { matchBrand, editionLabelFromDate } from '../utils/eventNameCleaner';
import { daysBeforeEvent } from '../utils/eventTime';
import { FORMAT, compactRecords, expandRecords, compactUsers, expandUsers } from '../utils/compactFormat';
import { getCachedItems, putCachedItems, keepOnlyCached } from './datasetCache';

// Collection names
const DATASETS_COL = 'datasets';      // metadata per dataset caricato
const RECORDS_COL = 'records';         // biglietti processati (in sub-chunks)
const UTENTI_COL = 'utenti';           // utenti processati

// Items per chunk document (Firestore limit: 1 MB per document). Format 2 items
// are ~150 bytes, so 1500 stay well under it.
const CHUNK_SIZE = 1500;
const PARALLEL_WRITES = 6;

/**
 * Save a processed dataset to Firebase (format 2, see utils/compactFormat).
 * Chunks are written first, the metadata last: a dataset becomes visible only
 * once complete, so an interrupted upload leaves nothing half-loaded behind.
 * The original file is not stored: it would be one more copy of personal data.
 */
export async function saveDataset({ fileName, records, utenti, fileType }) {
  const datasetId = `ds_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const isUtenti = fileType === 'utenti';
  const sub = isUtenti ? UTENTI_COL : RECORDS_COL;
  const { events, items } = isUtenti
    ? { events: null, items: compactUsers(utenti) }
    : compactRecords(records);

  const writes = chunkArray(items, CHUNK_SIZE).map((chunk, i) => () =>
    setDoc(doc(db, DATASETS_COL, datasetId, sub, `chunk_${String(i).padStart(4, '0')}`), { items: chunk, index: i })
  );
  await runLimited(writes, PARALLEL_WRITES);

  await setDoc(doc(db, DATASETS_COL, datasetId), {
    fileName,
    fileType, // 'biglietti' | 'utenti'
    format: FORMAT,
    complete: true,
    recordCount: items.length,
    ...(events ? { events } : {}),
    uploadedAt: serverTimestamp(),
  });

  return datasetId;
}

const isUtentiDataset = ds => ds.fileType === 'utenti';

function cacheStamp(meta) {
  const uploaded = meta.uploadedAt?.toMillis ? meta.uploadedAt.toMillis() : String(meta.uploadedAt);
  return `${uploaded}|${meta.recordCount}|${meta.format || 1}`;
}

// Items of one dataset, from the local copy when it is there, in format-1 shape
async function loadDatasetItems(meta) {
  const stamp = cacheStamp(meta);
  let stored = await getCachedItems(meta.id, stamp);
  if (!stored) {
    const sub = isUtentiDataset(meta) ? UTENTI_COL : RECORDS_COL;
    const chunksSnap = await getDocs(collection(db, DATASETS_COL, meta.id, sub));
    stored = [];
    for (const chunkDoc of chunksSnap.docs) stored.push(...(chunkDoc.data().items || []));
    putCachedItems(meta.id, stamp, stored);
  }
  if (meta.format === FORMAT) {
    return isUtentiDataset(meta) ? expandUsers(stored) : expandRecords(stored, meta.events || []);
  }
  return stored;
}

// All complete datasets, oldest first, downloaded in parallel
async function loadAllRaw() {
  const dsSnap = await getDocs(
    query(collection(db, DATASETS_COL), orderBy('uploadedAt', 'asc'))
  );
  const metas = dsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(meta => !meta.format || meta.complete);
  keepOnlyCached(metas.map(m => m.id));
  return Promise.all(metas.map(async meta => ({ ...meta, items: await loadDatasetItems(meta) })));
}

async function runLimited(tasks, limit) {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      await task();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

// Datasets holding data that exists nowhere else: never deleted from the app
// (Getfy tickets 2024/25 and the scans of Atipico 21.02.26 the portal lost)
export const PROTECTED_DATASETS = ['ds_biglietti_21_02'];
export const isProtectedDataset = id => PROTECTED_DATASETS.includes(id);

// Older uploads (Getfy, Feb 2026) used the event name as edition: key every edition by
// its date like new uploads; names given in the catalog are re-applied by applyEventConfig
// daysBefore is recomputed too: uploads before Oct 2026 stored it shifted by a day
function withDateEdition(record) {
  if (!record.eventDate) return record;
  return {
    ...record,
    editionLabel: editionLabelFromDate(record.eventDate),
    daysBefore: daysBeforeEvent(record.purchaseDate, record.eventDate),
  };
}

// Older uploads may hold events excluded since (tests, senior): apply today's rules.
// Checked once per event name (about a hundred), not once per registration.
const includedByName = new Map();
function isStillIncluded(record) {
  const name = record.rawEventName;
  if (!name) return true;
  if (!includedByName.has(name)) {
    const match = matchBrand(name);
    includedByName.set(name, !!match && match.category !== 'senior');
  }
  return includedByName.get(name);
}

/**
 * Load all datasets from Firebase, merged across overlapping exports
 * (see utils/datasetMerge for the rules).
 * Returns { records: [...], utenti: [...], datasets: [...metadata] }
 */
export async function loadAllData() {
  const raw = await loadAllRaw();

  const utentiItems = mergeUserLists(raw.filter(isUtentiDataset).map(ds => ds.items));
  const recordItems = linkPeopleByPhone(
    mergeRecordLists(raw.filter(ds => !isUtentiDataset(ds)).map(ds => ds.items)),
    utentiItems
  ).filter(isStillIncluded);
  const datasets = raw.map(({ items, ...meta }) => meta);

  return {
    records: recordItems.map(deserializeRecord).map(withDateEdition),
    utenti: utentiItems.map(deserializeUser),
    datasets,
  };
}

/**
 * Delete datasets made redundant by newer uploads: everything they hold, scans
 * included, is also in later datasets of the same type. Returns the deleted file names.
 */
export async function pruneSupersededDatasets() {
  const raw = await loadAllRaw();
  const deleted = [];

  for (let i = 0; i < raw.length; i++) {
    const ds = raw[i];
    if (isProtectedDataset(ds.id)) continue;
    const fileType = isUtentiDataset(ds) ? 'utenti' : 'biglietti';
    const later = raw.slice(i + 1).filter(l => isUtentiDataset(l) === isUtentiDataset(ds)).map(l => l.items);
    if (later.length === 0) continue;
    const newerItems = fileType === 'utenti' ? mergeUserLists(later) : mergeRecordLists(later);
    if (isSuperseded(ds.items, newerItems, fileType)) {
      await deleteDataset(ds.id);
      deleted.push(ds.fileName);
    }
  }

  return deleted;
}

/**
 * Delete a dataset and its sub-collections from Firebase.
 */
export async function deleteDataset(datasetId) {
  if (isProtectedDataset(datasetId)) throw new Error(`Dataset protetto: ${datasetId}`);
  // Metadata first: the dataset disappears at once, then its chunks are removed
  await deleteDoc(doc(db, DATASETS_COL, datasetId));
  for (const sub of [RECORDS_COL, UTENTI_COL]) {
    const snap = await getDocs(collection(db, DATASETS_COL, datasetId, sub));
    await runLimited(snap.docs.map(d => () => deleteDoc(d.ref)), PARALLEL_WRITES);
  }
}

// --- Deserialization: format-1 shape (ISO strings) to Dates ---

function lookupBrandGenres(brand) {
  if (!brand) return [];
  // Direct match first
  if (BRAND_REGISTRY[brand]) return BRAND_REGISTRY[brand].genres || [];
  // Case-insensitive match
  const lower = brand.toLowerCase();
  for (const [key, config] of Object.entries(BRAND_REGISTRY)) {
    if (key.toLowerCase() === lower) return config.genres || [];
  }
  return [];
}

function deserializeRecord(r) {
  // Enrich with genres if missing (for records saved before genres were added)
  let genres = r.genres;
  if (!genres || !Array.isArray(genres) || genres.length === 0) {
    genres = lookupBrandGenres(r.brand);
  }
  return {
    ...r,
    genres,
    purchaseDate: r.purchaseDate ? new Date(r.purchaseDate) : null,
    scanDate: r.scanDate ? new Date(r.scanDate) : null,
    eventDate: r.eventDate ? new Date(r.eventDate) : null,
    birthDate: r.birthDate ? new Date(r.birthDate) : null,
  };
}

function deserializeUser(u) {
  return {
    ...u,
    birthDate: u.birthDate ? new Date(u.birthDate) : null,
    registrationDate: u.registrationDate ? new Date(u.registrationDate) : null,
  };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
