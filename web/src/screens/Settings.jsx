import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client.js';

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

  if (settingsQuery.isPending) {
    return <div className="p-4 text-text-2">Lade Einstellungen...</div>;
  }
  if (settingsQuery.isError || !s) {
    return <div className="p-4 text-danger">Einstellungen konnten nicht geladen werden.</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-6 max-w-xl">
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
        <label className="flex flex-col gap-1 py-2">
          <span className="text-text-1">App-Sprache</span>
          <select
            value={s.appLang}
            onChange={(e) => patch.mutate({ appLang: e.target.value })}
            className="bg-bg-1 text-text-0 px-3 py-2 rounded"
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>
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
    </div>
  );
}
