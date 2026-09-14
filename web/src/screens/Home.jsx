import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardPaste } from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { detectPlatform } from '../platform.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import TextInput from '../components/ui/TextInput.jsx';
import Badge from '../components/ui/Badge.jsx';
import IconButton from '../components/ui/IconButton.jsx';

export default function Home() {
  const [url, setUrl] = useState('');
  const [pasteError, setPasteError] = useState('');
  const queryClient = useQueryClient();

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setPasteError('');
      }
    } catch {
      setPasteError('Einfügen nicht möglich — bitte manuell einfügen.');
    }
  }

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
      <Card className="flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <TextInput
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL eingeben..."
            className="flex-1"
          />
          {url && <Badge>{platform.label}</Badge>}
          <IconButton icon={ClipboardPaste} label="URL einfügen" onClick={pasteFromClipboard} />
        </div>
        {pasteError && <p className="text-danger text-sm">{pasteError}</p>}
        <div className="flex gap-2">
          <Button
            variant={format === 'mp3' ? 'primary' : 'secondary'}
            aria-pressed={format === 'mp3'}
            onClick={() => setFormat.mutate('mp3')}
            className="flex-1"
          >
            MP3
          </Button>
          <Button
            variant={format === 'mp4' ? 'primary' : 'secondary'}
            aria-pressed={format === 'mp4'}
            onClick={() => setFormat.mutate('mp4')}
            className="flex-1"
          >
            MP4
          </Button>
        </div>
        <Button
          onClick={() => addToQueue.mutate()}
          disabled={!url || addToQueue.isPending}
          className="w-full"
        >
          {addToQueue.isPending ? 'Wird hinzugefügt...' : 'Zur Queue hinzufügen'}
        </Button>
        {addToQueue.isError && <p className="text-danger">{addToQueue.error.message}</p>}
      </Card>
    </div>
  );
}
