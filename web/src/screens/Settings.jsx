import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, setStoredKey } from '../api/client.js';

function useSettingsQuery() {
  return useQuery({ queryKey: ['settings'], queryFn: () => apiFetch('/settings') });
}

function usePatchSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch) => apiFetch('/settings', { method: 'POST', body: JSON.stringify(patch) }),
    onSuccess: (_data, patch) => {
      queryClient.setQueryData(['settings'], (prev) => ({ ...prev, ...patch }));
    },
  });
}

function useCookiesStatus() {
  return useQuery({ queryKey: ['cookies-status'], queryFn: () => apiFetch('/cookies-status') });
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-2 gap-4">
      <span className="text-text-1">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5" />
    </label>
  );
}

function TextRow({ label, value, onCommit, placeholder }) {
  const [local, setLocal] = useState(value);
  return (
    <label className="flex flex-col gap-1 py-2">
      <span className="text-text-1">{label}</span>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onCommit(local); }}
        placeholder={placeholder}
        className="bg-bg-1 text-text-0 px-3 py-2 rounded"
      />
    </label>
  );
}

export default function Settings() {
  const settingsQuery = useSettingsQuery();
  const patch = usePatchSettings();
  const s = settingsQuery.data;

  const cookiesStatus = useCookiesStatus();
  const queryClient = useQueryClient();

  const uploadCookies = useMutation({
    mutationFn: async (text) => {
      const data = await apiFetch('/upload-cookies', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: text });
      if (!data.success) throw new Error('Cookies-Upload fehlgeschlagen.');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cookies-status'] }),
  });

  const removeCookies = useMutation({
    mutationFn: () => apiFetch('/cookies', { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cookies-status'] }),
  });

  const [proxyInput, setProxyInput] = useState('');

  const toggleProxy = useMutation({
    mutationFn: (body) => apiFetch('/toggle-proxy', { method: 'POST', body: JSON.stringify(body) }),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      const previous = queryClient.getQueryData(['settings']);
      queryClient.setQueryData(['settings'], (prev) => ({ ...prev, ...body }));
      return { previous };
    },
    onError: (_err, _body, context) => {
      if (context && context.previous) {
        queryClient.setQueryData(['settings'], context.previous);
      }
    },
  });

  function addProxy() {
    const value = proxyInput.trim();
    if (!value) return;
    const existing = s.savedProxies || [];
    if (existing.includes(value)) return;
    const savedProxies = [value, ...existing];
    setProxyInput('');
    toggleProxy.mutate({ proxyEnabled: s.proxyEnabled, proxy: value, savedProxies });
  }

  function removeProxy(value) {
    const savedProxies = (s.savedProxies || []).filter((p) => p !== value);
    const proxy = s.proxy === value ? '' : s.proxy;
    toggleProxy.mutate({ proxyEnabled: s.proxyEnabled, proxy, savedProxies });
  }

  const [showKey, setShowKey] = useState(false);

  const regenerateKey = useMutation({
    mutationFn: () => apiFetch('/settings/regenerate-key', { method: 'POST' }),
    onSuccess: (data) => {
      setStoredKey(data.apiKey);
      queryClient.setQueryData(['settings'], (prev) => ({ ...prev, apiKey: data.apiKey }));
    },
  });

  const updateYtDlp = useMutation({
    mutationFn: () => apiFetch('/update-ytdlp', { method: 'POST' }),
  });

  function handleRegenerateKey() {
    if (window.confirm('Neuen API-Key generieren? Der alte Key wird sofort ungültig.')) {
      regenerateKey.mutate();
    }
  }

  function copyApiKey() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(s.apiKey);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = s.apiKey;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } catch {
      // ignore — user can still copy manually via "Anzeigen"
    }
    document.body.removeChild(textarea);
  }

  function handleCookiesFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Datei zu groß (max. 10 MB).');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (!text || !text.trim() || !/^#\s*(Netscape|HTTP Cookie File)/m.test(text)) {
        alert('Keine gültige cookies.txt Datei.');
        return;
      }
      uploadCookies.mutate(text);
    };
    reader.onerror = () => alert('Datei konnte nicht gelesen werden.');
    reader.readAsText(file);
    e.target.value = '';
  }

  if (settingsQuery.isPending) {
    return <div className="p-4 text-text-2">Lade Einstellungen...</div>;
  }
  if (settingsQuery.isError || !s) {
    return <div className="p-4 text-danger">Einstellungen konnten nicht geladen werden.</div>;
  }

  const mutationError = patch.error || uploadCookies.error || removeCookies.error || toggleProxy.error || regenerateKey.error || updateYtDlp.error;

  return (
    <div className="p-4 flex flex-col gap-6 max-w-xl">
      {mutationError && <p className="text-danger">{mutationError.message}</p>}
      <section>
        <h2 className="text-text-0 font-semibold mb-2">Audio &amp; Video</h2>
        <label className="flex flex-col gap-1 py-2">
          <span className="text-text-1">Audioqualität</span>
          <select
            value={s.audioQuality}
            onChange={(e) => patch.mutate({ audioQuality: e.target.value })}
            className="bg-bg-1 text-text-0 px-3 py-2 rounded"
          >
            <option value="128">128 kbps</option>
            <option value="192">192 kbps</option>
            <option value="320">320 kbps</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 py-2">
          <span className="text-text-1">Videoqualität</span>
          <select
            value={s.videoQuality}
            onChange={(e) => patch.mutate({ videoQuality: e.target.value })}
            className="bg-bg-1 text-text-0 px-3 py-2 rounded"
          >
            <option value="best">Beste verfügbar</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
          </select>
        </label>
        <ToggleRow label="MKV-Container erzwingen" checked={s.mkvContainer} onChange={(v) => patch.mutate({ mkvContainer: v })} />
        <ToggleRow label="Thumbnail einbetten" checked={s.embedThumbnail} onChange={(v) => patch.mutate({ embedThumbnail: v })} />
        <ToggleRow label="Untertitel herunterladen" checked={s.subtitlesEnabled} onChange={(v) => patch.mutate({ subtitlesEnabled: v })} />
        <TextRow label="Geschwindigkeitslimit" value={s.speedLimit} onCommit={(v) => patch.mutate({ speedLimit: v })} placeholder="z.B. 5M, leer = unbegrenzt" />
      </section>

      <section>
        <h2 className="text-text-0 font-semibold mb-2">Allgemein</h2>
        <ToggleRow label="Bestehende Dateien überspringen" checked={s.skipExisting} onChange={(v) => patch.mutate({ skipExisting: v })} />
        <ToggleRow label="Terminal auto-leeren" checked={s.clearBetweenItems} onChange={(v) => patch.mutate({ clearBetweenItems: v })} />
        <TextRow label="Pause zwischen Downloads (Sekunden)" value={s.downloadDelay} onCommit={(v) => patch.mutate({ downloadDelay: v })} placeholder="0" />
      </section>

      <section>
        <h2 className="text-text-0 font-semibold mb-2">Erweitert</h2>
        <TextRow label="Eigene yt-dlp Argumente" value={s.customArgs} onCommit={(v) => patch.mutate({ customArgs: v })} placeholder="z.B. --playlist-start 1" />
        <ToggleRow label="Deno JS-Runtime" checked={s.jsRuntime} onChange={(v) => patch.mutate({ jsRuntime: v })} />
        <ToggleRow label="Ausführliche Ausgabe" checked={s.verbose} onChange={(v) => patch.mutate({ verbose: v })} />
      </section>

      <section>
        <h2 className="text-text-0 font-semibold mb-2">YouTube Account</h2>
        <p className="text-text-2">
          Cookies: {cookiesStatus.data && cookiesStatus.data.active ? <span className="text-success">aktiv</span> : <span className="text-text-2">nicht aktiv</span>}
        </p>
        <div className="flex gap-2 mt-2">
          <label className="bg-bg-1 text-text-0 px-4 py-2 rounded cursor-pointer">
            Hochladen
            <input type="file" accept=".txt" onChange={handleCookiesFile} className="hidden" />
          </label>
          {cookiesStatus.data && cookiesStatus.data.active && (
            <button type="button" onClick={() => removeCookies.mutate()} className="bg-bg-1 text-text-0 px-4 py-2 rounded">
              Entfernen
            </button>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-text-0 font-semibold mb-2">Proxy</h2>
        <ToggleRow
          label="Proxy verwenden"
          checked={s.proxyEnabled}
          onChange={(v) => toggleProxy.mutate({ proxyEnabled: v, proxy: s.proxy, savedProxies: s.savedProxies })}
        />
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={proxyInput}
            onChange={(e) => setProxyInput(e.target.value)}
            placeholder="socks5://user:pass@127.0.0.1:1080"
            className="flex-1 bg-bg-1 text-text-0 px-3 py-2 rounded"
          />
          <button type="button" onClick={addProxy} className="bg-bg-1 text-text-0 px-4 py-2 rounded">
            +
          </button>
        </div>
        <div className="flex flex-col gap-1 mt-2">
          {(s.savedProxies || []).map((p) => (
            <div key={p} className="flex justify-between items-center bg-bg-1 px-3 py-2 rounded">
              <span className={p === s.proxy ? 'text-text-0' : 'text-text-2'}>{p}</span>
              <button type="button" onClick={() => removeProxy(p)} className="text-danger">×</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-text-0 font-semibold mb-2">API-Key</h2>
        <p className="text-text-2 text-sm">Für iOS Shortcuts, Tasker & Co. — als <code>Authorization: Bearer &lt;Key&gt;</code> Header mitschicken.</p>
        <div className="flex gap-2 mt-2 items-center">
          <code className="flex-1 bg-bg-1 text-text-0 px-3 py-2 rounded overflow-x-auto whitespace-nowrap">
            {showKey ? s.apiKey : '••••••••••••••••••••••••••••••••••••••••••••••••'}
          </code>
          <button type="button" onClick={() => setShowKey((v) => !v)} className="bg-bg-1 text-text-0 px-3 py-2 rounded">
            {showKey ? 'Verbergen' : 'Anzeigen'}
          </button>
          <button
            type="button"
            onClick={copyApiKey}
            className="bg-bg-1 text-text-0 px-3 py-2 rounded"
          >
            Kopieren
          </button>
        </div>
        <button
          type="button"
          onClick={handleRegenerateKey}
          disabled={regenerateKey.isPending}
          className="mt-2 bg-danger text-text-0 px-4 py-2 rounded disabled:opacity-50"
        >
          {regenerateKey.isPending ? 'Wird erneuert...' : 'Neu generieren'}
        </button>
      </section>

      <section>
        <h2 className="text-text-0 font-semibold mb-2">Wartung</h2>
        <button
          type="button"
          onClick={() => updateYtDlp.mutate()}
          disabled={updateYtDlp.isPending}
          className="bg-bg-1 text-text-0 px-4 py-2 rounded disabled:opacity-50"
        >
          {updateYtDlp.isPending ? 'Prüfe...' : 'yt-dlp aktualisieren'}
        </button>
      </section>
    </div>
  );
}
