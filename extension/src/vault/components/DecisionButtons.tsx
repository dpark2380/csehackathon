import { useState } from 'react';
import type { Decision } from '../../shared/types';

interface Props {
  expired: boolean;
  onDecide: (d: Decision, bypassReason?: string) => void;
  busy?: boolean;
}

const MIN_REASON_LENGTH = 20;

export default function DecisionButtons({ expired, onDecide, busy }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [unlockedReason, setUnlockedReason] = useState<string | undefined>(undefined);

  const unlocked = expired || unlockedReason !== undefined;
  const buyDisabled = busy || !unlocked;
  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => onDecide('release')}
        className="w-full bg-forest text-white text-lg font-semibold py-4 rounded-card transition hover:bg-forest/90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Release &amp; Save
      </button>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={buyDisabled}
          onClick={() => onDecide('buy', unlockedReason)}
          className="w-full border border-gray-300 text-gray-700 text-base font-medium py-3 rounded-card transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Buy Anyway
        </button>
        {!unlocked && <span className="text-xs text-gray-400">unlocks when the timer ends</span>}
        {!expired && unlockedReason !== undefined && (
          <span className="text-xs text-danger">unlocked early: your reason is on the record</span>
        )}
      </div>

      {!unlocked && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm text-gray-400 underline hover:text-gray-600 self-center"
        >
          Time-sensitive purchase (gift, event)? Unlock early
        </button>
      )}

      {!unlocked && showForm && (
        <div className="bg-white rounded-card border border-gray-200 p-5 flex flex-col gap-3">
          <p className="text-sm text-gray-700 font-medium">
            Before we unlock this: write down who this is for and why it truly can&apos;t wait 24
            hours. Your future self will read this.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. It's Mum's birthday on Saturday and delivery takes 5 days…"
            className="w-full border border-gray-200 rounded-card p-3 text-base focus:outline-none focus:border-forest"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {reasonValid
                ? 'Okay. Take a breath — then decide.'
                : `at least ${MIN_REASON_LENGTH} characters (${reason.trim().length}/${MIN_REASON_LENGTH})`}
            </span>
            <button
              type="button"
              disabled={!reasonValid}
              onClick={() => setUnlockedReason(reason.trim())}
              className="text-sm font-medium text-danger border border-danger/40 rounded-card px-3 py-1.5 hover:bg-danger/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              I&apos;ve thought it through — unlock
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
