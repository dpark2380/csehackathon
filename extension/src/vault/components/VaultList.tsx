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
  if (err) return <div className="w-20 h-20 rounded-card bg-gray-200 flex-shrink-0" />;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      className="w-20 h-20 rounded-card object-cover flex-shrink-0"
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
      <div className="bg-white rounded-card shadow-sm p-8 text-center">
        <p className="text-lg text-gray-500">Nothing in your Vault. Go live your life.</p>
      </div>
    );
  }

  const sorted = [...pending].sort((a, b) => a.intercepted_at - b.intercepted_at);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((interception) => {
        const { item } = interception;
        const mini = miniLabel(interception.intercepted_at, now, holdMs ?? DAY_MS);
        return (
          <button
            key={interception.id}
            type="button"
            onClick={() => onOpen(interception.id)}
            className="w-full text-left bg-white rounded-card shadow-sm p-4 flex gap-4 items-center transition hover:shadow-md hover:-translate-y-0.5"
          >
            <Thumb src={item.image_url} alt={item.title} />
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <span className="inline-block w-fit px-2 py-0.5 rounded-full bg-gray-100 text-xs capitalize text-gray-600">
                {item.retailer}
              </span>
              <p className="truncate text-lg font-medium text-gray-900">
                {item.title}
                {(item.quantity ?? 1) > 1 && (
                  <span className="ml-1 text-sm text-gray-500">×{item.quantity}</span>
                )}
              </p>
              <p className="text-xl font-bold text-forest">
                $
                {(interception.items ?? [item])
                  .reduce((sum, i) => sum + i.price * (i.quantity ?? 1), 0)
                  .toFixed(2)}
                {(interception.items?.length ?? 1) > 1 && (
                  <span className="ml-2 text-sm font-medium text-gray-500">
                    · {interception.items!.length} items
                  </span>
                )}
              </p>
            </div>
            <span
              className={`text-sm font-medium whitespace-nowrap ${
                mini.expired ? 'text-danger' : 'text-gray-500'
              }`}
            >
              {mini.text}
            </span>
          </button>
        );
      })}
    </div>
  );
}
