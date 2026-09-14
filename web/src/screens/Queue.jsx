import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { RotateCw, SquareTerminal, ImageDown, ChevronDown, ChevronUp } from 'lucide-react';
import { subscribe } from '../ws/client.js';
import { apiFetch } from '../api/client.js';
import { openTerminal } from '../terminalControl.js';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import IconButton from '../components/ui/IconButton.jsx';

const VISIBLE_GROUP_ITEMS = 3;

function isVideoFile(filename) {
  return !!filename && /\.(mp4|mkv|mov|webm)$/i.test(filename);
}

async function shareFile(item) {
  const res = await fetch(`/api/queue/${item.id}/file`);
  if (!res.ok) throw new Error('Datei konnte nicht geladen werden.');
  const blob = await res.blob();
  const file = new File([blob], item.filename, { type: blob.type || 'video/mp4' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ItemRow({ item, onRetry, saving, onSaveToPhotos, saveError }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-2 items-center">
        <span className="text-text-0 truncate">{item.customName || item.url}</span>
        <div className="flex items-center gap-1">
          <StatusBadge status={item.status} />
          {item.status === 'done' && isVideoFile(item.filename) && (
            <IconButton
              icon={ImageDown}
              label="In Fotos speichern"
              onClick={() => onSaveToPhotos(item)}
              disabled={saving}
            />
          )}
          {item.status === 'error' && item.source !== 'shortcut' && (
            <IconButton icon={RotateCw} label="Erneut versuchen" onClick={() => onRetry(item)} />
          )}
          <IconButton icon={SquareTerminal} label="Terminal anzeigen" onClick={openTerminal} />
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
      {saveError ? <p className="text-danger text-sm">{saveError}</p> : null}
    </div>
  );
}

export default function Queue() {
  const [items, setItems] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());
  const [saveErrors, setSaveErrors] = useState({});

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

  async function saveToPhotos(item) {
    setSavingIds((prev) => new Set(prev).add(item.id));
    setSaveErrors((prev) => ({ ...prev, [item.id]: null }));
    try {
      await shareFile(item);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setSaveErrors((prev) => ({ ...prev, [item.id]: err.message }));
      }
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  function toggleGroup(groupId) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  }

  if (items.length === 0) {
    return <div className="p-4 text-text-2">Queue ist leer.</div>;
  }

  const groups = new Map();
  const rows = [];
  for (const item of items) {
    if (!item.groupId) {
      rows.push({ type: 'single', item });
      continue;
    }
    let group = groups.get(item.groupId);
    if (!group) {
      group = { type: 'group', groupId: item.groupId, groupTitle: item.groupTitle, items: [] };
      groups.set(item.groupId, group);
      rows.push(group);
    }
    group.items.push(item);
  }

  return (
    <div className="p-4 flex flex-col gap-2">
      {rows.map((row) => {
        if (row.type === 'single') {
          const item = row.item;
          return (
            <Card key={item.id}>
              <ItemRow
                item={item}
                onRetry={retry.mutate}
                saving={savingIds.has(item.id)}
                onSaveToPhotos={saveToPhotos}
                saveError={saveErrors[item.id]}
              />
            </Card>
          );
        }

        const expanded = expandedGroups.has(row.groupId);
        const doneCount = row.items.filter((i) => i.status === 'done').length;
        const visibleItems = expanded ? row.items : row.items.slice(0, VISIBLE_GROUP_ITEMS);
        const hiddenCount = row.items.length - visibleItems.length;

        return (
          <Card key={row.groupId} className="flex flex-col gap-3">
            <div className="flex justify-between items-center gap-2">
              <span className="text-text-0 font-semibold truncate">{row.groupTitle}</span>
              <span className="text-text-2 text-sm shrink-0">{doneCount}/{row.items.length} fertig</span>
            </div>
            <div className="flex flex-col gap-3 divide-y divide-bg-2">
              {visibleItems.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0">
                  <ItemRow
                    item={item}
                    onRetry={retry.mutate}
                    saving={savingIds.has(item.id)}
                    onSaveToPhotos={saveToPhotos}
                    saveError={saveErrors[item.id]}
                  />
                </div>
              ))}
            </div>
            {row.items.length > VISIBLE_GROUP_ITEMS && (
              <button
                type="button"
                onClick={() => toggleGroup(row.groupId)}
                className="flex items-center gap-1 text-text-2 text-sm self-start"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {expanded ? 'Weniger anzeigen' : `${hiddenCount} weitere anzeigen`}
              </button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
