import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client.js';

function useSavedPlaylists() {
  return useQuery({ queryKey: ['saved-playlists'], queryFn: () => apiFetch('/saved-playlists') });
}

function useEntries(url) {
  return useQuery({
    queryKey: ['playlist-entries', url],
    queryFn: () => apiFetch(`/playlist-info?url=${encodeURIComponent(url)}`),
    enabled: !!url,
  });
}

export default function Playlists() {
  const savedQuery = useSavedPlaylists();
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState('');
  const [view, setView] = useState('list');
  const [activePlaylist, setActivePlaylist] = useState(null);

  const addPlaylist = useMutation({
    mutationFn: async (url) => {
      const data = await apiFetch('/saved-playlists', { method: 'POST', body: JSON.stringify({ url }) });
      if (!data.success) throw new Error('Playlist konnte nicht gespeichert werden.');
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['saved-playlists'], data.playlists);
      setNewUrl('');
    },
  });

  const removePlaylist = useMutation({
    mutationFn: (id) => apiFetch(`/saved-playlists/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData(['saved-playlists'], (prev) => (prev || []).filter((p) => p.id !== id));
    },
  });

  function openPlaylist(playlist) {
    setActivePlaylist(playlist);
    setView('entries');
    addSelectedToQueue.reset();
  }

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterText, setFilterText] = useState('');

  const entriesQuery = useEntries(view === 'entries' && activePlaylist ? activePlaylist.url : null);

  function toggleEntry(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll(entries) {
    setSelectedIds(new Set(entries.map((e) => e.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  function backToList() {
    setView('list');
    setActivePlaylist(null);
    setSelectedIds(new Set());
    setFilterText('');
    addSelectedToQueue.reset();
  }

  const addSelectedToQueue = useMutation({
    mutationFn: async () => {
      const items = entriesQuery.data.entries
        .filter((e) => selectedIds.has(e.id))
        .map((e) => ({ url: e.url, customName: null }));
      const data = await apiFetch('/queue', { method: 'POST', body: JSON.stringify({ items }) });
      if (!data.success) throw new Error('Konnte nicht zur Queue hinzugefügt werden.');
      return data;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
    },
  });

  const visibleEntries = entriesQuery.data && entriesQuery.data.success
    ? entriesQuery.data.entries.filter((e) => String(e.title ?? '').toLowerCase().includes(filterText.toLowerCase()))
    : [];

  if (savedQuery.isPending) {
    return <div className="p-4 text-text-2">Lade Playlists...</div>;
  }
  if (savedQuery.isError) {
    return <div className="p-4 text-danger">Playlists konnten nicht geladen werden.</div>;
  }

  const playlists = savedQuery.data || [];

  return (
    <div className="p-4 flex flex-col gap-4 max-w-xl">
      {view === 'list' && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Playlist-URL..."
              className="flex-1 bg-bg-1 text-text-0 px-3 py-2 rounded"
            />
            <button
              type="button"
              onClick={() => newUrl.trim() && addPlaylist.mutate(newUrl.trim())}
              disabled={!newUrl.trim() || addPlaylist.isPending}
              className="bg-indigo text-text-0 px-4 py-2 rounded disabled:opacity-50"
            >
              Speichern
            </button>
          </div>
          {addPlaylist.isError && <p className="text-danger">{addPlaylist.error.message}</p>}
          {removePlaylist.isError && <p className="text-danger">{removePlaylist.error.message}</p>}

          {playlists.length === 0 ? (
            <p className="text-text-2">Keine gespeicherten Playlists.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {playlists.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-bg-1 px-3 py-2 rounded">
                  <button type="button" onClick={() => openPlaylist(p)} className="text-text-0 truncate text-left flex-1">
                    {p.name}
                  </button>
                  <button type="button" onClick={() => removePlaylist.mutate(p.id)} className="text-danger px-2">×</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'entries' && activePlaylist && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={backToList} className="text-text-2">‹ Zurück</button>
            <span className="text-text-0 font-semibold truncate">
              {entriesQuery.data && entriesQuery.data.success
                ? `${entriesQuery.data.title} (${entriesQuery.data.count})`
                : activePlaylist.name}
            </span>
          </div>

          {entriesQuery.isPending && <p className="text-text-2">Lade Einträge...</p>}
          {entriesQuery.isError && <p className="text-danger">Einträge konnten nicht geladen werden.</p>}
          {entriesQuery.data && !entriesQuery.data.success && (
            <p className="text-danger">{entriesQuery.data.error || 'Playlist konnte nicht geladen werden.'}</p>
          )}

          {entriesQuery.data && entriesQuery.data.success && (
            <>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={() => selectAll(visibleEntries)} className="text-text-2">Alle</button>
                <button type="button" onClick={selectNone} className="text-text-2">Keine</button>
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filtern..."
                  className="flex-1 bg-bg-1 text-text-0 px-3 py-2 rounded"
                />
                <span className="text-text-2">{selectedIds.size} ausgewählt</span>
              </div>
              <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                {visibleEntries.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 bg-bg-1 px-3 py-2 rounded">
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleEntry(e.id)} />
                    <span className="text-text-0 truncate flex-1">{e.title}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addSelectedToQueue.mutate()}
                disabled={selectedIds.size === 0 || addSelectedToQueue.isPending}
                className="bg-indigo text-text-0 px-4 py-2 rounded disabled:opacity-50 self-start"
              >
                {addSelectedToQueue.isPending ? 'Wird hinzugefügt...' : `${selectedIds.size} zur Queue hinzufügen`}
              </button>
              {addSelectedToQueue.isError && <p className="text-danger">{addSelectedToQueue.error.message}</p>}
              {addSelectedToQueue.isSuccess && <p className="text-success">{addSelectedToQueue.data.queued} zur Queue hinzugefügt.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
