import { useState } from 'react';
import type { InterceptedItem as InterceptedItemType } from '../../shared/types';

interface Props {
  item: InterceptedItemType;
  /** When set, the big price shows this cart total instead of the item's own price. */
  total?: number;
  /** Total number of line items in the order (title gets a "+ N more" suffix when > 1). */
  itemCount?: number;
}

export default function InterceptedItemCard({ item, total, itemCount }: Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-white rounded-card shadow-md p-6 flex gap-5 items-center">
      {imgError ? (
        <div className="w-40 h-40 rounded-card bg-gray-200 flex-shrink-0" />
      ) : (
        <img
          src={item.image_url}
          alt={item.title}
          onError={() => setImgError(true)}
          className="w-40 h-40 rounded-card object-cover flex-shrink-0"
        />
      )}
      <div className="flex flex-col gap-2 min-w-0">
        <span className="inline-block w-fit px-2 py-0.5 rounded-full bg-gray-100 text-xs capitalize text-gray-600">
          {item.retailer}
        </span>
        <h2 className="text-2xl font-semibold text-gray-900 truncate">{item.title}</h2>
        {(itemCount ?? 1) > 1 && (
          <p className="text-sm text-gray-500 -mt-1">+ {itemCount! - 1} more item{itemCount! > 2 ? 's' : ''} in this order</p>
        )}
        <p className="text-3xl font-bold text-forest">
          ${(total ?? item.price).toFixed(2)}
          {total !== undefined ? (
            <span className="ml-2 text-base font-medium text-gray-500">order total</span>
          ) : (
            (item.quantity ?? 1) > 1 && (
              <span className="ml-2 text-base font-medium text-gray-500">×{item.quantity}</span>
            )
          )}
        </p>
      </div>
    </div>
  );
}
