import { useState } from 'react';
import { Panel, Seg, VenueDot, venueColor } from '../ui';
import { Timeline, NightBars, Heatmap, BarList } from '../charts';
import { fmt } from '../format';
import { VENUES } from '../model';

export default function Andamenti({ ctx }) {
  const { eds, hours, now } = ctx;
  const [metric, setMetric] = useState('reg');
  const done = eds.filter((e) => e.over);
  const from = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const older = done.filter((e) => e.date < from);
  const tot = hours.daysBefore.reduce((s, n) => s + n, 0) || 1;
  return (
    <div className="nx-grid">
      <Panel span={12} title="Serate nel tempo" hint="ultimi 12 mesi, ogni barra una serata conclusa"
        actions={<Seg value={metric} onChange={setMetric} label="Valore" options={[['reg', 'registrati'], ['ent', 'ingressi']]} />}>
        <div className="nx-tw"><Timeline nights={done} from={from} to={now} metric={metric} colorOf={venueColor} /></div>
        <div className="nx-legend">{VENUES.map(([v]) => <span key={v}><VenueDot venue={v} /> {v}</span>)}<span>Passa sopra una barra per i dettagli</span></div>
        {older.length > 0 && <p className="nx-note">Prima di questo periodo ci sono altre <b>{older.length}</b> serate (vecchia piattaforma Getfy compresa): le trovi in Confronta.</p>}
      </Panel>
      <Panel span={7} title="Ora della notte" hint="tutte le serate, da mezzogiorno a mezzogiorno">
        <NightBars reg={hours.reg} ent={hours.ent} />
        <div className="nx-legend"><span><i style={{ background: 'var(--nx-now)' }} />registrazioni</span><span><i style={{ background: 'var(--nx-proj)' }} />ingressi</span></div>
      </Panel>
      <Panel span={5} title="Quanto prima ci si registra">
        <BarList labelWidth={96} format={(v) => `${fmt((100 * v) / tot, 1)}%`}
          items={hours.daysBefore.map((n, i) => ({ label: i === 0 ? 'giorno evento' : i === 14 ? '14+ giorni' : `${i} ${i === 1 ? 'giorno' : 'giorni'} prima`, value: n, dim: i > 0 }))} />
        <p className="nx-note">Il <b>{fmt((100 * hours.daysBefore[0]) / tot, 0)}%</b> si registra il giorno stesso dell'evento.</p>
      </Panel>
      <Panel span={12} title="Giorno e ora" hint="registrazioni, sull'asse della notte">
        <Heatmap grid={hours.dowHour} />
      </Panel>
    </div>
  );
}
