import React, { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Decision, Tally, VaultStorage } from '../shared/types';
import type { VaultSettings } from '../shared/types';
import {
  applyTheme,
  captureUserIdFromUrl,
  decideInterception,
  ensureSeeded,
  getVault,
  grantBuyPass,
  removeItemFromInterception,
  saveSettings,
} from '../shared/storage';
import { WHITELIST_LABELS, bucketOfItem } from '../shared/categories';
import SettingsPanel from './components/SettingsPanel';
import SpendingTracker from './components/SpendingTracker';
import { api } from './api/client';
import InterceptedItemCard from './components/InterceptedItem';
import OwnedItemsPanel from './components/OwnedItemsPanel';
import SecondhandPanel from './components/SecondhandPanel';
import TrueCostPanel from './components/TrueCostPanel';
import HistoryFeed from './components/HistoryFeed';
import CountdownTimer from './components/CountdownTimer';
import DecisionButtons from './components/DecisionButtons';
import DecisionSummary from './components/DecisionSummary';
import ConfettiOverlay from './components/ConfettiOverlay';
import VaultList from './components/VaultList';

const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY_TALLY: Tally = { dollars_saved: 0, kg_co2_avoided: 0, items_released: 0 };

/** Collapsible card section: keeps the detail page scannable (native <details>, no JS). */
function Section({
  title,
  badge,
  defaultOpen,
  children,
}: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group glass rounded-card open:pb-5"
    >
      <summary className="flex items-center justify-between cursor-pointer select-none list-none px-5 py-4">
        <span className="uppercase tracking-wide text-sm text-gray-500">
          {title}
          {badge !== undefined && badge > 0 && (
            <span className="ml-2 normal-case tracking-normal text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
              {badge}
            </span>
          )}
        </span>
        <span className="text-gray-400 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="px-5">{children}</div>
    </details>
  );
}

function setIdParam(id: string | null): void {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('id', id);
  else url.searchParams.delete('id');
  history.replaceState(null, '', url.toString());
}

export default function App() {
  const [vault, setVault] = useState<VaultStorage | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'vault' | 'tracker' | 'settings'>('vault');
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const [confetti, setConfetti] = useState<{ before: Tally; after: Tally } | null>(null);

  const reload = useCallback(async () => {
    const v = await getVault();
    setVault(v);
    applyTheme(v.settings.theme); // explicit override only; 'system' stays pure CSS
  }, []);

  useEffect(() => {
    (async () => {
      await captureUserIdFromUrl();
      await ensureSeeded();
      await reload();
      setSelectedId(new URL(window.location.href).searchParams.get('id'));
      setReady(true);
    })();
  }, [reload]);

  const selected =
    vault && selectedId
      ? (vault.pending_interceptions.find((p) => p.id === selectedId) ??
        vault.history.find((h) => h.id === selectedId) ??
        null)
      : null;
  const inDetail = selected !== null;
  // History rows carry a `decision`; pending ones don't. Governs whether the detail
  // page shows the live countdown + decide buttons or a read-only "what happened" card.
  const isDecided = selected?.decision !== undefined;
  const item = selected?.item;
  const userId = vault?.user_id;
  const hourlyRate = vault?.settings.hourly_rate ?? 30;
  const holdMs = (vault?.settings.hold_hours ?? 24) * 60 * 60 * 1000;

  // If a selected id no longer matches anything pending, fall back to list view.
  useEffect(() => {
    if (ready && vault && selectedId && !selected && !confetti) {
      setIdParam(null);
      setSelectedId(null);
    }
  }, [ready, vault, selectedId, selected, confetti]);

  // Reset the expired flag whenever we enter a new detail view.
  useEffect(() => {
    if (selected) setExpired(selected.intercepted_at + holdMs <= Date.now());
  }, [selectedId, selected, holdMs]);

  const enabled = inDetail && !!item;
  const category =
    item?.category ?? (item?.retailer === 'shein' ? 'fast_fashion_top' : 'electronics_small');

  const itemCount = selected?.items?.length ?? 1;
  const matchesQ = useQuery({
    // itemCount so removing a line item (which can swap the primary item) refetches.
    queryKey: ['matches', selectedId, itemCount],
    enabled: enabled && !!userId,
    queryFn: () => api.getMatches(userId!, item!),
  });
  const secondhandQ = useQuery({
    queryKey: ['secondhand', selectedId, itemCount],
    enabled,
    // One search per line item (capped at 4), each with its own >=10%-cheaper price cap.
    queryFn: async () => {
      const lineItems = selected!.items ?? [selected!.item];
      return Promise.all(
        lineItems.slice(0, 4).map((i) =>
          api
            .getSecondhand(i.title, i.price)
            .then((r) => ({ itemTitle: i.title, listings: r.listings }))
            .catch(() => ({ itemTitle: i.title, listings: [] }))
        )
      );
    },
  });
  const trueCostQ = useQuery({
    queryKey: ['trueCost', selectedId, itemCount],
    enabled,
    queryFn: () => api.getTrueCost(item!.price, category, hourlyRate),
  });

  const goDetail = useCallback((id: string) => {
    setIdParam(id);
    setSelectedId(id);
  }, []);

  const goList = useCallback(() => {
    setIdParam(null);
    setSelectedId(null);
  }, []);

  const handleRemoveItem = useCallback(
    async (itemIndex: number) => {
      if (!selected) return;
      await removeItemFromInterception(selected.id, itemIndex);
      await reload();
    },
    [selected, reload]
  );

  const handleDecide = useCallback(
    async (decision: Decision, bypassReason?: string) => {
      if (!selected || !vault || busy) return;
      setBusy(true);
      const decidedItem = selected.item;
      // Cart value = sum of per-item price × quantity across all line items.
      const cartDollars = (selected.items ?? [decidedItem]).reduce(
        (sum, i) => sum + i.price * (i.quantity ?? 1),
        0
      );
      const savings = {
        dollars: Math.round(cartDollars * 100) / 100,
        kg_co2: trueCostQ.data?.kg_co2 ?? 0,
      };
      const before = vault.tally;
      const after = await decideInterception(selected.id, decision, savings, bypassReason);

      // Pause interception for this retailer so the sanctioned purchase can complete,
      // and take the user straight back to where they left off (team-approved spec override).
      if (decision === 'buy') {
        await grantBuyPass(decidedItem.retailer);
        if (decidedItem.checkout_url) chrome.tabs.create({ url: decidedItem.checkout_url });
      }

      if (userId) api.logDecision(userId, decidedItem, decision, savings).catch(() => {});

      if (decision === 'release') {
        setConfetti({ before, after });
        setTimeout(async () => {
          await reload();
          setConfetti(null);
          setBusy(false);
          goList();
        }, 2500);
      } else {
        await reload();
        setBusy(false);
        goList();
      }
    },
    [selected, vault, busy, userId, trueCostQ.data, reload, goList]
  );

  if (!ready || !vault) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-500">Loading impulse…</p>
      </div>
    );
  }

  const tally = vault.tally;
  const thisMonth = new Date();
  const monthSpentAnyway = vault.history
    .filter((h) => {
      if (h.decision !== 'buy' || h.decided_at === undefined) return false;
      const d = new Date(h.decided_at);
      return (
        d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
      );
    })
    .reduce((sum, h) => sum + h.item.price, 0);
  const monthSaved = vault.history
    .filter((h) => {
      if (h.decision !== 'release' || h.decided_at === undefined) return false;
      const d = new Date(h.decided_at);
      return (
        d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
      );
    })
    .reduce((sum, h) => sum + (h.estimated_savings?.dollars ?? h.item.price), 0);

  return (
    <div className="min-h-screen font-sans text-gray-900">
      <div className="max-w-6xl mx-auto px-8 py-8 flex flex-col gap-6">
        {inDetail && selected ? (
          <>
            <button
              type="button"
              onClick={goList}
              className="self-start text-sm text-forest font-medium hover:underline"
            >
              ← Back to impulse
            </button>
            <div className="grid lg:grid-cols-5 gap-6 items-start">
              {/* Action rail: what you're buying + the clock + the decision. */}
              <div className="lg:col-span-2 flex flex-col gap-6 lg:sticky lg:top-8">
            {(selected.items?.length ?? 1) > 1 ? (
              <div className="glass rounded-card p-6 flex flex-col gap-2">
                <span className="inline-block w-fit px-2 py-0.5 rounded-full bg-gray-100 text-xs capitalize text-gray-600">
                  {selected.item.retailer}
                </span>
                <p className="text-4xl font-semibold text-forest">
                  $
                  {selected
                    .items!.reduce((sum, i) => sum + i.price * (i.quantity ?? 1), 0)
                    .toFixed(2)}
                  <span className="ml-2 text-base font-medium text-gray-500">order total</span>
                </p>
                <p className="text-sm text-gray-500">
                  {selected.items!.length} items on hold
                </p>
              </div>
            ) : (
              <InterceptedItemCard item={selected.item} />
            )}
            {(selected.items?.length ?? 0) > 1 && (
              <div className="glass rounded-card p-5">
                <h3 className="uppercase tracking-wide text-sm text-gray-500 mb-3">
                  In this order
                </h3>
                {selected.items!.map((i, idx) => (
                  <div
                    key={`${i.title}-${idx}`}
                    className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0"
                  >
                    {i.image_url ? (
                      <img
                        src={i.image_url}
                        alt={i.title}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-200 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-800">{i.title}</p>
                      <p className="text-xs text-gray-500">{WHITELIST_LABELS[bucketOfItem(i)]}</p>
                    </div>
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      ×{i.quantity ?? 1} · ${i.price.toFixed(2)}
                    </span>
                    {!isDecided && selected.items!.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        aria-label={`Remove ${i.title} from this order`}
                        className="text-gray-400 hover:text-danger text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isDecided ? (
              <DecisionSummary record={selected} />
            ) : (
              <>
                <CountdownTimer
                  interceptedAt={selected.intercepted_at}
                  holdMs={holdMs}
                  onExpire={() => setExpired(true)}
                />
                <DecisionButtons expired={expired} onDecide={handleDecide} busy={busy} />
              </>
            )}
              </div>
              {/* Evidence column: everything that argues against the purchase. */}
              <div className="lg:col-span-3 flex flex-col gap-6">
            <Section title="You already own" badge={matchesQ.data?.matches.length} defaultOpen>
              <OwnedItemsPanel
                bare
                matches={matchesQ.data?.matches ?? []}
                loading={matchesQ.isLoading}
              />
            </Section>
            <Section
              title="Same item, secondhand"
              badge={(secondhandQ.data ?? []).reduce((n, g) => n + g.listings.length, 0)}
              defaultOpen
            >
              <SecondhandPanel bare groups={secondhandQ.data ?? []} loading={secondhandQ.isLoading} />
            </Section>
            <Section title="True cost" defaultOpen>
              <TrueCostPanel
                bare
                trueCost={trueCostQ.data}
                loading={trueCostQ.isLoading}
                monthSpent={monthSpentAnyway}
                monthSaved={monthSaved}
              />
            </Section>
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="flex items-center justify-between gap-6">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">impulse</h1>
              {/* iOS segmented control */}
              <div className="glass rounded-full p-1 flex">
                {(
                  [
                    ['vault', 'Held'],
                    ['tracker', 'Spending'],
                    ['settings', 'Settings'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`text-sm font-semibold px-6 py-1.5 rounded-full transition ${
                      tab === key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </header>
            {tab === 'vault' && (
              <>
                <div className="grid grid-cols-2 gap-6">
                  {(
                    [
                      ['Saved', `$${tally.dollars_saved}`],
                      ['Released', `${tally.items_released} items`],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="glass rounded-card p-5">
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      <p className="text-3xl font-semibold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>
                {/* Dashboard split: held items main, money story side. */}
                <div className="grid lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2">
                    <VaultList
                      pending={vault.pending_interceptions}
                      onOpen={goDetail}
                      holdMs={holdMs}
                    />
                  </div>
                  <div className="flex flex-col gap-6">
                    {monthSpentAnyway > 0 && (
                      <div className="bg-tint rounded-card px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-tint-fg">
                          ${monthSpentAnyway.toFixed(2)} bought anyway this month
                        </span>
                        <button
                          type="button"
                          onClick={() => setTab('tracker')}
                          className="text-sm font-medium text-white bg-accent rounded-lg px-3 py-1.5 hover:bg-accent/90"
                        >
                          Review
                        </button>
                      </div>
                    )}
                    <HistoryFeed history={vault.history} onOpen={goDetail} />
                  </div>
                </div>
              </>
            )}
            {tab === 'tracker' && <SpendingTracker history={vault.history} onOpen={goDetail} />}
            {tab === 'settings' && (
              <SettingsPanel
                settings={vault.settings}
                onSave={async (s: VaultSettings) => {
                  await saveSettings(s);
                  await reload();
                }}
              />
            )}
          </>
        )}
      </div>

      <ConfettiOverlay
        fire={confetti !== null}
        tallyBefore={confetti?.before ?? EMPTY_TALLY}
        tallyAfter={confetti?.after ?? EMPTY_TALLY}
      />
    </div>
  );
}
