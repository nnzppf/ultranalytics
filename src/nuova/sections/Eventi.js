import { Panel, UpcomingTable, TrackerView, WindowSeg } from '../ui';
import { lookupNight } from '../model';
import { dshort } from '../format';

export default function Eventi({ ctx }) {
  const { upcoming, selectedEvent, goTo, windowDays, setWindowDays, notes, saveNote, saveCount } = ctx;
  const item = upcoming.find((u) => u.ed.key === selectedEvent) || upcoming[0];
  return (
    <div className="nx-grid">
      <Panel span={12} title="Prossimi eventi" hint="entro 60 giorni · tocca una riga per vederne il tracker">
        <UpcomingTable upcoming={upcoming} selectedKey={item?.ed.key} onSelect={(key) => goTo('eventi', key)} />
      </Panel>
      {item && (
        <Panel span={12} title={`Tracker · ${item.ed.title}`} hint={`${dshort(item.ed.date)} · ${item.ed.venue} · registrazioni cumulative contro le edizioni passate`}
          actions={<WindowSeg value={windowDays} onChange={setWindowDays} />}>
          <TrackerView item={item} windowDays={windowDays} onCompare={(key) => goTo('confronta', key)}
            onSaveCount={saveCount} note={lookupNight(notes, item.ed)} onSaveNote={saveNote} />
        </Panel>
      )}
    </div>
  );
}
