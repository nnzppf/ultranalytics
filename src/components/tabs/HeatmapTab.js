import Section from '../shared/Section';
import Heatmap from '../shared/Heatmap';

export default function HeatmapTab({ heatmapGrid }) {
  return (
    <Section title="Heatmap registrazioni (giorno × ora)">
      <Heatmap heatmapGrid={heatmapGrid} />
    </Section>
  );
}
