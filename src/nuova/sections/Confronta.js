import { useState } from 'react';
import { Seg } from '../ui';
import Insiemi from './Insiemi';
import Tabelle from './Tabelle';

/** Comparison: two sets of nights, A against B, and the ranking tables with the projection checks. */
export default function Confronta({ ctx }) {
  const [mode, setMode] = useState('insiemi');
  return (
    <>
      <div style={{ paddingTop: 14 }}>
        <Seg value={mode} onChange={setMode} label="Confronta" options={[['insiemi', 'A contro B'], ['tabelle', 'Classifiche e stime']]} />
      </div>
      {mode === 'insiemi' ? <Insiemi ctx={ctx} /> : <Tabelle ctx={ctx} />}
    </>
  );
}
