import { colors, radius } from './designTokens';

export const COLORS = colors.chart;

export const DAYS_ORDER = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
export const DAYS_SHORT = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
export const DAYS_JS = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];

export const HOURS = Array.from({length:24},(_,i)=>i);

export const FASCE = ["Notte (00-06)","Mattina (06-12)","Pomeriggio (12-18)","Sera (18-24)"];
export const FASCE_SHORT = ["Notte","Mattina","Pomeriggio","Sera"];

export const MESI_IT = {
  gen:0,gennaio:0,feb:1,febbraio:1,mar:2,marzo:2,apr:3,aprile:3,
  mag:4,maggio:4,giu:5,giugno:5,lug:6,luglio:6,ago:7,agosto:7,
  set:8,settembre:8,ott:9,ottobre:9,nov:10,novembre:10,dic:11,dicembre:11
};

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: colors.bg.solid,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.xl,
    color: colors.text.primary,
    boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
    padding: "8px 12px",
    fontSize: 12,
  },
  itemStyle: { color: colors.text.primary, fontSize: 12, padding: "2px 0" },
  labelStyle: { color: colors.text.muted, fontWeight: 600, marginBottom: 2 },
  cursor: { stroke: colors.brand.purple, strokeWidth: 1, strokeDasharray: "4 4" },
};

export const getFascia = (hour) => {
  if (hour < 6) return "Notte";
  if (hour < 12) return "Mattina";
  if (hour < 18) return "Pomeriggio";
  return "Sera";
};
