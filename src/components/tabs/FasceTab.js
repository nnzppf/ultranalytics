import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import Section from '../shared/Section';
import ResizeHandle from '../shared/ResizeHandle';
import { TOOLTIP_STYLE, FASCE } from '../../config/constants';

export default function FasceTab({ fasciaData, convByFascia, graphHeights, setGraphHeights }) {
  const pieColors = ["#6366f1", "#f59e0b", "#06b6d4", "#ec4899"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Definizioni fasce */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FASCE.map((f, i) => (
          <span key={f} style={{
            background: "#1e293b", borderRadius: 8, padding: "4px 12px",
            fontSize: 11, color: pieColors[i], border: `1px solid ${pieColors[i]}33`,
          }}>{f}</span>
        ))}
      </div>

      <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Registrazioni per fascia */}
        <Section title="Registrazioni per fascia oraria">
          <ResponsiveContainer width="100%" height={graphHeights.fasciaData || 250}>
            <BarChart data={fasciaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="fascia" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" name="Registrazioni" radius={[6, 6, 0, 0]} maxBarSize={45}>
                {fasciaData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ResizeHandle chartKey="fasciaData" graphHeights={graphHeights} setGraphHeights={setGraphHeights} />
        </Section>

        {/* Conversione per fascia */}
        <Section title="Tasso di conversione per fascia">
          <ResponsiveContainer width="100%" height={graphHeights.convByFascia || 250}>
            <BarChart data={convByFascia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="fascia" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} unit="%" />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="conversione" name="Conversione %" radius={[6, 6, 0, 0]} maxBarSize={45}>
                {convByFascia.map((d, i) => (
                  <Cell key={i} fill={d.conversione >= 70 ? "#10b981" : d.conversione >= 40 ? "#f59e0b" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ResizeHandle chartKey="convByFascia" graphHeights={graphHeights} setGraphHeights={setGraphHeights} />
        </Section>
      </div>

      {/* Distribuzione pie */}
      <Section title="Distribuzione per fascia">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={fasciaData}
              dataKey="count" nameKey="fascia"
              cx="50%" cy="50%"
              innerRadius={60} outerRadius={95}
              label={({ fascia, percent }) => `${fascia} ${(percent * 100).toFixed(0)}%`}
            >
              {fasciaData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </Section>
    </div>
  );
}
