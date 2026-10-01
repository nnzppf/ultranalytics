import { db } from '../config/firebase';
import { doc, getDoc, setDoc, deleteField, serverTimestamp } from 'firebase/firestore/lite';

const CONFIG_DOC = doc(db, 'appConfig', 'eventConfig');

/**
 * Load custom event configuration from Firebase.
 * Returns null if no config exists yet.
 */
export async function loadEventConfig() {
  try {
    const snap = await getDoc(CONFIG_DOC);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {
    console.warn('Failed to load event config:', e);
  }
  return null;
}

/**
 * Save custom event configuration to Firebase.
 * Config structure:
 * {
 *   brands: {
 *     "ORIGINAL_NAME": {
 *       displayName: "Display Name",
 *       category: "standard" | "young" | "senior",
 *       genres: ["commerciale", ...],
 *       venue: "Too Late",
 *       aliases: ["alt name 1", ...],
 *     },
 *   },
 *   excludedBrands: ["DECO 90", ...],
 *   renames: { "OLD_NAME": "NEW_NAME", ... },
 *   lastUpdated: serverTimestamp
 * }
 */
export async function saveEventConfig(config) {
  try {
    await setDoc(CONFIG_DOC, {
      ...config,
      lastUpdated: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error('Failed to save event config:', e);
    return false;
  }
}

/**
 * Set one value inside the catalog without rewriting the rest (notes, typed-in
 * counts, dates), so two people editing different things don't overwrite each
 * other. path: ['notes', id]; value null removes it.
 */
export async function patchEventConfig(path, value) {
  try {
    const nested = path.reduceRight((acc, k) => ({ [k]: acc }), value == null ? deleteField() : value);
    await setDoc(CONFIG_DOC, { ...nested, lastUpdated: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to update event config:', e);
    return false;
  }
}
