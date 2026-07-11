// MV3 service worker: seeds demo data on install, handles checkout interception messages.
import type { Interception, VaultMessage } from './shared/types';
import { addPendingInterception, ensureSeeded } from './shared/storage';

chrome.runtime.onInstalled.addListener(() => {
  ensureSeeded();
});

async function handleIntercept(
  msg: VaultMessage,
  sendResponse: (response: { ok: boolean }) => void
): Promise<void> {
  const it: Interception = {
    id: crypto.randomUUID(),
    item: msg.item,
    items: msg.items ?? [msg.item],
    intercepted_at: Date.now(),
  };
  await addPendingInterception(it);
  await chrome.tabs.create({ url: chrome.runtime.getURL(`src/vault/index.html?id=${it.id}`) });
  sendResponse({ ok: true });
}

chrome.runtime.onMessage.addListener((message: VaultMessage, _sender, sendResponse) => {
  if (message.type === 'INTERCEPT') {
    handleIntercept(message, sendResponse);
    return true;
  }
  return false;
});

export {};
