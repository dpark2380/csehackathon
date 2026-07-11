import { useState } from 'react';
import { WHITELIST_KEYS, WHITELIST_LABELS } from '../../shared/categories';
import { applyTheme } from '../../shared/storage';
import type { VaultSettings } from '../../shared/types';

interface Props {
  settings: VaultSettings;
  onSave: (s: VaultSettings) => void;
}

export default function SettingsPanel({ settings, onSave }: Props) {
  const [draft, setDraft] = useState<VaultSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof VaultSettings>(key: K, value: VaultSettings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  const toggleCategory = (cat: string) => {
    set(
      'whitelist_categories',
      draft.whitelist_categories.includes(cat)
        ? draft.whitelist_categories.filter((c) => c !== cat)
        : [...draft.whitelist_categories, cat]
    );
  };

  return (
    <div className="bg-white rounded-card border border-gray-200 p-6 flex flex-col gap-6">
      <h3 className="uppercase tracking-wide text-sm text-gray-500">Settings</h3>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Decision time (hours)</span>
        <input
          type="number"
          min={1}
          max={168}
          value={draft.hold_hours}
          onChange={(e) => set('hold_hours', Math.max(1, Number(e.target.value) || 24))}
          className="w-32 border border-gray-200 rounded-card p-2 text-base focus:outline-none focus:border-forest"
        />
        <span className="text-xs text-gray-400">How long items are held before Buy Anyway unlocks.</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Minimum price to block ($)</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={draft.min_price}
          onChange={(e) => set('min_price', Math.max(0, Number(e.target.value) || 0))}
          className="w-32 border border-gray-200 rounded-card p-2 text-base focus:outline-none focus:border-forest"
        />
        <span className="text-xs text-gray-400">Carts under this total aren&apos;t intercepted. 0 blocks everything.</span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Whitelisted categories</span>
        <span className="text-xs text-gray-400 -mt-1">
          Orders made up entirely of these categories go straight through.
        </span>
        <div className="grid grid-cols-2 gap-2">
          {WHITELIST_KEYS.map((cat) => (
            <label key={cat} className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={draft.whitelist_categories.includes(cat)}
                onChange={() => toggleCategory(cat)}
                className="accent-forest"
              />
              {WHITELIST_LABELS[cat]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Theme</span>
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as const).map((th) => (
            <button
              key={th}
              type="button"
              onClick={() => {
                // Theme applies and persists instantly: no Save press needed.
                const next = { ...draft, theme: th };
                setDraft(next);
                applyTheme(th);
                onSave(next);
              }}
              className={`text-sm px-3 py-1.5 rounded-full capitalize ${
                (draft.theme ?? 'system') === th
                  ? 'bg-forest text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {th}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">System follows your OS preference.</span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Hourly rate ($, for true cost)</span>
        <input
          type="number"
          min={1}
          value={draft.hourly_rate}
          onChange={(e) => set('hourly_rate', Math.max(1, Number(e.target.value) || 30))}
          className="w-32 border border-gray-200 rounded-card p-2 text-base focus:outline-none focus:border-forest"
        />
      </label>

      <button
        type="button"
        onClick={() => {
          onSave(draft);
          setSaved(true);
        }}
        className="self-start bg-forest text-white font-medium px-5 py-2.5 rounded-card hover:bg-forest/90"
      >
        {saved ? 'Saved ✓' : 'Save settings'}
      </button>
    </div>
  );
}
