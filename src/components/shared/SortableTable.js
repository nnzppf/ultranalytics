import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { colors, font, transition as tr } from '../../config/designTokens';

/**
 * useSortable — reusable hook for table sorting.
 * Usage:
 *   const { sorted, sortKey, sortDir, toggleSort, SortIcon } = useSortable(data, 'totalRegs', 'desc');
 */
export function useSortable(data, defaultKey = null, defaultDir = 'desc') {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);

  const sorted = useMemo(() => {
    if (!sortKey || !data) return data || [];
    return [...data].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  return { sorted, sortKey, sortDir, toggleSort };
}

/**
 * SortIcon — small animated sort indicator for table headers.
 */
export function SortIcon({ columnKey, sortKey, sortDir }) {
  const isActive = sortKey === columnKey;
  if (!isActive) {
    return <ChevronsUpDown size={12} color={colors.text.disabled} style={{ opacity: 0.4, marginLeft: 2 }} />;
  }
  const Icon = sortDir === 'asc' ? ChevronUp : ChevronDown;
  return <Icon size={12} color={colors.brand.purple} style={{ marginLeft: 2 }} />;
}

/**
 * Th — sortable table header cell with hover effect.
 */
export function Th({ children, columnKey, sortKey, sortDir, onSort, align = 'left', style }) {
  const sortable = !!columnKey && !!onSort;
  return (
    <th
      onClick={sortable ? () => onSort(columnKey) : undefined}
      style={{
        padding: "8px",
        color: sortKey === columnKey ? colors.brand.purple : colors.text.muted,
        fontWeight: font.weight.medium,
        fontSize: font.size.xs,
        textAlign: align,
        cursor: sortable ? "pointer" : "default",
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: tr.fast,
        ...style,
      }}
      onMouseEnter={sortable ? e => { e.currentTarget.style.color = colors.brand.purple; } : undefined}
      onMouseLeave={sortable ? e => { e.currentTarget.style.color = sortKey === columnKey ? colors.brand.purple : colors.text.muted; } : undefined}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
        {children}
        {sortable && <SortIcon columnKey={columnKey} sortKey={sortKey} sortDir={sortDir} />}
      </span>
    </th>
  );
}
