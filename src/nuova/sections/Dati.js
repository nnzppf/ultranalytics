import { useState, lazy, Suspense } from 'react';
import { Panel } from '../ui';
import { fmt, dmy } from '../format';
import { parseUploadFile } from '../../services/importService';
import { isProtectedDataset } from '../../services/firebaseDataService';

const EventManagerModal = lazy(() => import('../../components/screens/EventManagerModal'));

/** Uploads, datasets and the event catalog. */
export default function Dati({ ctx }) {
  const { data, records } = ctx;
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [typed, setTyped] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);

  const addFiles = async (list) => {
    setMessage(null);
    try {
      const parsed = await Promise.all(Array.from(list).map(parseUploadFile));
      setFiles((prev) => [...prev, ...parsed]);
    } catch (e) {
      setMessage({ kind: 'error', text: `File non letto: ${e.message}` });
    }
  };

  const runImport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await data.importFiles(files);
      setFiles([]);
      setMessage(r.saveFailed
        ? { kind: 'error', text: 'Salvataggio non completo: riprova, i dati già presenti non sono stati toccati.' }
        : { kind: 'ok', text: `Caricati ${fmt(r.records.length)} biglietti e ${fmt(r.utenti.length)} utenti.${r.pruned.length ? ` Tolti export precedenti già inclusi: ${r.pruned.join(', ')}.` : ''}` });
    } catch (e) {
      setMessage({ kind: 'error', text: `Caricamento non riuscito: ${e.message}` });
    }
    setBusy(false);
  };

  const confirmDelete = async (ds) => {
    setBusy(true);
    try {
      await data.deleteDataset(ds.id);
      setMessage({ kind: 'ok', text: `Eliminato ${ds.fileName}.` });
    } catch (e) {
      setMessage({ kind: 'error', text: `Eliminazione non riuscita: ${e.message}` });
    }
    setConfirmId(null);
    setTyped('');
    setBusy(false);
  };

  return (
    <div className="nx-grid">
      <Panel span={7} title="Carica export" hint="biglietti e utenti dal sito, in CSV o Excel">
        <label className="nx-drop" htmlFor="nx-upload" style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start' }}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
          <b>Trascina qui i file o tocca per sceglierli</b>
          <span className="nx-hint">Puoi caricare export che si sovrappongono: le registrazioni già presenti si aggiornano senza contarle due volte.</span>
        </label>
        <input id="nx-upload" type="file" multiple accept=".csv,.tsv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        {files.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {files.map((f, i) => <div key={i} className="nx-note">{f.name} · {fmt(f.rows.length)} righe <button className="nx-link" onClick={() => setFiles(files.filter((_, j) => j !== i))}>togli</button></div>)}
            <button className="nx-btn primary" style={{ marginTop: 8 }} disabled={busy} onClick={runImport}>{busy ? 'Caricamento…' : `Carica ${files.length} file`}</button>
          </div>
        )}
        {message && <p className="nx-note" style={{ color: message.kind === 'error' ? 'var(--nx-bad)' : 'var(--nx-good)' }}>{message.text}</p>}
      </Panel>
      <Panel span={5} title="Catalogo eventi" hint="brand, generi, locali e nomi delle edizioni">
        <p className="nx-note" style={{ marginTop: 0 }}>Rinomina brand ed edizioni, unisci doppioni, assegna generi e locali, escludi serate. Vale per entrambe le viste.</p>
        <button className="nx-btn" onClick={() => setCatalogOpen(true)}>Apri il catalogo</button>
        <button className="nx-btn" style={{ marginLeft: 8 }} onClick={data.reload}>Ricarica i dati</button>
      </Panel>
      <Panel span={12} title="Dataset salvati" hint={`${fmt(records.length)} registrazioni in totale, senza doppioni`}>
        <div className="nx-tw">
          <table>
            <thead><tr><th>file</th><th>tipo</th><th className="n">righe</th><th className="n">caricato</th><th>formato</th><th /></tr></thead>
            <tbody>
              {data.datasets.map((ds) => {
                const prot = isProtectedDataset(ds.id);
                const uploaded = ds.uploadedAt?.toDate ? ds.uploadedAt.toDate() : null;
                return (
                  <tr key={ds.id}>
                    <td className="nx-name">{ds.fileName}</td>
                    <td>{ds.fileType === 'utenti' ? 'utenti' : 'biglietti'}</td>
                    <td className="n">{fmt(ds.recordCount)}</td>
                    <td className="n">{dmy(uploaded)}</td>
                    <td className="nx-flat">{ds.format === 2 ? 'compatto' : 'originale'}</td>
                    <td>
                      {prot ? <span className="nx-tag" title="Contiene dati che non esistono altrove (vecchia piattaforma, ingressi persi dal portale)">protetto</span>
                        : confirmId === ds.id ? (
                          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <label className="nx-hint" htmlFor={`nx-del-${ds.id}`}>scrivi il nome del file</label>
                            <input id={`nx-del-${ds.id}`} className="nx-input" style={{ width: 200, fontSize: 13 }} value={typed} onChange={(e) => setTyped(e.target.value)} />
                            <button className="nx-btn" disabled={typed.trim() !== ds.fileName || busy} onClick={() => confirmDelete(ds)}>Elimina per sempre</button>
                            <button className="nx-link" onClick={() => { setConfirmId(null); setTyped(''); }}>annulla</button>
                          </span>
                        ) : <button className="nx-link" onClick={() => { setConfirmId(ds.id); setTyped(''); }}>elimina…</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {catalogOpen && (
        <Suspense fallback={null}>
          <EventManagerModal data={records} eventConfig={data.config} onSave={async (cfg) => { await data.saveConfig(cfg); }} onClose={() => setCatalogOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
