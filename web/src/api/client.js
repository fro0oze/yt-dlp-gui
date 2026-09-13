const API_KEY_STORAGE = 'ytdlpweb.apiKey';

function getStoredKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export async function apiFetch(path, options = {}) {
  const opts = { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } };
  const key = getStoredKey();
  if (key) opts.headers['Authorization'] = `Bearer ${key}`;

  let res = await fetch(`/api${path}`, opts);
  if (res.status === 401) {
    const entered = prompt('API-Key erforderlich (siehe Server-Log beim Start):');
    if (entered) {
      localStorage.setItem(API_KEY_STORAGE, entered);
      opts.headers['Authorization'] = `Bearer ${entered}`;
      res = await fetch(`/api${path}`, opts);
    }
  }
  return res.json();
}
