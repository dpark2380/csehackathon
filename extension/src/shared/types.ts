// Single source of truth for extension types. Mirrors backend Pydantic models exactly —
// if you change a shape here, the backend router models must agree.

export type Retailer = 'shein' | 'amazon';
export type Decision = 'release' | 'buy';

/** Scraped from the retailer DOM at interception time. */
export interface InterceptedItem {
  title: string;
  image_url: string;
  /** Per-item price (not order total). */
  price: number;
  retailer: Retailer;
  quantity?: number;
  /** True-cost-table category derived from the title (see shared/categories.ts). */
  category?: string;
  /** Broad spending category from CLIP zero-shot ('unknown' when unclassifiable). */
  broad_category?: string;
  /** Checkout page URL at interception, so Buy Anyway can offer a way back. */
  checkout_url?: string;
}

/** Extension-local record stored in chrome.storage.local. Timestamps are epoch ms. */
export interface Interception {
  id: string;
  /** Primary (first) item — what list cards and the backend /log call use. */
  item: InterceptedItem;
  /** Every line item in the intercepted cart, including the primary. */
  items?: InterceptedItem[];
  intercepted_at: number;
  decision?: Decision;
  decided_at?: number;
  estimated_savings?: EstimatedSavings;
  /** Written justification when the 24h timer was bypassed (gift/time-sensitive). Local only. */
  bypass_reason?: string;
  /** 'whitelisted' when the purchase sailed through un-intercepted (recorded, never held). */
  bought_kind?: 'whitelisted';
}

export interface EstimatedSavings {
  dollars: number;
  kg_co2: number;
}

export interface Tally {
  dollars_saved: number;
  kg_co2_avoided: number;
  items_released: number;
}

// ---- Backend API shapes ----

export interface MatchItem {
  image_url: string;
  title: string;
  purchase_date: string; // YYYY-MM-DD
  retailer: string;
  similarity: number; // 0..1
}

export interface MatchResponse {
  matches: MatchItem[];
}

export interface Listing {
  title: string;
  price: number;
  image_url: string;
  url: string;
  condition: string;
  location: string;
}

export interface SecondhandResponse {
  listings: Listing[];
}

export interface TrueCostResponse {
  work_hours: number;
  water_litres: number;
  kg_co2: number;
}

export interface LogResponse {
  ok: boolean;
  new_tally: Tally;
}

export interface AuthResponse {
  auth_url: string;
}

export interface VaultSettings {
  postcode: string;
  hourly_rate: number;
  /** Hold duration in hours before Buy Anyway unlocks (the "decision time"). */
  hold_hours: number;
  /** Categories that are never intercepted. */
  whitelist_categories: string[];
  /** Carts under this total sail through without interception. 0 disables. */
  min_price: number;
  /** UI theme: 'system' follows prefers-color-scheme with zero JS at load. */
  theme?: 'system' | 'light' | 'dark';
}

// ---- chrome.storage.local schema ----

export interface VaultStorage {
  user_id?: string;
  pending_interceptions: Interception[];
  history: Interception[];
  tally: Tally;
  settings: VaultSettings;
  /** Per-retailer epoch-ms deadline during which interception is paused after a Buy Anyway. */
  buy_pass?: Record<string, number>;
}

// ---- runtime messages ----

export type VaultMessage =
  | { type: 'INTERCEPT'; item: InterceptedItem; items?: InterceptedItem[] }
  | { type: 'PASSTHROUGH'; items: InterceptedItem[]; reason: 'whitelisted' };
