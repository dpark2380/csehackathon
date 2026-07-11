import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../vault/styles.css';
import { applyTheme, ensureSeeded, getUserId, getVault, resetDemoData } from '../shared/storage';
import { api } from '../vault/api/client';

function Popup() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [resetMsg, setResetMsg] = useState(false);

  useEffect(() => {
    (async () => {
      await ensureSeeded();
      applyTheme((await getVault()).settings.theme);
      setUserId(await getUserId());
      setLoading(false);
    })();
  }, []);

  const signIn = async () => {
    setSigningIn(true);
    try {
      const { auth_url } = await api.startAuth();
      await chrome.tabs.create({ url: auth_url });
      window.close();
    } catch {
      setSigningIn(false);
    }
  };

  const openVault = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/vault/index.html') });
  };

  const resetDemo = async () => {
    await resetDemoData();
    setResetMsg(true);
    setTimeout(() => setResetMsg(false), 1500);
  };

  return (
    <div className="w-80 bg-cream p-4 font-sans text-forest">
      <h1 className="mb-3 text-lg font-semibold">impulse</h1>

      {!loading && (
        <div className="mb-3">
          {userId ? (
            <p className="text-sm">Connected as {userId.slice(0, 12)}…</p>
          ) : (
            <button
              onClick={signIn}
              disabled={signingIn}
              className="w-full rounded-card bg-forest px-3 py-2 text-sm font-medium text-cream disabled:opacity-60"
            >
              {signingIn ? 'Opening…' : 'Sign in with Google'}
            </button>
          )}
        </div>
      )}

      <button
        onClick={openVault}
        className="w-full rounded-card border border-forest px-3 py-2 text-sm font-medium text-forest"
      >
        Open impulse
      </button>

      <div className="mt-4 text-right">
        <button onClick={resetDemo} className="text-xs text-forest/60 hover:text-forest">
          {resetMsg ? 'reset ✓' : 'Reset Demo Data'}
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Popup />);
