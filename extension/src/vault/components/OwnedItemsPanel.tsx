import { useState } from 'react';
import type { MatchItem } from '../../shared/types';

interface Props {
  matches: MatchItem[];
  loading?: boolean;
}

function formatPurchaseDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `Bought ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

function MatchCard({ match }: { match: MatchItem }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <div className="relative aspect-square rounded-card overflow-hidden bg-gray-100">
        {imgError ? (
          <div className="w-full h-full bg-gray-200" />
        ) : (
          <img
            src={match.image_url}
            alt={match.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        )}
        <span className="absolute top-2 right-2 bg-forest text-white text-xs rounded-full px-2 py-0.5">
          {Math.round(match.similarity * 100)}% match
        </span>
      </div>
      <p className="truncate font-medium text-gray-900">{match.title}</p>
      <p className="text-sm text-gray-500 truncate capitalize">
        {formatPurchaseDate(match.purchase_date)} · {match.retailer}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-1">
      <div className="aspect-square rounded-card bg-gray-200 animate-pulse" />
      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
      <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

export default function OwnedItemsPanel({ matches, loading }: Props) {
  return (
    <div className="bg-white rounded-card shadow-sm p-5">
      <h3 className="uppercase tracking-wide text-sm text-gray-500 mb-4">You Already Own</h3>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : matches.length === 0 ? (
        <p className="text-base text-gray-500">No similar items found in your history.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {matches.map((m, i) => (
            <MatchCard key={`${m.title}-${i}`} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
