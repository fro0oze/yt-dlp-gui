import { terminal } from './dom.js';
import { state } from './state.js';

// ─── Terminal ─────────────────────────────────────────────────────────────────

export function clearTerminal() { terminal.textContent = ''; state.lastLineIsProgress = false; }

export function appendToTerminal(text) {
    if (!text) return;
    if (state.currentSettings.clearBetweenItems !== false) {
        const m = text.match(/\[download\] Downloading item (\d+) of \d+/);
        if (m && parseInt(m[1], 10) > 1) clearTerminal();
    }
    const normalized = text.replace(/\r\n/g, '\n');
    if (normalized.includes('\r')) {
        normalized.split('\r').forEach((part, i) => {
            if (!part) return;
            if (i === 0) { terminal.textContent += part; }
            else {
                const lastNl = terminal.textContent.lastIndexOf('\n');
                terminal.textContent = (lastNl !== -1 ? terminal.textContent.substring(0, lastNl + 1) : '') + part;
            }
        });
        const lastNl = terminal.textContent.lastIndexOf('\n');
        state.lastLineIsProgress = /\[(download|UPDATE)\].*\d+\.?\d*%/.test(terminal.textContent.substring(lastNl + 1));
    } else {
        const isProgress = /\[(download|UPDATE)\].*\d+\.?\d*%/.test(normalized);
        if (isProgress && state.lastLineIsProgress) {
            const lastNl = terminal.textContent.lastIndexOf('\n');
            terminal.textContent = (lastNl !== -1 ? terminal.textContent.substring(0, lastNl + 1) : '') + normalized.trimEnd() + '\n';
        } else {
            terminal.textContent += normalized;
        }
        state.lastLineIsProgress = isProgress;
    }
    terminal.scrollTop = terminal.scrollHeight;
}
