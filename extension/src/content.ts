// Checkout interception content script.
import { categorize, whitelistBucket } from './shared/categories';
import type { InterceptedItem, Retailer, VaultMessage } from './shared/types';

interface SiteConfig {
  retailer: Retailer;
  buttonSelectors: string[];
  /** Selectors for per-line-item containers, tried in order; first that yields items wins. */
  itemRows: string[];
  fields: { title: string[]; price: string[]; image: string[] };
}

const SITE_CONFIGS: Record<string, SiteConfig> = {
  'shein.com': {
    retailer: 'shein',
    buttonSelectors: [
      'button[fsp-key="pay-btn"]', // live AU checkout, verified 2026-07-11
      'button.PayBtnBox__pay-btn',
      'button[data-btn-name="Place Order"]',
      'button.j-place-order',
      '.place-order-button-effiency',
    ],
    itemRows: [
      '.item-row', // local test harness
      '[class*="shopping-bag"] [class*="item"]',
      'swiper-slide',
    ],
    fields: {
      title: ['.product-name', '.goods-name', '[class*="product-title"]'],
      price: [
        '.checkout-price-detail__total-amount', // live AU checkout order total, verified 2026-07-11
        '.checkout-sbs__common__price-num',
        '.total-price',
        '[class*="total"] [class*="price"]',
        '.summary-price',
      ],
      image: [
        '.checkout-component__swiper-container img', // live AU checkout bag carousel
        'swiper-slide img',
        '[class*="shopping_bag"] img',
        '.product-image img',
        '[class*="goods"] img',
        '.order-summary img',
      ],
    },
  },
  'amazon.com.au': {
    retailer: 'amazon',
    buttonSelectors: [
      'input[name="placeYourOrder1"]',
      '#placeYourOrder',
      '#submitOrderButtonId',
      'input[aria-labelledby*="submitOrderButton"]',
    ],
    itemRows: [
      '[data-csa-c-slot-id="checkout-item-block-itemBlock"]', // live AU checkout, verified 2026-09-11
      '[data-component="lineItem"]',
      '.lineitem',
      '[class*="line-item"]',
      '[data-testid*="line-item"]',
      '[class*="item-row"]',
    ],
    fields: {
      title: ['.a-truncate-full', '[data-component="itemTitle"]', '.lineitem-title-text'],
      price: [
        '#subtotals-marketplace-table .grand-total-price',
        '.grand-total-price',
        '#orderTotal',
      ],
      image: ['[data-component="itemImage"] img', '.lineitem-image', '#spc-orders img'],
    },
  },
};

// Local test harness + demo-day fallback (extension/test-checkout/, served on :9999)
// mimics Shein's checkout markup, so it reuses the Shein config.
SITE_CONFIGS['localhost'] = SITE_CONFIGS['shein.com'];

function getSiteConfig(): SiteConfig | null {
  const host = window.location.hostname;
  for (const key of Object.keys(SITE_CONFIGS)) {
    if (host.includes(key)) return SITE_CONFIGS[key];
  }
  return null;
}

function parsePrice(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function firstMatchText(selectors: string[]): string {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent && el.textContent.trim()) return el.textContent.trim();
  }
  return '';
}

function firstMatchImageEl(selectors: string[]): HTMLImageElement | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel) as HTMLImageElement | null;
    if (el && el.src) return el;
  }
  return null;
}

// Generic fallbacks for when retailer-specific selectors drift.
function genericTotalPrice(): number {
  const m = document.body.innerText.match(
    /(?:grand total|order total|total)[^$]{0,40}\$\s*([\d,]+(?:\.\d{2})?)/i
  );
  return m ? parsePrice(m[1]) : 0;
}

function largestProductImage(): HTMLImageElement | null {
  let best: HTMLImageElement | null = null;
  let bestArea = 0;
  for (const img of document.querySelectorAll('img')) {
    const r = img.getBoundingClientRect();
    // Product thumbnails, not icons/logos: reasonably square and at least 50px.
    if (r.width >= 50 && r.height >= 50 && r.width / Math.max(r.height, 1) < 3 && img.src) {
      const area = r.width * r.height;
      if (area > bestArea) {
        bestArea = area;
        best = img;
      }
    }
  }
  return best;
}

function extractItem(config: SiteConfig): InterceptedItem {
  const img = firstMatchImageEl(config.fields.image) ?? largestProductImage();
  // Shein's checkout shows products as a thumbnail carousel: the title only exists as image alt.
  const title = firstMatchText(config.fields.title) || img?.alt?.trim() || 'Unknown item';
  const price = parsePrice(firstMatchText(config.fields.price)) || genericTotalPrice();
  return {
    title,
    price,
    image_url: img?.src ?? '',
    retailer: config.retailer,
    category: categorize(title),
    checkout_url: window.location.href,
  };
}

// Per-line-item extraction: image + title from the row, price/qty from row text patterns.
function extractRowItem(row: Element, config: SiteConfig): InterceptedItem | null {
  const img = row.querySelector('img') as HTMLImageElement | null;
  const text = (row as HTMLElement).innerText ?? row.textContent ?? '';
  const title =
    row
      .querySelector('.lineitem-title-text, .product-name, .item-title, [class*="title"]')
      ?.textContent?.trim() ||
    img?.alt?.trim() ||
    '';
  if (!title && !img?.src) return null;
  const priceM = text.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  // Qty formats: "Qty: 2" / "Quantity 2" (generic), a bare number on the line after
  // "Change quantity of …" (Amazon AU), or "×2" (Shein badges).
  const qtyM =
    text.match(/(?:qty|quantity)[.:\s]+(\d+)\b/i) ??
    text.match(/change quantity[^\n]*\n\s*(\d+)\b/i) ??
    text.match(/[x×]\s*(\d+)\b/);
  return {
    title: title || 'Unknown item',
    image_url: img?.src ?? '',
    price: priceM ? parsePrice(priceM[1]) : 0,
    quantity: qtyM ? parseInt(qtyM[1], 10) : 1,
    retailer: config.retailer,
    category: categorize(title),
    checkout_url: window.location.href,
  };
}

function extractItems(config: SiteConfig): InterceptedItem[] {
  for (const rowSel of config.itemRows) {
    const rows = [...document.querySelectorAll(rowSel)];
    const items = rows
      .map((r) => extractRowItem(r, config))
      .filter((i): i is InterceptedItem => i !== null);
    // Dedupe (carousels clone slides): key by title+image.
    const seen = new Set<string>();
    const unique = items.filter((i) => {
      const key = `${i.title}|${i.image_url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (unique.length > 0 && unique.some((i) => i.title !== 'Unknown item')) return unique;
  }
  // Single-item fallback: no row selector matched. Self-harvest the likely line-item
  // containers (climb up from product-sized images) so the selectors can be fixed.
  console.log('[vault] no line-item rows matched — single-item fallback. Container dump:');
  const seen = new Set<Element>();
  [...document.querySelectorAll('img')]
    .filter((img) => {
      const r = img.getBoundingClientRect();
      return r.width >= 40 && r.height >= 40;
    })
    .slice(0, 5)
    .forEach((img, n) => {
      let el: Element = img;
      for (let k = 0; k < 4 && el.parentElement; k++) el = el.parentElement;
      if (seen.has(el)) return;
      seen.add(el);
      console.log(`[vault] container ${n} >>>`, (el as HTMLElement).outerHTML.slice(0, 500));
    });
  return [extractItem(config)];
}

// Buy-anyway pass: after the user chooses Buy Anyway in the Vault, interception for that
// retailer pauses so they can actually complete the purchase. Kept in a sync-readable
// mirror because handleCheckout must decide before preventDefault (no awaits possible).
let buyPass: Record<string, number> = {};
// Settings mirror for the same reason: whitelist/min-price checks are sync at click time.
let liveSettings = { min_price: 0, whitelist_categories: [] as string[] };
chrome.storage.local.get(['buy_pass', 'settings']).then((v) => {
  buyPass = (v.buy_pass as Record<string, number>) ?? {};
  if (v.settings) liveSettings = { ...liveSettings, ...v.settings };
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.buy_pass) buyPass = (changes.buy_pass.newValue as Record<string, number>) ?? {};
  if (changes.settings) liveSettings = { ...liveSettings, ...changes.settings.newValue };
});

function showToast(): void {
  const toast = document.createElement('div');
  toast.textContent = 'Sent to impulse for a mindfulness check.';
  Object.assign(toast.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: '2147483647',
    background: '#2456C4',
    color: '#fff',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
    transition: 'opacity 0.5s ease',
    opacity: '1',
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 2000);
}

function makeHandleCheckout(config: SiteConfig) {
  return function handleCheckout(e: Event): void {
    // Shein preloads /checkout in hidden iframes and fires synthetic clicks in them.
    // Only real user clicks (isTrusted) in a visible frame count as a purchase attempt.
    if (!e.isTrusted || document.hidden || window.innerWidth === 0) return;
    const passUntil = buyPass[config.retailer];
    if (passUntil && Date.now() < passUntil) {
      console.log('[vault] buy-anyway pass active — allowing this purchase through');
      return;
    }
    // Extraction is sync DOM reads, so it can run before deciding whether to block.
    const items = extractItems(config);
    const total = items.reduce((sum, i) => sum + i.price * (i.quantity ?? 1), 0);
    if (liveSettings.min_price > 0 && total > 0 && total < liveSettings.min_price) {
      console.log(`[vault] cart total $${total.toFixed(2)} below min price — allowing through`);
      return;
    }
    const wl = liveSettings.whitelist_categories;
    if (wl.length > 0 && items.every((i) => wl.includes(whitelistBucket(i.title)))) {
      console.log('[vault] all items in whitelisted categories — allowing through (recorded)');
      const passthrough: VaultMessage = { type: 'PASSTHROUGH', items, reason: 'whitelisted' };
      chrome.runtime.sendMessage(passthrough);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (items.some((i) => i.title === 'Unknown item' || i.price === 0 || !i.image_url)) {
      logExtractionCandidates(config);
    }
    showToast();
    const message: VaultMessage = { type: 'INTERCEPT', item: items[0], items };
    chrome.runtime.sendMessage(message);
  };
}

// When extraction fails, dump likely order-summary nodes so selector fixes need no manual digging.
function logExtractionCandidates(config?: SiteConfig): void {
  console.log(`[vault] extraction incomplete in ${location.href}`);
  if (config) {
    for (const rowSel of config.itemRows) {
      const rows = document.querySelectorAll(rowSel);
      if (rows.length > 0) {
        console.log(`[vault] ${rows.length} row(s) for ${rowSel}:`);
        [...rows].slice(0, 3).forEach((r, i) =>
          console.log(`[vault] row ${i} >>>`, (r as HTMLElement).outerHTML.slice(0, 400))
        );
        break;
      }
    }
  }
  for (const sel of [
    '[class*="summary"]',
    '[class*="goods"]',
    '[class*="product"]',
    '[class*="total"]',
    '[class*="price"]',
    '[id*="subtotal"]',
    '[class*="grand"]',
    '[class*="lineitem"]',
    '[class*="item-image"]',
  ]) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) console.log(`[vault] candidate ${sel} >>>`, el.outerHTML.slice(0, 400));
  }
}

// Recursively collect shadow roots so retailer web components can't hide the button.
function collectShadowRoots(root: ParentNode, out: ShadowRoot[] = []): ShadowRoot[] {
  for (const el of root.querySelectorAll('*')) {
    const sr = (el as HTMLElement).shadowRoot;
    if (sr) {
      out.push(sr);
      collectShadowRoots(sr, out);
    }
  }
  return out;
}

const ORDER_TEXT = /place\s*(your\s*)?order/i;

function findOrderButtons(config: SiteConfig): HTMLElement[] {
  const roots: ParentNode[] = [document, ...collectShadowRoots(document)];
  const found = new Set<HTMLElement>();
  for (const root of roots) {
    for (const sel of config.buttonSelectors) {
      root.querySelectorAll(sel).forEach((b) => found.add(b as HTMLElement));
    }
    // Text fallback: survives retailer class/attribute churn entirely.
    root.querySelectorAll('button, input[type="submit"]').forEach((el) => {
      const text = (el.textContent || (el as HTMLInputElement).value || '').trim();
      if (ORDER_TEXT.test(text)) found.add(el as HTMLElement);
    });
  }
  return [...found];
}

function attachToButtons(config: SiteConfig): void {
  for (const btn of findOrderButtons(config)) {
    if (!btn.hasAttribute('data-vault-attached')) {
      btn.setAttribute('data-vault-attached', 'true');
      btn.addEventListener('click', makeHandleCheckout(config), { capture: true });
      console.log('[vault] ARMED order button:', btn.outerHTML.slice(0, 200));
    }
  }
}

function init(): void {
  const config = getSiteConfig();
  if (!config) return;
  const frame = window.self === window.top ? 'top frame' : 'iframe';
  console.log(`[vault] v3 active in ${frame}: ${window.location.href}`);

  attachToButtons(config);

  // Deep scans walk the whole tree, so debounce the observer instead of scanning per-mutation.
  let scanQueued = false;
  const observer = new MutationObserver(() => {
    if (scanQueued) return;
    scanQueued = true;
    setTimeout(() => {
      scanQueued = false;
      attachToButtons(config);
    }, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

init();

export {};
