import { useState } from 'react';
import type { Interception } from '../../shared/types';

interface Props {
  history: Interception[];
  onOpen?: (id: string) => void;
}

function formatDecidedDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function HistoryRow({ record, onOpen }: { record: Interception; onOpen?: (id: string) => void }) {
  const [imgError, setImgError] = useState(false);
  const { item, decision, decided_at, estimated_savings } = record;

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => onOpen?.(record.id)}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) onOpen(record.id);
      }}
      className={`flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0 ${
        onOpen ? 'cursor-pointer transition hover:bg-gray-50/50' : ''
      }`}
    >
      {imgError ? (
        <div className="w-12 h-12 rounded-card bg-gray-200 flex-shrink-0" />
      ) : (
        <img
          src={item.image_url}
          alt={item.title}
          onError={() => setImgError(true)}
          className="w-12 h-12 rounded-card object-cover flex-shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{item.title}</p>
        <p className="text-sm text-gray-500">
          ${item.price.toFixed(2)}
          {decided_at !== undefined ? ` · ${formatDecidedDate(decided_at)}` : ''}
        </p>
      </div>
      {decision === 'release' ? (
        <span className="text-xs rounded-full px-2 py-1 bg-forest/10 text-forest whitespace-nowrap">
          Released · saved ${(estimated_savings?.dollars ?? 0).toFixed(2)}
        </span>
      ) : (
        <div className="flex flex-col items-end gap-1">
          <span
            title={record.bypass_reason ? `Reason given: ${record.bypass_reason}` : undefined}
            className="text-xs rounded-full px-2 py-1 bg-gray-200 text-gray-600 whitespace-nowrap"
          >
            {record.bought_kind === 'whitelisted'
              ? 'Whitelisted'
              : record.bypass_reason
                ? 'Bought early'
                : 'Bought anyway'}
          </span>
          {item.checkout_url && (
            <a
              href={item.checkout_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-forest underline whitespace-nowrap"
            >
              Resume checkout →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryFeed({ history, onOpen }: Props) {
  const sorted = [...history].sort((a, b) => (b.decided_at ?? 0) - (a.decided_at ?? 0));

  return (
    <div className="flex flex-col gap-2">
      <h3 className="uppercase tracking-wide text-xs text-gray-500 font-semibold px-5">History</h3>
      <div className="glass rounded-card px-5 py-2">
        {sorted.length === 0 ? (
          <p className="text-base text-gray-500 py-3">No decisions yet.</p>
        ) : (
          sorted.map((record) => <HistoryRow key={record.id} record={record} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}
