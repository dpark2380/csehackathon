import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface Props {
  interceptedAt: number;
  onExpire?: () => void;
  /** Hold duration in ms (from settings.hold_hours); defaults to 24h. */
  holdMs?: number;
}

export default function CountdownTimer({ interceptedAt, onExpire, holdMs }: Props) {
  const hold = holdMs ?? DAY_MS;
  const expiry = interceptedAt + hold;
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, expiry - now);
  const expired = remaining <= 0;
  const fraction = Math.min(1, Math.max(0, remaining / hold));
  const urgent = remaining < HOUR_MS;

  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true;
      onExpire?.();
    }
  }, [expired, onExpire]);

  // Expired: no ring, just a flat statement that the hold is over.
  if (expired) {
    return (
      <div className="bg-danger/10 rounded-card px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-danger">Time ran out</p>
          <p className="text-sm text-gray-600">The hold is over. Make your call below.</p>
        </div>
        <span className="text-2xl" aria-hidden>
          ⏳
        </span>
      </div>
    );
  }

  const R = 90;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - fraction);
  const color = urgent ? 'var(--color-danger)' : 'var(--color-accent)';

  return (
    <div className="glass rounded-card p-6 flex flex-col items-center">
      <div className="relative" style={{ width: 200, height: 200 }}>
        <svg width={200} height={200} viewBox="0 0 200 200">
          <circle
            cx={100}
            cy={100}
            r={R}
            fill="none"
            style={{ stroke: 'var(--color-ring)' }}
            strokeWidth={12}
          />
          <g transform="rotate(-90 100 100)">
            <motion.circle
              cx={100}
              cy={100}
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={C}
              initial={false}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold tabular-nums text-gray-900">
            {format(remaining)}
          </span>
          <span className="text-sm text-gray-500 mt-1">until decision time</span>
        </div>
      </div>
    </div>
  );
}
