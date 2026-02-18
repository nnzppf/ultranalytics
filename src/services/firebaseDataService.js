import { db, storage } from '../config/firebase';
import {
  collection, doc, setDoc, getDocs, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from 'firebase/storage';

// Collection names
const DATASETS_COL = 'datasets';      // metadata per dataset caricato
const RECORDS_COL = 'records';         // biglietti processati (in sub-chunks)
const UTENTI_COL = 'utenti';           // utenti processati

/**
 * Save a processed dataset to Firebase.
 * - Upload original CSV to Storage
 * - Save processed records to Firestore (chunked to stay under 1MB doc limit)
 * - Save metadata
 */
export async function saveDataset({ fileName, fileBlob, records, utenti, fileType }) {
  const datasetId = `ds_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 1. Upload original file to Storage
  let fileUrl = null;
  if (fileBlob) {
    const storageRef = ref(storage, `uploads/${datasetId}/${fileName}`);
    await uploadBytes(storageRef, fileBlob);
    fileUrl = await getDownloadURL(storageRef);
  }

  // 2. Save metadata
  await setDoc(doc(db, DATASETS_COL, datasetId), {
    fileName,
    fileType, // 'biglietti' | 'utenti'
    fileUrl,
    recordCount: fileType === 'utenti' ? utenti.length : records.length,
    uploadedAt: serverTimestamp(),
  });

  // 3. Save processed data in chunks (Firestore has 1MB doc limit)
  const CHUNK_SIZE = 500;

  if (fileType === 'utenti' && utenti.length > 0) {
    const chunks = chunkArray(utenti.map(serializeUser), CHUNK_SIZE);
    for (let i = 0; i < chunks.length; i++) {
      await setDoc(
        doc(db, DATASETS_COL, datasetId, UTENTI_COL, `chunk_${i}`),
        { items: chunks[i], index: i }
      );
    }
  } else if (records.length > 0) {
    const chunks = chunkArray(records.map(serializeRecord), CHUNK_SIZE);
    for (let i = 0; i < chunks.length; i++) {
      await setDoc(
        doc(db, DATASETS_COL, datasetId, RECORDS_COL, `chunk_${i}`),
        { items: chunks[i], index: i }
      );
    }
  }

  return datasetId;
}

/**
 * Load all datasets from Firebase.
 * Returns { records: [...], utenti: [...], datasets: [...metadata] }
 */
export async function loadAllData() {
  const allRecords = [];
  const allUtenti = [];
  const datasets = [];

  // Get all dataset metadata
  const dsSnap = await getDocs(
    query(collection(db, DATASETS_COL), orderBy('uploadedAt', 'asc'))
  );

  for (const dsDoc of dsSnap.docs) {
    const meta = dsDoc.data();
    datasets.push({ id: dsDoc.id, ...meta });

    if (meta.fileType === 'utenti') {
      // Load utenti chunks
      const chunksSnap = await getDocs(
        collection(db, DATASETS_COL, dsDoc.id, UTENTI_COL)
      );
      for (const chunkDoc of chunksSnap.docs) {
        const items = chunkDoc.data().items || [];
        allUtenti.push(...items.map(deserializeUser));
      }
    } else {
      // Load record chunks
      const chunksSnap = await getDocs(
        collection(db, DATASETS_COL, dsDoc.id, RECORDS_COL)
      );
      for (const chunkDoc of chunksSnap.docs) {
        const items = chunkDoc.data().items || [];
        allRecords.push(...items.map(deserializeRecord));
      }
    }
  }

  return { records: allRecords, utenti: allUtenti, datasets };
}

/**
 * Delete a dataset and its sub-collections from Firebase.
 */
export async function deleteDataset(datasetId) {
  // Delete record chunks
  const recordsSnap = await getDocs(
    collection(db, DATASETS_COL, datasetId, RECORDS_COL)
  );
  for (const d of recordsSnap.docs) await deleteDoc(d.ref);

  // Delete utenti chunks
  const utentiSnap = await getDocs(
    collection(db, DATASETS_COL, datasetId, UTENTI_COL)
  );
  for (const d of utentiSnap.docs) await deleteDoc(d.ref);

  // Delete storage file
  const meta = (await getDocs(query(collection(db, DATASETS_COL)))).docs
    .find(d => d.id === datasetId)?.data();
  if (meta?.fileUrl) {
    try {
      const storageRef = ref(storage, `uploads/${datasetId}/${meta.fileName}`);
      await deleteObject(storageRef);
    } catch (e) {
      console.warn('Could not delete storage file:', e);
    }
  }

  // Delete metadata doc
  await deleteDoc(doc(db, DATASETS_COL, datasetId));
}

/**
 * Check if there's any saved data in Firebase.
 */
export async function hasStoredData() {
  const snap = await getDocs(collection(db, DATASETS_COL));
  return snap.size > 0;
}

// --- Serialization helpers ---
// Dates must be converted to ISO strings for Firestore

function serializeRecord(r) {
  return {
    ...r,
    purchaseDate: r.purchaseDate?.toISOString() || null,
    scanDate: r.scanDate?.toISOString() || null,
    eventDate: r.eventDate?.toISOString() || null,
    birthDate: r.birthDate?.toISOString() || null,
  };
}

function deserializeRecord(r) {
  return {
    ...r,
    purchaseDate: r.purchaseDate ? new Date(r.purchaseDate) : null,
    scanDate: r.scanDate ? new Date(r.scanDate) : null,
    eventDate: r.eventDate ? new Date(r.eventDate) : null,
    birthDate: r.birthDate ? new Date(r.birthDate) : null,
  };
}

function serializeUser(u) {
  return {
    ...u,
    birthDate: u.birthDate?.toISOString() || null,
    registrationDate: u.registrationDate?.toISOString() || null,
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
