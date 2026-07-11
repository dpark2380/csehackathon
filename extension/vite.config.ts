import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest: manifest as any })],
  build: {
    rollupOptions: {
      // vault.html is opened via chrome.runtime.getURL, not referenced in the
      // manifest as an entry, so crxjs won't discover it on its own.
      input: { vault: 'src/vault/index.html' },
    },
  },
});
