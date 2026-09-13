import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client.js';
import { detectPlatform } from '../platform.js';

export default function Home() {
  const [url, setUrl] = useState('');
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch('/settings'),
  });
  const format = settingsQuery.data ? settingsQuery.data.format : 'mp3';

  const setFormat = useMutation({
    mutationFn: (nextFormat) => apiFetch('/settings', { method: 'POST', body: JSON.stringify({ format: nextFormat }) }),
    onSuccess: (_data, nextFormat) => {
      queryClient.setQueryData(['settings'], (prev) => ({ ...prev, format: nextFormat }));
    },
  });

  const addToQueue = useMutation({
    mutationFn: () => apiFetch('/download', { method: 'POST', body: JSON.stringify({ url }) }),
    onSuccess: () => setUrl(''),
  });

  const platform = detectPlatform(url);

  return (
    <div className="p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL eingeben..."
          className="flex-1 bg-bg-1 text-text-0 px-3 py-2 rounded"
        />
        <span className="text-text-2 self-center">{platform.label}</span>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => setFormat.mutate('mp3')}
          aria-pressed={format === 'mp3'}
          className={format === 'mp3' ? 'bg-indigo text-text-0 px-4 py-2 rounded' : 'bg-bg-1 text-text-2 px-4 py-2 rounded'}
        >
          MP3
        </button>
        <button
          type="button"
          onClick={() => setFormat.mutate('mp4')}
          aria-pressed={format === 'mp4'}
          className={format === 'mp4' ? 'bg-indigo text-text-0 px-4 py-2 rounded' : 'bg-bg-1 text-text-2 px-4 py-2 rounded'}
        >
          MP4
        </button>
      </div>
      <button
        type="button"
        onClick={() => addToQueue.mutate()}
        disabled={!url || addToQueue.isPending}
        className="mt-3 bg-indigo text-text-0 px-4 py-2 rounded disabled:opacity-50"
      >
        {addToQueue.isPending ? 'Wird hinzugefügt...' : 'Zur Queue hinzufügen'}
      </button>
      {addToQueue.isError && <p className="text-danger mt-2">{addToQueue.error.message}</p>}
    </div>
  );
}
