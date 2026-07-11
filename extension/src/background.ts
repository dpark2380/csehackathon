// MV3 service worker: seeds demo data on install, handles checkout interception messages.
import type { InterceptedItem, Interception, VaultMessage } from './shared/types';
import {
  addHistoryEntry,
  addPendingInterception,
  ensureSeeded,
  setItemBroadCategories,
} from './shared/storage';
import { api } from './vault/api/client';

// CLIP zero-shot categorisation, fire-and-forget: every failure path (backend down,
// bad image, no image) resolves to 'unknown' per product decision.
async function classifyInterception(it: Interception): Promise<void> {
  const items = it.items ?? [it.item];
  const categories = await Promise.all(
    items.map((i) =>
      i.image_url
        ? api.categorize(i.image_url, i.title).then((r) => r.category).catch(() => 'unknown')
        : Promise.resolve('unknown')
    )
  );
  await setItemBroadCategories(it.id, categories);
}

chrome.runtime.onInstalled.addListener(() => {
  ensureSeeded();
});

async function handleIntercept(
  msg: Extract<VaultMessage, { type: 'INTERCEPT' }>,
  sendResponse: (response: { ok: boolean }) => void
): Promise<void> {
  const it: Interception = {
    id: crypto.randomUUID(),
    item: msg.item,
    items: msg.items ?? [msg.item],
    intercepted_at: Date.now(),
  };
  await addPendingInterception(it);
  void classifyInterception(it); // don't block the Vault tab on the backend round-trip
  await chrome.tabs.create({ url: chrome.runtime.getURL(`src/vault/index.html?id=${it.id}`) });
  sendResponse({ ok: true });
}

// Whitelisted purchases aren't held, but they ARE money spent: record straight to history.
async function handlePassthrough(
  items: InterceptedItem[],
  sendResponse: (response: { ok: boolean }) => void
): Promise<void> {
  const now = Date.now();
  await addHistoryEntry({
    id: crypto.randomUUID(),
    item: items[0],
    items,
    intercepted_at: now,
    decision: 'buy',
    decided_at: now,
    bought_kind: 'whitelisted',
  });
  sendResponse({ ok: true });
}

chrome.runtime.onMessage.addListener((message: VaultMessage, _sender, sendResponse) => {
  if (message.type === 'INTERCEPT') {
    handleIntercept(message, sendResponse);
    return true;
  }
  if (message.type === 'PASSTHROUGH') {
    handlePassthrough(message.items, sendResponse);
    return true;
  }
  return false;
});

export {};
