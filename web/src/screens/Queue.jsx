import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { RotateCw } from 'lucide-react';
import { subscribe } from '../ws/client.js';
import { apiFetch } from '../api/client.js';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import IconButton from '../components/ui/IconButton.jsx';

export default function Queue() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'queue-update') {
        setItems(msg.data.items);
      }
    });
  }, []);

  const retry = useMutation({
    mutationFn: (item) => apiFetch('/download', { method: 'POST', body: JSON.stringify({ url: item.url, customName: item.customName }) }),
  });

  if (items.length === 0) {
    return <div className="p-4 text-text-2">Queue ist leer.</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-2">
      {items.map((item) => (
        <Card key={item.id} className="flex flex-col gap-2">
          <div className="flex justify-between gap-2 items-center">
            <span className="text-text-0 truncate">{item.customName || item.url}</span>
            <div className="flex items-center gap-1">
              <StatusBadge status={item.status} />
              {item.status === 'error' && (
                <IconButton icon={RotateCw} label="Erneut versuchen" onClick={() => retry.mutate(item)} />
              )}
            </div>
          </div>
          {item.status === 'active' && item.progress ? (
            <div className="h-1 w-full rounded-full bg-bg-2 overflow-hidden">
              <div className="h-full bg-indigo rounded-full" style={{ width: `${item.progress}%` }} />
            </div>
          ) : null}
          {item.status === 'error' && item.error ? (
            <p className="text-danger text-sm">{item.error}</p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
