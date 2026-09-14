import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '../api/client.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import TextInput from '../components/ui/TextInput.jsx';
import IconButton from '../components/ui/IconButton.jsx';

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
            <TextInput
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Playlist-URL..."
              className="flex-1"
            />
            <Button
              onClick={() => newUrl.trim() && addPlaylist.mutate(newUrl.trim())}
              disabled={!newUrl.trim() || addPlaylist.isPending}
            >
              Speichern
            </Button>
          </div>
          {addPlaylist.isError && <p className="text-danger">{addPlaylist.error.message}</p>}
          {removePlaylist.isError && <p className="text-danger">{removePlaylist.error.message}</p>}

          {playlists.length === 0 ? (
            <p className="text-text-2">Keine gespeicherten Playlists.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {playlists.map((p) => (
                <Card key={p.id} className="flex justify-between items-center">
                  <button type="button" onClick={() => openPlaylist(p)} className="text-text-0 truncate text-left flex-1">
                    {p.name}
                  </button>
                  <IconButton icon={Trash2} label="Playlist entfernen" tone="danger" onClick={() => removePlaylist.mutate(p.id)} />
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'entries' && activePlaylist && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={backToList}>‹ Zurück</Button>
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
                <Button variant="ghost" onClick={() => selectAll(visibleEntries)}>Alle</Button>
                <Button variant="ghost" onClick={selectNone}>Keine</Button>
                <TextInput
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filtern..."
                  className="flex-1"
                />
                <span className="text-text-2 text-sm">{selectedIds.size} ausgewählt</span>
              </div>
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                {visibleEntries.map((e) => (
                  <Card key={e.id} className="flex items-center gap-2">
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleEntry(e.id)} className="w-5 h-5 accent-indigo" />
                      <span className="text-text-0 truncate">{e.title}</span>
                    </label>
                  </Card>
                ))}
              </div>
              <Button
                onClick={() => addSelectedToQueue.mutate()}
                disabled={selectedIds.size === 0 || addSelectedToQueue.isPending}
                className="self-start"
              >
                {addSelectedToQueue.isPending ? 'Wird hinzugefügt...' : `${selectedIds.size} zur Queue hinzufügen`}
              </Button>
              {addSelectedToQueue.isError && <p className="text-danger">{addSelectedToQueue.error.message}</p>}
              {addSelectedToQueue.isSuccess && <p className="text-success">{addSelectedToQueue.data.queued} zur Queue hinzugefügt.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
