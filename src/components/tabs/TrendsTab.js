import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import Section from '../shared/Section';
import { COLORS, TOOLTIP_STYLE } from '../../config/constants';

export default function TrendsTab({ trendData, trendByGroup, multiEvent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Section title="Trend giornaliero registrazioni">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="total" name="Registrazioni" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={14} />
            <Bar dataKey="partecipato" name="Presenze" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {multiEvent && trendByGroup && (
        <Section title="Trend per brand">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendByGroup.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {trendByGroup.groups.map((g, i) => (
                <Line key={g} type="monotone" dataKey={g} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Section>
      )}
    </div>
  );
}
