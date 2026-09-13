import { useEffect, useState } from 'react';
import { apiFetch } from './api/client.js';

export default function App() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    apiFetch('/settings')
      .then((data) => setStatus(data && data.format ? 'connected' : 'disconnected'))
      .catch(() => setStatus('disconnected'));
  }, []);

  const statusText = status === 'checking' ? 'Verbinde...' : status === 'connected' ? 'Verbunden' : 'Nicht verbunden';
  const statusClass = status === 'connected' ? 'text-success' : status === 'disconnected' ? 'text-danger' : 'text-text-2';

  return (
    <div className="min-h-screen bg-bg-0 text-text-0 p-8">
      <h1 className="text-2xl font-semibold">yt-dlp-web</h1>
      <p className={statusClass}>{statusText}</p>
    </div>
  );
}
