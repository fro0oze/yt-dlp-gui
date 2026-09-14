import { useEffect, useState } from 'react';
import { subscribe } from '../ws/client.js';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

export default function Queue() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'queue-update') {
        setItems(msg.data.items);
      }
    });
  }, []);

  if (items.length === 0) {
    return <div className="p-4 text-text-2">Queue ist leer.</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-2">
      {items.map((item) => (
        <Card key={item.id} className="flex flex-col gap-2">
          <div className="flex justify-between gap-2 items-center">
            <span className="text-text-0 truncate">{item.customName || item.url}</span>
            <StatusBadge status={item.status} />
          </div>
          {item.status === 'active' && item.progress ? (
            <div className="h-1 w-full rounded-full bg-bg-2 overflow-hidden">
              <div className="h-full bg-indigo rounded-full" style={{ width: `${item.progress}%` }} />
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
