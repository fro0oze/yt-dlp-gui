import { state } from './modules/state.js';
import { applyTranslations } from './modules/i18n.js';
import { api } from './modules/api.js';
import { showToast } from './modules/toast.js';
import { appendToTerminal, clearTerminal } from './modules/terminal.js';
import { switchTab } from './modules/tabs.js';
import { connectWebSocket } from './modules/websocket.js';
import {
    downloadBtn, urlInput, settingsBtn, closeModalBtn, cancelSettingsBtn, saveSettingsBtn, settingsModal,
    mp3Btn, mp4Btn, vpnBtn, subBtn,
    langDownloadBtn, langCancelBtn, closeLangModalBtn, langModal,
    addProxyBtn, appLangSelect, clearTerminalBtn, updateYtDlpBtn,
    cookiesUploadBtn, cookiesFileInput, cookiesRemoveBtn, copyEndpointBtn, shortcutsEndpointEl,
    addToQueueBtn, queueUrlInput, startQueueBtn, queueSelectAllCb, queueRemoveSelectedBtn,
    saveYtPlaylistBtn, ytPlaylistInput, ytBackBtn, ytSelectAll, ytSelectNone, ytEntriesList, ytFilter, ytAddToQueue,
} from './modules/dom.js';
import {
    openSettingsModal, closeSettingsModal, handleSaveSettings, updateFormatButtons,
    toggleVpn, toggleSub, addProxy, handleCookiesUpload, handleCookiesRemove,
    loadSettings, loadCookiesStatus,
} from './modules/settings.js';
import {
    handleDownload, getSelectedLanguages, closeLangModal, startDownload,
} from './modules/download.js';
import {
    addToLocalQueue, startQueue, toggleQueueSelectAll, removeQueueItems,
} from './modules/queue.js';
import {
    loadYtPlaylists, saveYtPlaylist, showYtListView, updateYtCount, filterList, addEntriesFromListToQueue,
} from './modules/playlists.js';

// ─── Event Listeners ──────────────────────────────────────────────────────────

function setupEventListeners() {
    downloadBtn.addEventListener('click', handleDownload);
    urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleDownload(); });

    settingsBtn.addEventListener('click', openSettingsModal);
    closeModalBtn.addEventListener('click', closeSettingsModal);
    cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    saveSettingsBtn.addEventListener('click', handleSaveSettings);
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });

    mp3Btn.addEventListener('click', () => updateFormatButtons('mp3'));
    mp4Btn.addEventListener('click', () => updateFormatButtons('mp4'));
    vpnBtn.addEventListener('click', toggleVpn);
    subBtn.addEventListener('click', toggleSub);

    langDownloadBtn.addEventListener('click', () => {
        const langOptions = getSelectedLanguages();
        closeLangModal();
        startDownload(state.pendingDownloadUrl, langOptions);
        state.pendingDownloadUrl = '';
    });
    langCancelBtn.addEventListener('click', () => { closeLangModal(); state.pendingDownloadUrl = ''; });
    closeLangModalBtn.addEventListener('click', () => { closeLangModal(); state.pendingDownloadUrl = ''; });
    langModal.addEventListener('click', (e) => { if (e.target === langModal) { closeLangModal(); state.pendingDownloadUrl = ''; } });

    addProxyBtn.addEventListener('click', addProxy);
    appLangSelect.addEventListener('change', () => applyTranslations(appLangSelect.value));
    clearTerminalBtn.addEventListener('click', clearTerminal);
    updateYtDlpBtn.addEventListener('click', () => { closeSettingsModal(); api('POST', '/update-ytdlp'); });

    // Cookies
    cookiesUploadBtn.addEventListener('click', () => cookiesFileInput.click());
    cookiesFileInput.addEventListener('change', handleCookiesUpload);
    cookiesRemoveBtn.addEventListener('click', handleCookiesRemove);
    copyEndpointBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(shortcutsEndpointEl.textContent).then(() => showToast('Kopiert!'));
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Queue tab
    addToQueueBtn.addEventListener('click', addToLocalQueue);
    queueUrlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addToLocalQueue(); });
    startQueueBtn.addEventListener('click', startQueue);
    queueSelectAllCb.addEventListener('change', toggleQueueSelectAll);
    queueRemoveSelectedBtn.addEventListener('click', () => removeQueueItems(Array.from(state.selectedQueueIds)));

    // YouTube tab
    saveYtPlaylistBtn.addEventListener('click', saveYtPlaylist);
    ytPlaylistInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveYtPlaylist(); });
    ytBackBtn.addEventListener('click', showYtListView);
    ytSelectAll.addEventListener('click', () => { ytEntriesList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true); updateYtCount(); });
    ytSelectNone.addEventListener('click', () => { ytEntriesList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false); updateYtCount(); });
    ytFilter.addEventListener('input', () => filterList(ytEntriesList, ytFilter.value));
    ytAddToQueue.addEventListener('click', () => addEntriesFromListToQueue(ytEntriesList));
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
    applyTranslations('de');
    connectWebSocket();
    await loadSettings();
    setupEventListeners();
    await Promise.all([loadYtPlaylists(), loadCookiesStatus()]);
    appendToTerminal('[SYSTEM] YouTube Downloader ready.\n\n');
}

// ─── Panel Resize ─────────────────────────────────────────────────────────────

function initResize() {
    const handle   = document.getElementById('resizeHandle');
    const appLeft  = document.querySelector('.app-left');
    const appLayout = document.querySelector('.app-layout');
    if (!handle || !appLeft) return;

    const MIN_WIDTH = 280;
    const MAX_WIDTH = 700;
    const STORAGE_KEY = 'leftPanelWidth';

    // Restore saved width
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) appLeft.style.width = saved + 'px';

    let startX, startWidth;

    handle.addEventListener('mousedown', (e) => {
        startX     = e.clientX;
        startWidth = appLeft.getBoundingClientRect().width;
        handle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        function onMove(e) {
            const delta    = e.clientX - startX;
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
            appLeft.style.width = newWidth + 'px';
        }

        function onUp() {
            handle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            localStorage.setItem(STORAGE_KEY, parseInt(appLeft.style.width));
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

// ─── Start ────────────────────────────────────────────────────────────────────

init();
initResize();
