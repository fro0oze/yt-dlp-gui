import { queueBadge } from './dom.js';
import { state } from './state.js';
import { appendToTerminal, clearTerminal } from './terminal.js';
import { updateDownloadButton } from './download.js';
import { renderServerQueueItems, renderLocalQueue } from './queue.js';

// ─── WebSocket ───────────────────────────────────────────────────────────────

export function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    state.ws = new WebSocket(`${protocol}//${location.host}/ws`);

    state.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'terminal') {
            appendToTerminal(msg.data);
        } else if (msg.type === 'download-complete') {
            if (msg.data.cancelled || state.queueRemaining === 0) {
                state.isDownloading = false;
                state.lastLineIsProgress = false;
                updateDownloadButton();
            }
            if (msg.data.cancelled || msg.data.success) {
                if (state.currentSettings.clearBetweenItems !== false) setTimeout(clearTerminal, 1500);
            } else {
                appendToTerminal(`[SYSTEM] Download failed (exit code ${msg.data.code})\n`);
            }
        } else if (msg.type === 'queue-update') {
            state.queueRemaining = msg.data.remaining;
            if (state.queueRemaining > 0) {
                queueBadge.textContent = state.queueRemaining;
                queueBadge.classList.remove('hidden');
            } else {
                queueBadge.classList.add('hidden');
                if (!state.isDownloading) updateDownloadButton();
            }
            const items = msg.data.items || [];
            if (items.length > 0) renderServerQueueItems(items); else renderLocalQueue();
        }
    };

    state.ws.onclose = () => { setTimeout(connectWebSocket, 2000); };
}
