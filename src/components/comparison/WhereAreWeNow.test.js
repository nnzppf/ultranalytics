import { render, screen } from '@testing-library/react';
import WhereAreWeNow from './WhereAreWeNow';
import { computeWhereAreWeNow } from '../../utils/comparisonEngine';
import { daysBeforeEvent } from '../../utils/eventTime';

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks
beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

const PATTERN = [[-72, 0.05], [-50, 0.05], [-30, 0.1], [-20, 0.1], [-6, 0.1], [12, 0.1], [14, 0.1], [18, 0.15], [21, 0.15], [23, 0.05], [24.5, 0.05]];
const at = (eventDate, hours) => new Date(eventDate.getTime() + hours * 3600000);

function edition(label, eventDate, total, until = Infinity, attended = false) {
  const rows = [];
  for (const [hours, share] of PATTERN) {
    if (hours > until) continue;
    for (let i = 0; i < Math.round(total * share); i++) {
      const purchaseDate = at(eventDate, hours);
      rows.push({ brand: 'ROOKIE', editionLabel: label, eventDate, purchaseDate, daysBefore: daysBeforeEvent(purchaseDate, eventDate), attended });
    }
  }
  return rows;
}

const past = [0, 1, 2, 3].map(n => edition(`0${n + 1}.06.26`, new Date(2026, 5, 1 + 7 * n), 200 + 50 * n, Infinity, n !== 3));
const target = new Date(2026, 9, 10);

it('shows an upcoming edition with data time, projection range and no crash', () => {
  const data = computeWhereAreWeNow([...past.flat(), ...edition('10.10.26', target, 300, -6)], 'ROOKIE', '10.10.26', null, { now: at(target, -5) });
  render(<WhereAreWeNow comparisonData={data} />);
  expect(screen.getByText('Proiezione finale')).toBeInTheDocument();
  expect(screen.getByText(/su 4 edizioni/)).toBeInTheDocument();
  expect(screen.getByText(/Dati alle/)).toBeInTheDocument();
  expect(screen.getByText(/A -1gg \(18:00\)/)).toBeInTheDocument();
});

it('shows a concluded edition, with n.d. conversion for an edition without scans', () => {
  // '04.06.26' is the edition without scans
  const data = computeWhereAreWeNow(past.flat(), 'ROOKIE', '04.06.26', null, { now: new Date(2026, 9, 1) });
  render(<WhereAreWeNow comparisonData={data} />);
  expect(screen.getByText('Riepilogo edizione')).toBeInTheDocument();
  expect(screen.queryByText('Proiezione finale')).not.toBeInTheDocument();
  expect(screen.getAllByText('n.d.').length).toBeGreaterThan(0);
});
