import { useEffect, useState } from 'react';
import { subscribe } from '../ws/client.js';

const STATUS_LABEL = { pending: 'Wartet', active: 'Lädt', done: 'Fertig', error: 'Fehler' };
const STATUS_CLASS = { pending: 'text-text-2', active: 'text-indigo', done: 'text-success', error: 'text-danger' };

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
        <div key={item.id} className="bg-bg-1 rounded px-3 py-2 flex justify-between gap-2">
          <span className="text-text-0 truncate">{item.customName || item.url}</span>
          <span className={STATUS_CLASS[item.status] || 'text-text-2'}>
            {STATUS_LABEL[item.status] || item.status}
            {item.status === 'active' && item.progress ? ` ${item.progress}%` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
