import { useState } from 'react';
import type { Interception } from '../../shared/types';

interface Props {
  history: Interception[];
}

function formatDecidedDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function HistoryRow({ record }: { record: Interception }) {
  const [imgError, setImgError] = useState(false);
  const { item, decision, decided_at, estimated_savings } = record;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
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

export default function HistoryFeed({ history }: Props) {
  const sorted = [...history].sort((a, b) => (b.decided_at ?? 0) - (a.decided_at ?? 0));

  return (
    <div className="bg-white rounded-card border border-gray-200 p-5">
      <h3 className="uppercase tracking-wide text-sm text-gray-500 mb-4">History</h3>
      {sorted.length === 0 ? (
        <p className="text-base text-gray-500">No decisions yet.</p>
      ) : (
        <div>
          {sorted.map((record) => (
            <HistoryRow key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}
