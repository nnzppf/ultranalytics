/** Italian number and date formatting for the new interface. */
export const fmt = (n, digits = 0) =>
  n == null || Number.isNaN(n) ? '–' : Number(n).toLocaleString('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const pct = (n) => (n == null ? 'n.d.' : `${fmt(n, 1)}%`);

const DOW = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MON = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/** "sab 10 ott" */
export const dshort = (d) => (d ? `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` : '–');
/** "10 ott 26" */
export const dmy = (d) => (d ? `${d.getDate()} ${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` : '–');
export const hm = (d) => (d ? d.toLocaleTimeString('it', { hour: '2-digit', minute: '2-digit' }) : '–');

export const deltaClass = (p) => (p == null ? 'nx-flat' : p > 2 ? 'nx-up' : p < -2 ? 'nx-down' : 'nx-flat');
export const signed = (p) => (p == null ? '–' : `${p > 0 ? '+' : ''}${fmt(p)}%`);
export const pctChange = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
