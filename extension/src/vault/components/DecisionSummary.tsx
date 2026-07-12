import type { Interception } from '../../shared/types';

function formatDecidedDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Read-only "what happened" card shown in place of the countdown + decide buttons
 * once an interception has already been decided (history detail view). */
export default function DecisionSummary({ record }: { record: Interception }) {
  const { decision, decided_at, estimated_savings, bypass_reason, bought_kind, item } = record;

  const badgeLabel =
    decision === 'release'
      ? 'Released'
      : bought_kind === 'whitelisted'
        ? 'Whitelisted'
        : bypass_reason
          ? 'Bought early'
          : 'Bought anyway';

  return (
    <div className="glass rounded-card p-6 flex flex-col gap-3">
      <span
        className={`inline-block w-fit px-2 py-0.5 rounded-full text-xs font-medium ${
          decision === 'release' ? 'bg-forest/10 text-forest' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {badgeLabel}
      </span>
      {decided_at !== undefined && (
        <p className="text-sm text-gray-500">
          Decided {formatDecidedDateTime(decided_at)}
        </p>
      )}
      {decision === 'release' && (
        <p className="text-lg text-forest font-semibold">
          Saved ${(estimated_savings?.dollars ?? 0).toFixed(2)}
        </p>
      )}
      {bypass_reason && (
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-700">Reason given: </span>
          {bypass_reason}
        </p>
      )}
      {decision === 'buy' && item.checkout_url && (
        <a
          href={item.checkout_url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-forest underline w-fit"
        >
          Resume checkout →
        </a>
      )}
    </div>
  );
}
