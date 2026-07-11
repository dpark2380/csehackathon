import { useState } from 'react';
import type { Listing } from '../../shared/types';

interface Props {
  listings: Listing[];
  loading?: boolean;
}

function ListingRow({ listing }: { listing: Listing }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
      {imgError ? (
        <div className="w-16 h-16 rounded-card bg-gray-200 flex-shrink-0" />
      ) : (
        <img
          src={listing.image_url}
          alt={listing.title}
          onError={() => setImgError(true)}
          className="w-16 h-16 rounded-card object-cover flex-shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{listing.title}</p>
        <p className="text-sm text-gray-500 truncate">
          {listing.condition} · {listing.location}
        </p>
        <a
          href={listing.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-forest underline"
        >
          View on eBay →
        </a>
      </div>
      <p className="font-bold text-forest text-right whitespace-nowrap">
        ${listing.price.toFixed(2)}
      </p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="w-16 h-16 rounded-card bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

export default function SecondhandPanel({ listings, loading }: Props) {
  return (
    <div className="bg-white rounded-card shadow-sm p-5">
      <h3 className="uppercase tracking-wide text-sm text-gray-500 mb-4">Same Item, Secondhand</h3>
      {loading ? (
        <div>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : listings.length === 0 ? (
        <p className="text-base text-gray-500">No secondhand listings found.</p>
      ) : (
        <div>
          {listings.map((l, i) => (
            <ListingRow key={`${l.url}-${i}`} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
