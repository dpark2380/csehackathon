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
    <div className="w-80 p-4 font-sans text-gray-900">
      <div className="glass rounded-card p-5 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">impulse</h1>
          {!loading && userId && (
            <p className="mt-1 text-xs text-gray-500">Connected as {userId.slice(0, 12)}…</p>
          )}
        </div>

        {!loading && !userId && (
          <button
            onClick={signIn}
            disabled={signingIn}
            className="w-full rounded-card bg-forest px-3 py-2.5 text-sm font-medium text-white transition hover:bg-forest/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {signingIn ? 'Opening…' : 'Sign in with Google'}
          </button>
        )}

        <button
          onClick={openVault}
          className={`w-full rounded-card px-3 py-2.5 text-sm font-medium transition ${
            userId
              ? 'bg-forest text-white hover:bg-forest/90'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
        >
          Open impulse
        </button>

        <button
          onClick={resetDemo}
          className="self-end text-xs text-gray-400 hover:text-gray-600"
        >
          {resetMsg ? 'reset ✓' : 'Reset Demo Data'}
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Popup />);
