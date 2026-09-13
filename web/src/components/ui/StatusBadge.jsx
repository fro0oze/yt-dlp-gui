import Badge from './Badge.jsx';

const QUEUE_STATUS = {
  pending: { tone: 'neutral', label: 'Wartet' },
  active: { tone: 'active', label: 'Lädt' },
  done: { tone: 'success', label: 'Fertig' },
  error: { tone: 'danger', label: 'Fehler' },
};

export default function StatusBadge({ status }) {
  const entry = QUEUE_STATUS[status] || { tone: 'neutral', label: status };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
