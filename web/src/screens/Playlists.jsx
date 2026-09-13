import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client.js';

function useSavedPlaylists() {
  return useQuery({ queryKey: ['saved-playlists'], queryFn: () => apiFetch('/saved-playlists') });
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
  }

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
    </div>
  );
}
