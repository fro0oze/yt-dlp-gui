import {
    ytPlaylistList, ytPlaylistInput, ytEntriesTitle, ytEntriesList,
    ytListView, ytEntriesView, ytFilter, ytSelectedCount,
} from './dom.js';
import { state } from './state.js';
import { api } from './api.js';
import { t } from './i18n.js';
import { showToast } from './toast.js';
import { switchTab } from './tabs.js';
import { renderLocalQueue } from './queue.js';

// ─── YouTube Tab ──────────────────────────────────────────────────────────────

export async function loadYtPlaylists() {
    const playlists = await api('GET', '/saved-playlists');
    renderYtPlaylists(playlists);
}

function renderYtPlaylists(playlists) {
    ytPlaylistList.innerHTML = '';
    (playlists || []).forEach(p => {
        ytPlaylistList.appendChild(makePlaylistRow(p.name, 'yt',
            () => openYtPlaylist(p),
            async () => { await api('DELETE', `/saved-playlists/${p.id}`); loadYtPlaylists(); showToast('Entfernt'); }
        ));
    });
}

export async function saveYtPlaylist() {
    const url = ytPlaylistInput.value.trim();
    if (!url) return;
    const result = await api('POST', '/saved-playlists', { name: url, url });
    if (result.success) { ytPlaylistInput.value = ''; renderYtPlaylists(result.playlists); showToast('Gespeichert'); }
}

async function openYtPlaylist(pl) {
    ytEntriesTitle.textContent = pl.name || pl.url;
    ytEntriesList.innerHTML = '<div style="color:rgb(var(--c-text-4));font-size:var(--font-12);padding:var(--space-8);">Wird geladen...</div>';
    showYtEntriesView();

    const res = await fetch(`/api/playlist-info?url=${encodeURIComponent(pl.url)}`);
    const result = await res.json();

    if (!result.success) {
        ytEntriesList.innerHTML = '<div style="color:rgb(var(--c-danger-light));font-size:var(--font-12);padding:var(--space-8);">Fehler beim Laden</div>';
        return;
    }

    ytEntriesTitle.textContent = `${result.title} (${result.count})`;
    renderEntriesInList(ytEntriesList, result.entries.map(e => ({ url: e.url, title: e.title, duration: e.duration })), false, null);
    updateYtCount();
}

function showYtEntriesView() { ytListView.classList.add('hidden'); ytEntriesView.classList.remove('hidden'); ytFilter.value = ''; }
export function showYtListView()    { ytEntriesView.classList.add('hidden'); ytListView.classList.remove('hidden'); }
export function updateYtCount()     { updateCount(ytEntriesList, ytSelectedCount); }

// ─── Shared Entry Helpers ─────────────────────────────────────────────────────

function renderEntriesInList(listEl, entries, showRemove, onRemove) {
    listEl.innerHTML = '';
    entries.forEach((entry, i) => {
        const row = document.createElement('label');
        row.className = 'playlist-video-item';
        row.dataset.title = (entry.title || '').toLowerCase();

        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.dataset.url = entry.url;
        cb.addEventListener('change', () => updateCount(listEl, ytSelectedCount));

        const num = document.createElement('span'); num.className = 'playlist-video-num'; num.textContent = i + 1;
        const title = document.createElement('span'); title.className = 'playlist-video-title'; title.textContent = entry.title || entry.url;
        const dur = document.createElement('span'); dur.className = 'playlist-video-dur'; dur.textContent = entry.duration ? formatDuration(entry.duration) : '';

        row.appendChild(cb); row.appendChild(num); row.appendChild(title); row.appendChild(dur);

        if (showRemove && onRemove) {
            const rm = document.createElement('button');
            rm.className = 'proxy-item-remove'; rm.textContent = '×'; rm.style.opacity = '1';
            rm.setAttribute('aria-label', t('aria.remove'));
            rm.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onRemove(entry.url); });
            row.appendChild(rm);
        }

        listEl.appendChild(row);
    });
}

export function filterList(listEl, query) {
    const q = query.toLowerCase();
    listEl.querySelectorAll('.playlist-video-item').forEach(item => {
        item.style.display = (!q || (item.dataset.title || '').includes(q)) ? '' : 'none';
    });
}

function updateCount(listEl, countEl) {
    const total = listEl.querySelectorAll('input[type="checkbox"]').length;
    const checked = listEl.querySelectorAll('input[type="checkbox"]:checked').length;
    countEl.textContent = `${checked}/${total}`;
}

export function addEntriesFromListToQueue(listEl) {
    const urls = Array.from(listEl.querySelectorAll('input[type="checkbox"]:checked'))
        .filter(cb => cb.closest('.playlist-video-item').style.display !== 'none')
        .map(cb => cb.dataset.url);
    if (!urls.length) { showToast('Nichts ausgewählt'); return; }
    urls.forEach(url => { if (!state.localQueue.find(i => i.url === url)) state.localQueue.push({ id: ++state.queueIdCounter, url, customName: '' }); });
    renderLocalQueue();
    switchTab('queue');
    showToast(`${urls.length} zur Queue hinzugefügt`);
}

function makePlaylistRow(name, type, onClick, onRemove) {
    const item = document.createElement('div');
    item.className = `playlist-row playlist-row-${type}`;

    const info = document.createElement('div'); info.className = 'playlist-row-info';
    info.addEventListener('click', onClick);

    const nameEl = document.createElement('span'); nameEl.className = 'playlist-row-name'; nameEl.textContent = name;
    info.appendChild(nameEl);

    const rm = document.createElement('button'); rm.className = 'proxy-item-remove'; rm.textContent = '×'; rm.style.opacity = '0';
    rm.setAttribute('aria-label', t('aria.remove'));
    rm.addEventListener('click', (e) => { e.stopPropagation(); onRemove(); });
    rm.addEventListener('focus', () => rm.style.opacity = '1');
    rm.addEventListener('blur', () => rm.style.opacity = '0');
    item.addEventListener('mouseenter', () => rm.style.opacity = '1');
    item.addEventListener('mouseleave', () => rm.style.opacity = '0');

    item.appendChild(info); item.appendChild(rm);
    return item;
}

function formatDuration(secs) {
    if (!secs) return '';
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
}
