/**
 * Importing portal exports: read the files, turn them into records/users, save them
 * as datasets and drop the older datasets the new ones fully contain.
 * Shared by the classic dashboard and the new interface.
 */
import Papa from 'papaparse';
import { processRawRows, isUtentiFormat, processUtentiRows } from '../utils/csvProcessor';
import { saveDataset, pruneSupersededDatasets } from './firebaseDataService';

export function eventNameFromFile(filename) {
  return filename.replace(/\.(csv|xlsx|xls|tsv)$/i, '').replace(/registrazioni[_\s]*/i, '').replace(/_/g, ' ').trim();
}

/** Read one CSV/TSV/Excel file into rows: { name, file, eventName, rows }. */
export function parseUploadFile(file) {
  const name = file.name.toLowerCase();
  return new Promise((resolve, reject) => {
    if (name.endsWith('.csv') || name.endsWith('.tsv')) {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (r) => resolve({ name: file.name, file, eventName: eventNameFromFile(file.name), rows: r.data }),
        error: reject,
      });
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        // Loaded on demand: the Excel reader is heavy and rarely needed
        const XLSX = await import('xlsx');
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve({ name: file.name, file, eventName: eventNameFromFile(file.name), rows: XLSX.utils.sheet_to_json(ws) });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error(`Formato non supportato: ${file.name}`));
    }
  });
}

/**
 * Save parsed files as datasets, then prune the datasets they supersede.
 * Returns { records, utenti, saveFailed, pruned } (records/utenti as parsed, for a
 * fallback when saving fails).
 */
export async function importFiles(files, eventConfig) {
  const records = [];
  const utenti = [];
  let saveFailed = false;

  for (const f of files) {
    const keys = f.rows.length > 0 ? Object.keys(f.rows[0]) : [];
    if (isUtentiFormat(keys)) {
      const users = processUtentiRows(f.rows);
      utenti.push(...users);
      try {
        await saveDataset({ fileName: f.name, records: [], utenti: users, fileType: 'utenti' });
      } catch (e) {
        console.error('Firebase save failed for', f.name, e);
        saveFailed = true;
      }
    } else {
      const parsed = processRawRows(f.rows, f.eventName, eventConfig);
      records.push(...parsed);
      try {
        await saveDataset({ fileName: f.name, records: parsed, utenti: [], fileType: 'biglietti' });
      } catch (e) {
        console.error('Firebase save failed for', f.name, e);
        saveFailed = true;
      }
    }
  }

  // Older exports fully contained in the new ones are dropped (never after a failed save)
  const pruned = saveFailed ? [] : await pruneSupersededDatasets();
  return { records, utenti, saveFailed, pruned };
}
