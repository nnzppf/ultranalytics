export const COLORS = [
  "#8b5cf6","#ec4899","#06b6d4","#f59e0b","#10b981",
  "#ef4444","#3b82f6","#f97316","#14b8a6","#a855f7"
];

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
  contentStyle: { background:"#1e293b", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9" },
  itemStyle: { color:"#f1f5f9" },
  labelStyle: { color:"#94a3b8" }
};

export const getFascia = (hour) => {
  if (hour < 6) return "Notte";
  if (hour < 12) return "Mattina";
  if (hour < 18) return "Pomeriggio";
  return "Sera";
};
