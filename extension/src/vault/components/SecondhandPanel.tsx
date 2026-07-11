import { useState } from 'react';
import type { Listing } from '../../shared/types';

export interface SecondhandGroup {
  itemTitle: string;
  listings: Listing[];
}

interface Props {
  /** One group per line item in the order; listings pre-filtered to >=10% cheaper. */
  groups: SecondhandGroup[];
  loading?: boolean;
  /** Render content only (no card chrome/heading): for use inside a collapsible section. */
  bare?: boolean;
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
      <p className="font-semibold text-forest text-right whitespace-nowrap">
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

export default function SecondhandPanel({ groups, loading, bare }: Props) {
  const nonEmpty = groups.filter((g) => g.listings.length > 0);
  return (
    <div className={bare ? '' : 'bg-white rounded-card border border-gray-200 p-5'}>
      {!bare && (
        <h3 className="uppercase tracking-wide text-sm text-gray-500 mb-1">
          Same Item, Secondhand
        </h3>
      )}
      <p className="text-xs text-gray-400 mb-4">Only listings at least 10% cheaper are shown.</p>
      {loading ? (
        <div>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : nonEmpty.length === 0 ? (
        <p className="text-base text-gray-500">
          No secondhand listings found that beat this price.
        </p>
      ) : (
        nonEmpty.map((group) => (
          <div key={group.itemTitle} className="mb-4 last:mb-0">
            {groups.length > 1 && (
              <p className="text-sm font-medium text-gray-700 truncate mt-2">{group.itemTitle}</p>
            )}
            {group.listings.map((l, i) => (
              <ListingRow key={`${l.url}-${i}`} listing={l} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
