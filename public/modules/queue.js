import { queueUrlInput, queueNameInput, queueList, queueCountEl, queueSelectAllCb, queueRemoveSelectedBtn } from './dom.js';
import { state } from './state.js';
import { t } from './i18n.js';
import { showToast } from './toast.js';
import { api } from './api.js';
import { updateDownloadButton } from './download.js';

// ─── Queue Tab ────────────────────────────────────────────────────────────────

export function addToLocalQueue() {
    const url = queueUrlInput.value.trim();
    if (!url) return;
    state.localQueue.push({ id: ++state.queueIdCounter, url, customName: queueNameInput.value.trim() });
    queueUrlInput.value = ''; queueNameInput.value = '';
    renderLocalQueue();
}

export function renderLocalQueue() {
    queueList.innerHTML = '';
    state.localQueue.forEach((item, index) => {
        const row = document.createElement('div'); row.className = 'queue-item';
        row.draggable = true;
        row.dataset.id = item.id;

        row.addEventListener('dragstart', (e) => {
            state.dragSrcQueueId = item.id;
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            queueList.querySelectorAll('.queue-item').forEach(r => r.classList.remove('dragover-top', 'dragover-bottom'));
            state.dragSrcQueueId = null;
        });
        row.addEventListener('dragover', (e) => {
            if (state.dragSrcQueueId === null || state.dragSrcQueueId === item.id) return;
            e.preventDefault();
            const before = e.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2;
            row.classList.toggle('dragover-top', before);
            row.classList.toggle('dragover-bottom', !before);
        });
        row.addEventListener('dragleave', () => row.classList.remove('dragover-top', 'dragover-bottom'));
        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.classList.remove('dragover-top', 'dragover-bottom');
            if (state.dragSrcQueueId === null || state.dragSrcQueueId === item.id) return;
            const before = e.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2;
            reorderQueue(state.dragSrcQueueId, item.id, before);
        });

        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = state.selectedQueueIds.has(item.id);
        cb.setAttribute('aria-label', `Auswählen: ${item.url}`);
        cb.addEventListener('change', () => {
            if (cb.checked) state.selectedQueueIds.add(item.id); else state.selectedQueueIds.delete(item.id);
            updateQueueSelectionUI();
        });

        const handle = document.createElement('span'); handle.className = 'queue-drag-handle'; handle.textContent = '⋮⋮'; handle.setAttribute('aria-hidden', 'true');

        const moveWrap = document.createElement('div'); moveWrap.className = 'queue-item-move';
        const upBtn = document.createElement('button'); upBtn.className = 'queue-move-btn'; upBtn.textContent = '▲';
        upBtn.setAttribute('aria-label', 'Nach oben verschieben');
        upBtn.disabled = index === 0;
        upBtn.addEventListener('click', () => moveQueueItem(item.id, -1));
        const downBtn = document.createElement('button'); downBtn.className = 'queue-move-btn'; downBtn.textContent = '▼';
        downBtn.setAttribute('aria-label', 'Nach unten verschieben');
        downBtn.disabled = index === state.localQueue.length - 1;
        downBtn.addEventListener('click', () => moveQueueItem(item.id, 1));
        moveWrap.appendChild(upBtn); moveWrap.appendChild(downBtn);

        const info = document.createElement('div'); info.className = 'queue-item-info';
        const urlEl = document.createElement('span'); urlEl.className = 'queue-item-url'; urlEl.textContent = item.url; urlEl.title = item.url;
        info.appendChild(urlEl);
        if (item.customName) {
            const nameEl = document.createElement('span'); nameEl.className = 'queue-item-name'; nameEl.textContent = item.customName;
            info.appendChild(nameEl);
        }
        const rm = document.createElement('button'); rm.className = 'proxy-item-remove'; rm.textContent = '×';
        rm.setAttribute('aria-label', t('aria.remove'));
        rm.addEventListener('click', () => removeQueueItems([item.id]));

        row.appendChild(cb); row.appendChild(handle); row.appendChild(moveWrap); row.appendChild(info); row.appendChild(rm);
        queueList.appendChild(row);
    });
    const count = state.localQueue.length;
    queueCountEl.textContent = `${count} Eintr${count !== 1 ? 'äge' : 'ag'}`;
    updateQueueSelectionUI();
}

export function updateQueueSelectionUI() {
    queueSelectAllCb.classList.remove('hidden');

    // Drop selection ids for items no longer in the queue (e.g. after removal).
    const liveIds = new Set(state.localQueue.map(i => i.id));
    Array.from(state.selectedQueueIds).forEach(id => { if (!liveIds.has(id)) state.selectedQueueIds.delete(id); });

    const selectedCount = state.selectedQueueIds.size;
    queueRemoveSelectedBtn.classList.toggle('hidden', selectedCount === 0);
    queueRemoveSelectedBtn.textContent = selectedCount > 0 ? `Entfernen (${selectedCount})` : 'Entfernen';

    queueSelectAllCb.checked = state.localQueue.length > 0 && selectedCount === state.localQueue.length;
    queueSelectAllCb.indeterminate = selectedCount > 0 && selectedCount < state.localQueue.length;
}

export function toggleQueueSelectAll() {
    if (queueSelectAllCb.checked) {
        state.localQueue.forEach(i => state.selectedQueueIds.add(i.id));
    } else {
        state.selectedQueueIds.clear();
    }
    renderLocalQueue();
}

function moveQueueItem(id, direction) {
    const index = state.localQueue.findIndex(i => i.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= state.localQueue.length) return;
    [state.localQueue[index], state.localQueue[target]] = [state.localQueue[target], state.localQueue[index]];
    renderLocalQueue();
}

function reorderQueue(srcId, targetId, before) {
    const srcIndex = state.localQueue.findIndex(i => i.id === srcId);
    if (srcIndex === -1) return;
    const [item] = state.localQueue.splice(srcIndex, 1);
    let targetIndex = state.localQueue.findIndex(i => i.id === targetId);
    if (targetIndex === -1) targetIndex = state.localQueue.length;
    state.localQueue.splice(before ? targetIndex : targetIndex + 1, 0, item);
    renderLocalQueue();
}

export function removeQueueItems(ids) {
    const idSet = new Set(ids);
    const removed = [];
    state.localQueue.forEach((item, index) => { if (idSet.has(item.id)) removed.push({ item, index }); });
    if (!removed.length) return;
    state.localQueue = state.localQueue.filter(item => !idSet.has(item.id));
    renderLocalQueue();
    state.lastRemovedQueueItems = removed;
    const label = removed.length === 1 ? '1 Eintrag entfernt' : `${removed.length} Einträge entfernt`;
    showToast(label, { label: 'Rückgängig', onClick: undoRemoveQueueItems }, 4000);
}

function undoRemoveQueueItems() {
    if (!state.lastRemovedQueueItems) return;
    state.lastRemovedQueueItems
        .slice()
        .sort((a, b) => a.index - b.index)
        .forEach(({ item, index }) => state.localQueue.splice(Math.min(index, state.localQueue.length), 0, item));
    state.lastRemovedQueueItems = null;
    renderLocalQueue();
}

// ─── Server-side queue progress (read-only view while a batch is active/recent) ───

const QUEUE_STATUS_LABEL = { pending: 'Wartet', active: 'Lädt herunter', done: 'Fertig', error: 'Fehlgeschlagen' };

export function renderServerQueueItems(items) {
    queueList.innerHTML = '';
    queueSelectAllCb.classList.add('hidden');
    queueRemoveSelectedBtn.classList.add('hidden');

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = `queue-item queue-item-server queue-item-status-${item.status}`;

        const dot = document.createElement('span'); dot.className = 'queue-status-dot'; dot.setAttribute('aria-hidden', 'true');

        const info = document.createElement('div'); info.className = 'queue-item-info';
        const urlEl = document.createElement('span'); urlEl.className = 'queue-item-url'; urlEl.textContent = item.url; urlEl.title = item.url;
        info.appendChild(urlEl);
        if (item.customName) {
            const nameEl = document.createElement('span'); nameEl.className = 'queue-item-name'; nameEl.textContent = item.customName;
            info.appendChild(nameEl);
        }
        if (item.status === 'error' && item.error) {
            const errEl = document.createElement('span'); errEl.className = 'queue-item-error'; errEl.textContent = item.error; errEl.title = item.error;
            info.appendChild(errEl);
        }

        row.appendChild(dot); row.appendChild(info);

        if (item.status === 'active' && item.progress) {
            const prog = document.createElement('span'); prog.className = 'queue-item-progress'; prog.textContent = `${item.progress}%`;
            row.appendChild(prog);
        }

        const label = QUEUE_STATUS_LABEL[item.status] || item.status;
        row.setAttribute('role', 'status');
        row.setAttribute('aria-label', `${label}: ${item.customName || item.url}${item.error ? ' — ' + item.error : ''}`);

        queueList.appendChild(row);
    });

    const total = items.length;
    const done = items.filter(i => i.status === 'done').length;
    const errors = items.filter(i => i.status === 'error').length;
    queueCountEl.textContent = errors > 0 ? `${done}/${total} fertig, ${errors} Fehler` : `${done}/${total} fertig`;
}

export async function startQueue() {
    if (!state.localQueue.length) { showToast('Queue ist leer'); return; }
    const items = state.localQueue.map(i => ({ url: i.url, customName: i.customName || null }));
    const result = await api('POST', '/queue', { items });
    if (result.success) {
        state.isDownloading = true; updateDownloadButton();
        state.localQueue = []; state.selectedQueueIds.clear(); state.lastRemovedQueueItems = null; renderLocalQueue();
        showToast(`${result.queued} Downloads gestartet`);
    }
}
