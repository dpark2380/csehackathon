import { useEffect, useState } from 'react';
import {
  BROAD_COLORS,
  BROAD_COLORS_DARK,
  BROAD_LABELS,
  broadCategorize,
} from '../../shared/categories';
import type { Interception } from '../../shared/types';

/** True when the resolved theme is dark (explicit attr or system), reactive to changes. */
function useIsDarkTheme(): boolean {
  const resolve = () =>
    getComputedStyle(document.documentElement).getPropertyValue('color-scheme').includes('dark');
  const [isDark, setIsDark] = useState(resolve);
  useEffect(() => {
    const update = () => setIsDark(resolve());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    window.addEventListener('vault-themechange', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('vault-themechange', update);
    };
  }, []);
  return isDark;
}

type Period = 'week' | 'month' | 'year';
const PERIOD_MS: Record<Period, number> = {
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};
const PERIOD_LABELS: Record<Period, string> = {
  week: 'last 7 days',
  month: 'last 30 days',
  year: 'last 12 months',
};

interface Props {
  history: Interception[];
  onOpen?: (id: string) => void;
}

interface Row {
  category: string;
  spent: number;
  count: number;
  fraction: number;
}

type BuyKind = 'expired' | 'early' | 'whitelisted';
const KIND_LABELS: Record<BuyKind, string> = {
  expired: 'After the timer ended',
  early: 'Unlocked early (bypass)',
  whitelisted: 'Whitelisted (never held)',
};

function buyKind(h: Interception): BuyKind {
  if (h.bought_kind === 'whitelisted') return 'whitelisted';
  return h.bypass_reason ? 'early' : 'expired';
}

function computeRows(
  history: Interception[],
  period: Period
): {
  rows: Row[];
  totalSpent: number;
  totalCount: number;
  kinds: { kind: BuyKind; spent: number; count: number }[];
  purchases: {
    key: string;
    interceptionId: string;
    title: string;
    qty: number;
    spent: number;
    decided_at: number;
    category: string;
  }[];
} {
  const cutoff = Date.now() - PERIOD_MS[period];
  const byCat = new Map<string, { spent: number; count: number }>();
  const byKind = new Map<BuyKind, { spent: number; count: number }>();
  let totalSpent = 0;
  let totalCount = 0;

  for (const h of history) {
    if (h.decision !== 'buy' || h.decided_at === undefined || h.decided_at < cutoff) continue;
    const kind = buyKind(h);
    for (const item of h.items ?? [h.item]) {
      // CLIP-resolved category wins (including an explicit 'unknown');
      // keyword fallback only for legacy items that predate classification.
      const cat = item.broad_category ?? broadCategorize(item.title);
      const qty = item.quantity ?? 1;
      const spent = item.price * qty;
      const agg = byCat.get(cat) ?? { spent: 0, count: 0 };
      agg.spent += spent;
      agg.count += qty;
      byCat.set(cat, agg);
      const kagg = byKind.get(kind) ?? { spent: 0, count: 0 };
      kagg.spent += spent;
      kagg.count += qty;
      byKind.set(kind, kagg);
      totalSpent += spent;
      totalCount += qty;
    }
  }

  const rows = [...byCat.entries()]
    .map(([category, agg]) => ({
      category,
      ...agg,
      fraction: totalSpent > 0 ? agg.spent / totalSpent : 0,
    }))
    // Rank by spend, but "Other" and "Unknown" always sit last by convention.
    .sort((a, b) => {
      const tail = (c: string) => (c === 'other' ? 1 : c === 'unknown' ? 2 : 0);
      return tail(a.category) - tail(b.category) || b.spent - a.spent;
    });

  const kinds = (['expired', 'early', 'whitelisted'] as BuyKind[])
    .map((kind) => ({ kind, ...(byKind.get(kind) ?? { spent: 0, count: 0 }) }))
    .filter((k) => k.count > 0);

  // Flat itemised list of everything bought in the period, newest first.
  const purchases = history
    .filter((h) => h.decision === 'buy' && h.decided_at !== undefined && h.decided_at >= cutoff)
    .flatMap((h) =>
      (h.items ?? [h.item]).map((item, idx) => ({
        key: `${h.id}-${idx}`,
        interceptionId: h.id,
        title: item.title,
        qty: item.quantity ?? 1,
        spent: item.price * (item.quantity ?? 1),
        decided_at: h.decided_at!,
        category: item.broad_category ?? broadCategorize(item.title),
      }))
    )
    .sort((a, b) => b.decided_at - a.decided_at);

  return { rows, totalSpent, totalCount, kinds, purchases };
}

// Annular-sector path; angles in radians, 12 o'clock start, clockwise.
function slicePath(cx: number, cy: number, rO: number, rI: number, a0: number, a1: number): string {
  // A full-circle slice degenerates (start == end point); nudge it just short.
  const end = a1 - a0 >= 2 * Math.PI ? a1 - 0.0001 : a1;
  const large = end - a0 > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${cx + r * Math.sin(a)} ${cy - r * Math.cos(a)}`;
  return [
    `M ${p(rO, a0)}`,
    `A ${rO} ${rO} 0 ${large} 1 ${p(rO, end)}`,
    `L ${p(rI, end)}`,
    `A ${rI} ${rI} 0 ${large} 0 ${p(rI, a0)}`,
    'Z',
  ].join(' ');
}

export default function SpendingTracker({ history, onOpen }: Props) {
  const [period, setPeriod] = useState<Period>('month');
  const [hovered, setHovered] = useState<string | null>(null);
  const isDark = useIsDarkTheme();
  const palette = isDark ? BROAD_COLORS_DARK : BROAD_COLORS;
  const { rows, totalSpent, totalCount, kinds, purchases } = computeRows(history, period);

  const hoveredRow = rows.find((r) => r.category === hovered) ?? null;

  let angle = 0;
  const slices = rows.map((row) => {
    const a0 = angle;
    angle += row.fraction * 2 * Math.PI;
    return { ...row, a0, a1: angle };
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="glass rounded-card p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="uppercase tracking-wide text-sm text-gray-500">Money spent anyway</h3>
        <div className="flex gap-1">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`text-sm px-3 py-1 rounded-full capitalize ${
                p === period ? 'bg-forest text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-base text-gray-500">
          Nothing bought anyway in this period. Your Vault is doing its job.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative flex-shrink-0" style={{ width: 210, height: 210 }}>
            <svg width={210} height={210} viewBox="0 0 210 210" role="img" aria-label="Spending by category">
              {slices.map((s) => (
                <path
                  key={s.category}
                  d={slicePath(105, 105, 100, 70, s.a0, s.a1)}
                  fill={palette[s.category] ?? palette.other}
                  stroke="var(--color-bg-surface)"
                  strokeWidth={2}
                  opacity={hovered === null || hovered === s.category ? 1 : 0.35}
                  onMouseEnter={() => setHovered(s.category)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <title>
                    {`${BROAD_LABELS[s.category]}: $${s.spent.toFixed(2)} (${Math.round(s.fraction * 100)}%)`}
                  </title>
                </path>
              ))}
            </svg>
            {/* Centre readout: total by default, hovered slice on hover. */}
            {/* Keep the readout inside the donut hole (inner r=70 -> ~140px usable). */}
            <div className="absolute inset-0 px-12 flex flex-col items-center justify-center pointer-events-none text-center">
              {hoveredRow ? (
                <>
                  <span className="text-sm text-gray-500">{BROAD_LABELS[hoveredRow.category]}</span>
                  <span className="text-2xl font-semibold text-gray-900">
                    ${hoveredRow.spent.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(hoveredRow.fraction * 100)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-semibold text-gray-900">
                    ${totalSpent.toFixed(totalSpent >= 1000 ? 0 : 2)}
                  </span>
                  <span className="text-xs text-gray-500 leading-tight">
                    {totalCount} item{totalCount === 1 ? '' : 's'}
                  </span>
                  <span className="text-xs text-gray-500 leading-tight">
                    {PERIOD_LABELS[period]}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Legend rows double as the table view (relief for low-contrast hues). */}
          <div className="flex-1 min-w-[220px]">
            {rows.map((row) => (
              <div
                key={row.category}
                onMouseEnter={() => setHovered(row.category)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center gap-3 py-2.5 px-2 -mx-2 rounded border-b border-gray-100 last:border-b-0 ${
                  hovered === row.category ? 'bg-gray-50' : ''
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: palette[row.category] ?? palette.other }}
                />
                <span className="text-base text-gray-800 flex-1">
                  {BROAD_LABELS[row.category] ?? row.category}
                </span>
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {row.count} item{row.count === 1 ? '' : 's'} ·{' '}
                  <span className="font-semibold text-gray-900">${row.spent.toFixed(2)}</span> ·{' '}
                  {Math.round(row.fraction * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>

      {purchases.length > 0 && (
        <div className="glass rounded-card p-6 flex flex-col gap-4">
        <div>
          <h4 className="uppercase tracking-wide text-xs text-gray-500 mb-2">
            Everything you bought
          </h4>
          {purchases.map((p) => (
            <div
              key={p.key}
              role={onOpen ? 'button' : undefined}
              tabIndex={onOpen ? 0 : undefined}
              onClick={() => onOpen?.(p.interceptionId)}
              onKeyDown={(e) => {
                if (onOpen && (e.key === 'Enter' || e.key === ' ')) onOpen(p.interceptionId);
              }}
              className={`flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0 ${
                onOpen ? 'cursor-pointer transition hover:bg-gray-50/50' : ''
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: palette[p.category] ?? palette.other }}
                title={BROAD_LABELS[p.category] ?? p.category}
              />
              <p className="truncate flex-1 text-sm text-gray-800">{p.title}</p>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {new Date(p.decided_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                })}
                {p.qty > 1 ? ` · ×${p.qty}` : ''} ·{' '}
                <span className="font-semibold text-gray-900">${p.spent.toFixed(2)}</span>
              </span>
            </div>
          ))}
        </div>

        {kinds.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <h4 className="uppercase tracking-wide text-xs text-gray-500 mb-2">How it was bought</h4>
          {kinds.map((k) => (
            <div
              key={k.kind}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
            >
              <span className="text-sm text-gray-800">{KIND_LABELS[k.kind]}</span>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {k.count} item{k.count === 1 ? '' : 's'} ·{' '}
                <span className="font-semibold text-gray-900">${k.spent.toFixed(2)}</span>
              </span>
            </div>
          ))}
        </div>
        )}
        </div>
      )}
    </div>
  );
}
