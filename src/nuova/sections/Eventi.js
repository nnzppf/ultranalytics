import { Panel, UpcomingTable, TrackerView } from '../ui';
import { dshort } from '../format';

export default function Eventi({ ctx }) {
  const { upcoming, selectedEvent, goTo } = ctx;
  const item = upcoming.find((u) => u.ed.key === selectedEvent) || upcoming[0];
  return (
    <div className="nx-grid">
      <Panel span={12} title="Prossimi eventi" hint="tocca una riga per vederne il tracker">
        <UpcomingTable upcoming={upcoming} selectedKey={item?.ed.key} onSelect={(key) => goTo('eventi', key)} />
      </Panel>
      {item && (
        <Panel span={12} title={`Tracker · ${item.ed.title}`} hint={`${dshort(item.ed.date)} · ${item.ed.venue} · registrazioni cumulative contro le edizioni passate`}>
          <TrackerView item={item} onCompare={(key) => goTo('confronta', key)} />
        </Panel>
      )}
    </div>
  );
}
