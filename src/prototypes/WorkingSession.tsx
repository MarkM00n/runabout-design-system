import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';

import { Select } from '../components/Select';
import { Badge } from '../components/Badge';
import sampleCsv from './working-session-data.csv?raw';

// PROTOTYPE — src/prototypes/, not part of the shipped design system. See
// src/prototypes/README.md / docs/design-system-rules.md §9.
//
// A starter for the data-to-prototype working session: any CSV in, a usable
// first view out, on real Runabout components and tokens. It is deliberately
// generic — columns are typed on load (date / number / category / text), and
// the view is driven by CONFIG below, which is the one place to edit live
// once the room has picked one user, one decision and one screen.
//
// Data comes from working-session-data.csv next to this file (swap the file
// to change the default), or from any CSV dropped onto the page.

const CONFIG = {
  title: 'Bookings at a glance',
  lede: 'Where space is booked, where people do not turn up, and what is sitting empty.',
  // Column to group the main chart by. Empty = first sensible category.
  groupBy: 'building',
  // An outcome column and the value to track as a rate (e.g. status = No-show).
  outcome: { column: 'status', value: 'No-show' },
  // Columns offered as filters. Empty = the first three sensible categories.
  filters: ['building', 'space_type', 'tenant'],
  // Number of rows in the table.
  tableRows: 12,
};

// ------------------------------------------------------------------ data
type Row = Record<string, string>;
type Kind = 'date' | 'number' | 'category' | 'text';

function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = '', row: string[] = [], quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

function kindOf(values: string[]): Kind {
  const present = values.filter((v) => v !== '');
  if (!present.length) return 'text';
  const unique = new Set(present).size;
  if (present.every((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) return 'date';
  if (present.every((v) => v !== '' && !Number.isNaN(Number(v)))) return unique <= 12 ? 'category' : 'number';
  return unique <= Math.max(30, present.length * 0.05) ? 'category' : 'text';
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ------------------------------------------------------------ components
function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'warning' }) {
  return (
    <div className="flex flex-col gap-01 rounded-2xl bg-surface-card p-05">
      <span className="font-manrope text-overline uppercase text-text-secondary">{label}</span>
      <span className={`font-manrope text-h3 font-semibold ${tone === 'warning' ? 'text-state-warning' : 'text-text-primary'}`}>{value}</span>
      {note && <span className="font-manrope text-caption text-text-secondary">{note}</span>}
    </div>
  );
}

function Bars({ data, format, highlight }: { data: { label: string; value: number; n: number }[]; format: (v: number) => string; highlight?: number }) {
  const max = Math.max(...data.map((d) => d.value), 0.0001);
  return (
    <ul className="flex flex-col gap-02">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(120px,200px)_1fr_64px] items-center gap-03">
          <span className="truncate font-manrope text-label text-text-primary" title={d.label}>{d.label}</span>
          <span className="h-[12px] rounded-full bg-alpha-ink-10" aria-hidden="true">
            <span
              className={`block h-full rounded-full ${highlight !== undefined && d.value >= highlight ? 'bg-state-warning' : 'bg-action-primary'}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right font-manrope text-label-strong text-text-primary">{format(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ page
export interface WorkingSessionProps {
  csv?: string;
}

export function WorkingSession({ csv = sampleCsv }: WorkingSessionProps) {
  const [source, setSource] = useState({ name: 'working-session-data.csv', text: csv });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);

  const rows = useMemo(() => parseCsv(source.text), [source.text]);
  const columns = useMemo(() => Object.keys(rows[0] ?? {}), [rows]);
  const kinds = useMemo(
    () => Object.fromEntries(columns.map((c) => [c, kindOf(rows.slice(0, 500).map((r) => r[c]))])) as Record<string, Kind>,
    [columns, rows],
  );
  const cats = columns.filter((c) => kinds[c] === 'category' && new Set(rows.map((r) => r[c])).size >= 2);
  const dateCol = columns.find((c) => kinds[c] === 'date');
  const groupBy = columns.includes(CONFIG.groupBy) ? CONFIG.groupBy : cats[0];
  const filterCols = (CONFIG.filters.filter((f) => columns.includes(f)).length ? CONFIG.filters.filter((f) => columns.includes(f)) : cats).slice(0, 3);
  const outcome = columns.includes(CONFIG.outcome.column) ? CONFIG.outcome : null;

  const shown = rows.filter((r) => Object.entries(filters).every(([c, v]) => !v || r[c] === v));
  const isHit = (r: Row) => !!outcome && r[outcome.column] === outcome.value;
  const overallRate = shown.length ? shown.filter(isHit).length / shown.length : 0;

  const byGroup = groupBy
    ? Object.entries(
        shown.reduce<Record<string, { n: number; hit: number }>>((acc, r) => {
          const k = r[groupBy] || '—';
          acc[k] ??= { n: 0, hit: 0 };
          acc[k].n++; if (isHit(r)) acc[k].hit++;
          return acc;
        }, {}),
      ).map(([label, { n, hit }]) => ({ label, n, value: outcome ? hit / n : n }))
        .sort((a, b) => b.value - a.value).slice(0, 10)
    : [];

  const byWeekday = dateCol
    ? WEEKDAYS.map((d) => {
        const inDay = shown.filter((r) => WEEKDAYS[(new Date(r[dateCol]).getDay() + 6) % 7] === d);
        return { label: d, n: inDay.length, value: outcome && inDay.length ? inDay.filter(isHit).length / inDay.length : inDay.length };
      }).filter((d) => d.n > 0)
    : [];

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) file.text().then((text) => { setSource({ name: file.name, text }); setFilters({}); });
  };

  // Table: the columns that matter first (date, group, outcome), then the rest.
  const tableCols = [...new Set([dateCol, groupBy, outcome?.column, ...columns].filter((c): c is string => !!c))].slice(0, 8);

  const fmt = outcome ? pct : (v: number) => v.toLocaleString();
  const metricName = outcome ? `${outcome.value} rate` : 'Rows';

  return (
    <div
      data-mode="cream"
      className="min-h-screen bg-surface-section p-07 text-left"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className={`mx-auto flex max-w-[1200px] flex-col gap-06 ${dragging ? 'opacity-50' : ''}`}>
        <header className="flex flex-wrap items-end justify-between gap-04">
          <div className="flex max-w-[720px] flex-col gap-02">
            <h1 className="font-recoleta text-h3 font-normal tracking-normal text-text-primary">{CONFIG.title}</h1>
            <p className="font-manrope text-paragraph-large text-text-secondary">{CONFIG.lede}</p>
          </div>
          <p className="font-manrope text-caption text-text-secondary">
            {source.name} · {rows.length.toLocaleString()} rows · drop a CSV anywhere to swap the data
          </p>
        </header>

        {filterCols.length > 0 && (
          <div className="flex flex-wrap gap-03" role="group" aria-label="Filters">
            {filterCols.map((c) => (
              <label key={c} className="flex min-w-[220px] flex-col gap-01">
                <span className="font-manrope text-label font-semibold capitalize text-text-primary">{c.replace(/_/g, ' ')}</span>
                <Select size="small" value={filters[c] ?? ''} onChange={(e) => setFilters({ ...filters, [c]: e.target.value })}>
                  <option value="">All</option>
                  {[...new Set(rows.map((r) => r[c]))].sort().map((v) => <option key={v} value={v}>{v || '—'}</option>)}
                </Select>
              </label>
            ))}
          </div>
        )}

        <section className="grid grid-cols-1 gap-04 md:grid-cols-3" aria-label="Summary">
          <Tile label="Rows" value={shown.length.toLocaleString()} note={shown.length === rows.length ? 'Everything' : `of ${rows.length.toLocaleString()}`} />
          {outcome && <Tile label={metricName} value={pct(overallRate)} note={`${shown.filter(isHit).length.toLocaleString()} ${outcome.value.toLowerCase()}s`} tone={overallRate >= 0.1 ? 'warning' : undefined} />}
          {byGroup[0] && <Tile label={`Highest ${outcome ? 'rate' : 'volume'}`} value={byGroup[0].label} note={outcome ? `${fmt(byGroup[0].value)} across ${byGroup[0].n} rows` : `${byGroup[0].n} rows, the most of any ${groupBy.replace(/_/g, ' ')}`} />}
        </section>

        <section className="grid grid-cols-1 gap-04 lg:grid-cols-2">
          {groupBy && (
            <div className="flex flex-col gap-04 rounded-2xl bg-surface-card p-05">
              <h2 className="font-manrope text-h6 font-semibold text-text-primary">{metricName} by {groupBy.replace(/_/g, ' ')}</h2>
              <Bars data={byGroup} format={fmt} highlight={outcome ? overallRate * 2 : undefined} />
            </div>
          )}
          {byWeekday.length > 0 && (
            <div className="flex flex-col gap-04 rounded-2xl bg-surface-card p-05">
              <h2 className="font-manrope text-h6 font-semibold text-text-primary">{metricName} by day of week</h2>
              <Bars data={byWeekday} format={fmt} highlight={outcome ? overallRate * 2 : undefined} />
            </div>
          )}
        </section>

        <section className="flex flex-col gap-03 rounded-2xl bg-surface-card p-05">
          <h2 className="font-manrope text-h6 font-semibold text-text-primary">The rows behind it</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-manrope text-label">
              <thead>
                <tr className="border-b border-border-default text-left text-text-secondary">
                  {tableCols.map((c) => <th key={c} scope="col" className="px-02 py-02 font-semibold capitalize">{c.replace(/_/g, ' ')}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, CONFIG.tableRows).map((r, i) => (
                  <tr key={i} className="border-b border-border-subtle text-text-primary">
                    {tableCols.map((c) => (
                      <td key={c} className="px-02 py-02">
                        {outcome && c === outcome.column ? <Badge size="small" variant={isHit(r) ? 'warning' : 'neutral'}>{r[c]}</Badge> : r[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
