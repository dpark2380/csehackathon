// Typed wrappers over chrome.storage.local implementing the VaultStorage schema.
import type {
  Decision,
  EstimatedSavings,
  Interception,
  Tally,
  VaultSettings,
  VaultStorage,
} from './types';

const DEFAULT_TALLY: Tally = { dollars_saved: 0, kg_co2_avoided: 0, items_released: 0 };
export const DEFAULT_SETTINGS: VaultSettings = {
  postcode: '2033',
  hourly_rate: 30,
  hold_hours: 24,
  whitelist_categories: [],
  min_price: 0,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Reads whole storage, filling in defaults for any missing keys. */
export async function getVault(): Promise<VaultStorage> {
  const raw = (await chrome.storage.local.get([
    'user_id',
    'pending_interceptions',
    'history',
    'tally',
    'settings',
    'buy_pass',
  ])) as Partial<VaultStorage>;

  return {
    user_id: raw.user_id,
    pending_interceptions: raw.pending_interceptions ?? [],
    history: raw.history ?? [],
    tally: raw.tally ?? { ...DEFAULT_TALLY },
    // Per-field merge so settings saved before a schema addition still get new defaults.
    settings: { ...DEFAULT_SETTINGS, ...raw.settings },
    buy_pass: raw.buy_pass ?? {},
  };
}

export async function saveSettings(settings: VaultSettings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

/** After a Buy Anyway: pause interception for this retailer so the user can complete checkout. */
export async function grantBuyPass(retailer: string, minutes = 30): Promise<void> {
  const { buy_pass } = await getVault();
  await chrome.storage.local.set({
    buy_pass: { ...buy_pass, [retailer]: Date.now() + minutes * 60 * 1000 },
  });
}

export async function setVault(patch: Partial<VaultStorage>): Promise<void> {
  await chrome.storage.local.set(patch);
}

export async function getUserId(): Promise<string | undefined> {
  const { user_id } = (await chrome.storage.local.get('user_id')) as { user_id?: string };
  return user_id;
}

export async function setUserId(id: string): Promise<void> {
  await chrome.storage.local.set({ user_id: id });
}

/** Reads `user_id` from the current page's query string; persists it if present. */
export async function captureUserIdFromUrl(): Promise<string | undefined> {
  const fromUrl = new URLSearchParams(window.location.search).get('user_id');
  if (fromUrl) {
    await setUserId(fromUrl);
    return fromUrl;
  }
  return getUserId();
}

export async function addPendingInterception(i: Interception): Promise<void> {
  const vault = await getVault();
  vault.pending_interceptions.push(i);
  await setVault({ pending_interceptions: vault.pending_interceptions });
}

/**
 * Moves an interception from pending_interceptions to history, recording the decision.
 * Increments the local tally on 'release'. The backend /log call happens separately
 * in the UI layer — this tally is extension-local by design (seeded demo state).
 */
export async function decideInterception(
  id: string,
  decision: Decision,
  savings: EstimatedSavings,
  bypassReason?: string
): Promise<Tally> {
  const vault = await getVault();
  const idx = vault.pending_interceptions.findIndex((p) => p.id === id);
  if (idx === -1) {
    return vault.tally;
  }
  const [interception] = vault.pending_interceptions.splice(idx, 1);
  interception.decision = decision;
  interception.decided_at = Date.now();
  interception.estimated_savings = savings;
  if (bypassReason) interception.bypass_reason = bypassReason;
  vault.history.push(interception);

  let tally = vault.tally;
  if (decision === 'release') {
    tally = {
      dollars_saved: round2(vault.tally.dollars_saved + savings.dollars),
      kg_co2_avoided: round1(vault.tally.kg_co2_avoided + savings.kg_co2),
      items_released: vault.tally.items_released + 1,
    };
  }

  await setVault({
    pending_interceptions: vault.pending_interceptions,
    history: vault.history,
    tally,
  });

  return tally;
}

/** Demo starting state. A function (not a const) so timestamps are computed at seed time. */
export function demoSeed(): VaultStorage {
  const now = Date.now();
  return {
    tally: { dollars_saved: 180, kg_co2_avoided: 9, items_released: 4 },
    settings: { ...DEFAULT_SETTINGS },
    pending_interceptions: [
      {
        id: 'demo-pending-1',
        item: {
          title: 'Ripped Skinny Jeans',
          image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80',
          price: 42.95,
          retailer: 'shein',
        },
        intercepted_at: now - 13 * 60 * 1000,
      },
      {
        id: 'demo-pending-2',
        item: {
          title: 'Wireless Bluetooth Headphones',
          image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
          price: 89.0,
          retailer: 'amazon',
        },
        // Past the 24h hold: demos the expired "decision time" state with Buy Anyway unlocked.
        intercepted_at: now - 25 * 60 * 60 * 1000,
      },
    ],
    history: [
      {
        id: 'demo-history-1',
        item: {
          title: 'Floral Wrap Dress',
          image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80',
          price: 35.5,
          retailer: 'shein',
        },
        intercepted_at: now - 3 * 24 * 60 * 60 * 1000,
        decision: 'release',
        decided_at: now - 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000,
        estimated_savings: { dollars: 35.5, kg_co2: 4.2 },
      },
      {
        id: 'demo-history-2',
        item: {
          title: 'Portable Phone Charger',
          image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80',
          price: 24.0,
          retailer: 'amazon',
        },
        intercepted_at: now - 5 * 24 * 60 * 60 * 1000,
        decision: 'buy',
        decided_at: now - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000,
      },
    ],
    buy_pass: {},
  };
}

/** Overwrites storage with a fresh demo seed, preserving user_id. */
export async function resetDemoData(): Promise<void> {
  const user_id = await getUserId();
  const seed = demoSeed();
  await chrome.storage.local.set({ ...seed, user_id });
}

/** Seeds demo data only on first install (no `tally` key present yet). */
export async function ensureSeeded(): Promise<void> {
  const { tally } = (await chrome.storage.local.get('tally')) as { tally?: Tally };
  if (!tally) {
    await chrome.storage.local.set(demoSeed());
  }
}
