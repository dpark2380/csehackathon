import { useEffect, useState } from 'react';
import type { Interception } from '../../shared/types';

const DAY_MS = 24 * 60 * 60 * 1000;

interface Props {
  pending: Interception[];
  onOpen: (id: string) => void;
  /** Hold duration in ms (from settings.hold_hours); defaults to 24h. */
  holdMs?: number;
}

function miniLabel(
  interceptedAt: number,
  now: number,
  holdMs: number
): { text: string; expired: boolean } {
  const remaining = interceptedAt + holdMs - now;
  if (remaining <= 0) return { text: 'Decision time', expired: true };
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return { text: `${h}h ${String(m).padStart(2, '0')}m left`, expired: false };
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  if (err) return <div className="w-14 h-14 rounded-xl bg-gray-200 flex-shrink-0" />;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
    />
  );
}

export default function VaultList({ pending, onOpen, holdMs }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (pending.length === 0) {
    return (
      <div className="glass rounded-card p-8 text-center">
        <p className="text-lg text-gray-500">Nothing held right now. Go live your life.</p>
      </div>
    );
  }

  const sorted = [...pending].sort((a, b) => a.intercepted_at - b.intercepted_at);
  const hold = holdMs ?? DAY_MS;
  const needsDecision = sorted.filter((i) => now >= i.intercepted_at + hold);
  const onHold = sorted.filter((i) => now < i.intercepted_at + hold);

  // iOS grouped-inset row: hairline separators inside one glass group, chevron affordance.
  const renderRow = (interception: Interception) => {
    const { item } = interception;
    const mini = miniLabel(interception.intercepted_at, now, hold);
    const total = (interception.items ?? [item]).reduce(
      (sum, i) => sum + i.price * (i.quantity ?? 1),
      0
    );
    return (
      <button
        key={interception.id}
        type="button"
        onClick={() => onOpen(interception.id)}
        className="w-full text-left px-5 py-4 flex gap-4 items-center border-b border-gray-200/60 last:border-b-0 transition hover:bg-gray-50/50 active:bg-gray-100/50"
      >
        <Thumb src={item.image_url} alt={item.title} />
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <p className="truncate text-base font-semibold text-gray-900">
            {item.title}
            {(item.quantity ?? 1) > 1 && (
              <span className="ml-1 text-sm font-normal text-gray-500">×{item.quantity}</span>
            )}
          </p>
          <p className="text-sm text-gray-500 capitalize">
            {item.retailer}
            {(interception.items?.length ?? 1) > 1 && ` · ${interception.items!.length} items`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-base font-semibold text-forest">${total.toFixed(2)}</span>
          <span
            className={`text-xs font-medium whitespace-nowrap ${
              mini.expired ? 'text-danger' : 'text-gray-500'
            }`}
          >
            {mini.text}
          </span>
        </div>
        <span className="text-xl text-gray-400" aria-hidden>
          ›
        </span>
      </button>
    );
  };

  const group = (rows: Interception[]) => (
    <div className="glass rounded-card overflow-hidden">{rows.map(renderRow)}</div>
  );

  return (
    <div className="flex flex-col gap-6">
      {needsDecision.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="uppercase tracking-wide text-xs text-danger font-semibold px-5">
            Needs your decision
          </h3>
          {group(needsDecision)}
        </div>
      )}
      {onHold.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="uppercase tracking-wide text-xs text-gray-500 font-semibold px-5">
            On hold
          </h3>
          {group(onHold)}
        </div>
      )}
    </div>
  );
}
