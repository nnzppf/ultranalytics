import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadAllData, deleteDataset as deleteDatasetFromCloud, isProtectedDataset } from '../services/firebaseDataService';
import { loadEventConfig, saveEventConfig } from '../services/eventConfigService';
import { importFiles as importFilesToCloud } from '../services/importService';
import { applyEventConfig } from '../utils/applyEventConfig';

/**
 * Data for the new interface. Keeps the records as loaded and applies the event
 * catalog on top, so a catalog change re-applies without downloading again.
 * status: 'loading' | 'ready' | 'empty' | 'error'
 */
export function useUltraData() {
  const [state, setState] = useState({ status: 'loading', base: [], utenti: [], datasets: [], config: null, error: null });

  const load = useCallback(async () => {
    try {
      const [config, loaded] = await Promise.all([loadEventConfig().catch(() => null), loadAllData()]);
      const empty = loaded.records.length === 0 && loaded.utenti.length === 0;
      setState({ status: empty ? 'empty' : 'ready', base: loaded.records, utenti: loaded.utenti, datasets: loaded.datasets, config, error: null });
    } catch (e) {
      console.error('Load failed:', e);
      setState(s => ({ ...s, status: 'error', error: e }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const records = useMemo(
    () => (state.config ? applyEventConfig(state.base, state.config) : state.base),
    [state.base, state.config]
  );

  const importFiles = useCallback(async (parsedFiles) => {
    const result = await importFilesToCloud(parsedFiles, state.config);
    await load();
    return result;
  }, [state.config, load]);

  const saveConfig = useCallback(async (config) => {
    const ok = await saveEventConfig(config);
    if (ok) setState(s => ({ ...s, config }));
    return ok;
  }, []);

  const deleteDataset = useCallback(async (id) => {
    if (isProtectedDataset(id)) throw new Error('Dataset protetto');
    await deleteDatasetFromCloud(id);
    await load();
  }, [load]);

  return {
    status: state.status,
    error: state.error,
    records,
    utenti: state.utenti,
    datasets: state.datasets,
    config: state.config,
    reload: load,
    importFiles,
    saveConfig,
    deleteDataset,
  };
}
