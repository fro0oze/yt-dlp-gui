// ─── API ──────────────────────────────────────────────────────────────────────

const API_KEY_STORAGE = 'ytdlpweb.apiKey';

function getStoredKey() {
    return localStorage.getItem(API_KEY_STORAGE) || '';
}

export async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const key = getStoredKey();
    if (key) opts.headers['Authorization'] = `Bearer ${key}`;
    if (body) opts.body = JSON.stringify(body);

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
