import {
    audioQualitySelect, videoQualitySelect, embedThumbnailCheck, subtitlesEnabledCheck,
    skipExistingCheck, downloadDelayInput, speedLimitInput, proxyInput, customArgsInput,
    verboseCheck, jsRuntimeCheck, clearBetweenItemsCheck, appLangSelect,
    mp3Btn, mp4Btn, subBtn, vpnBtn, proxyListEl,
    settingsModal, shortcutsEndpointEl,
    cookiesStatusBadge, cookiesRemoveBtn, cookiesFileInput,
} from './dom.js';
import { state } from './state.js';
import { api } from './api.js';
import { t, applyTranslations, TRANSLATIONS } from './i18n.js';
import { showToast } from './toast.js';
import { appendToTerminal } from './terminal.js';
import { createModalA11y } from './modal.js';

const settingsModalA11y = createModalA11y(settingsModal, () => closeSettingsModal());

export async function loadSettings() {
    state.currentSettings = await api('GET', '/settings');
    updateSettingsUI();
}

// ─── Settings UI ──────────────────────────────────────────────────────────────

export function updateSettingsUI() {
    audioQualitySelect.value     = state.currentSettings.audioQuality || '192';
    videoQualitySelect.value     = state.currentSettings.videoQuality || 'best';
    embedThumbnailCheck.checked  = !!state.currentSettings.embedThumbnail;
    subtitlesEnabledCheck.checked = !!state.currentSettings.subtitlesEnabled;
    skipExistingCheck.checked    = state.currentSettings.skipExisting !== false;
    downloadDelayInput.value     = state.currentSettings.downloadDelay || '0';
    speedLimitInput.value        = state.currentSettings.speedLimit || '';
    proxyInput.value             = state.currentSettings.proxy || '';
    customArgsInput.value        = state.currentSettings.customArgs || '';
    verboseCheck.checked         = !!state.currentSettings.verbose;
    jsRuntimeCheck.checked       = !!state.currentSettings.jsRuntime;
    clearBetweenItemsCheck.checked = state.currentSettings.clearBetweenItems !== false;
    appLangSelect.value          = state.currentSettings.appLang || 'de';
    applyTranslations(state.currentSettings.appLang || 'de');
    updateFormatButtons(state.currentSettings.format);
    updateVpnButton();
    updateSubButton();
    renderProxyList();
}

export function updateFormatButtons(format) {
    mp3Btn.classList.toggle('active', format === 'mp3');
    mp3Btn.setAttribute('aria-pressed', String(format === 'mp3'));
    mp4Btn.classList.toggle('active', format === 'mp4');
    mp4Btn.setAttribute('aria-pressed', String(format === 'mp4'));
    mp4Btn.textContent = state.currentSettings.subtitlesEnabled ? 'MKV' : 'MP4';
    state.currentSettings.format = format;
    api('POST', '/settings', { format });
}

export function updateSubButton() {
    subBtn.classList.toggle('active', !!state.currentSettings.subtitlesEnabled);
    subBtn.setAttribute('aria-pressed', String(!!state.currentSettings.subtitlesEnabled));
    mp4Btn.textContent = state.currentSettings.subtitlesEnabled ? 'MKV' : 'MP4';
}

export async function toggleSub() {
    state.currentSettings.subtitlesEnabled = !state.currentSettings.subtitlesEnabled;
    updateSubButton();
    await api('POST', '/settings', { subtitlesEnabled: state.currentSettings.subtitlesEnabled });
    showToast(state.currentSettings.subtitlesEnabled ? 'Subtitles ON — MKV' : 'Subtitles OFF — MP4');
}

export function updateVpnButton() {
    const enabled = !!state.currentSettings.proxyEnabled;
    const hasProxy = (state.currentSettings.savedProxies || []).length > 0 || (state.currentSettings.proxy && state.currentSettings.proxy.trim());
    vpnBtn.classList.toggle('active', enabled && hasProxy);
    vpnBtn.setAttribute('aria-pressed', String(enabled && hasProxy));
}

export async function toggleVpn() {
    const proxies = state.currentSettings.savedProxies || [];
    const hasProxy = proxies.length > 0 || (state.currentSettings.proxy && state.currentSettings.proxy.trim());
    if (!hasProxy) { appendToTerminal('[SYSTEM] No proxy configured.\n\n'); return; }
    state.currentSettings.proxyEnabled = !state.currentSettings.proxyEnabled;
    if (state.currentSettings.proxyEnabled && (!state.currentSettings.proxy || !state.currentSettings.proxy.trim()) && proxies.length > 0) {
        state.currentSettings.proxy = proxies[0];
    }
    updateVpnButton();
    await api('POST', '/toggle-proxy', { proxyEnabled: state.currentSettings.proxyEnabled, proxy: state.currentSettings.proxy, savedProxies: state.currentSettings.savedProxies });
    showToast(state.currentSettings.proxyEnabled ? `VPN ON — ${state.currentSettings.proxy}` : 'VPN OFF');
}

// ─── Proxy List ───────────────────────────────────────────────────────────────

function renderProxyList() {
    proxyListEl.innerHTML = '';
    const proxies = state.currentSettings.savedProxies || [];
    proxies.forEach((proxy, index) => {
        const item = document.createElement('div');
        item.className = 'proxy-item' + (state.currentSettings.proxy === proxy ? ' active' : '');

        const urlEl = document.createElement('span');
        urlEl.className = 'proxy-item-url';
        urlEl.textContent = proxy;

        const label = document.createElement('span');
        label.className = 'proxy-item-label';
        if (index === 0) {
            const badge = document.createElement('span');
            badge.className = 'proxy-item-badge';
            badge.textContent = 'DEFAULT';
            label.appendChild(badge);
        }

        const remove = document.createElement('button');
        remove.className = 'proxy-item-remove';
        remove.textContent = '×';
        remove.setAttribute('aria-label', t('aria.remove'));
        remove.style.opacity = '1';
        remove.addEventListener('click', (e) => {
            e.stopPropagation();
            proxies.splice(index, 1);
            state.currentSettings.savedProxies = proxies;
            if (state.currentSettings.proxy === proxy) state.currentSettings.proxy = proxies[0] || '';
            renderProxyList(); updateVpnButton();
            api('POST', '/toggle-proxy', { proxyEnabled: state.currentSettings.proxyEnabled, proxy: state.currentSettings.proxy, savedProxies: proxies });
        });

        item.addEventListener('click', () => {
            proxies.splice(index, 1); proxies.unshift(proxy);
            state.currentSettings.savedProxies = proxies; state.currentSettings.proxy = proxy;
            proxyInput.value = proxy;
            renderProxyList(); updateVpnButton();
            api('POST', '/toggle-proxy', { proxyEnabled: state.currentSettings.proxyEnabled, proxy, savedProxies: proxies });
        });

        item.appendChild(urlEl); item.appendChild(label); item.appendChild(remove);
        proxyListEl.appendChild(item);
    });
}

export function addProxy() {
    const value = proxyInput.value.trim();
    if (!value) return;
    const proxies = state.currentSettings.savedProxies || [];
    if (proxies.includes(value)) return;
    proxies.unshift(value);
    state.currentSettings.savedProxies = proxies; state.currentSettings.proxy = value;
    renderProxyList(); updateVpnButton();
    api('POST', '/toggle-proxy', { proxyEnabled: state.currentSettings.proxyEnabled, proxy: value, savedProxies: proxies });
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

export function openSettingsModal() {
    updateSettingsUI();
    loadCookiesStatus();
    if (shortcutsEndpointEl) shortcutsEndpointEl.textContent = `${location.origin}/api/shortcuts/download`;
    settingsModal.classList.add('active');
    settingsModalA11y.open();
}

export function closeSettingsModal() {
    settingsModal.classList.remove('active');
    settingsModalA11y.close();
}

export async function handleSaveSettings() {
    const newSettings = {
        format: state.currentSettings.format,
        audioQuality: audioQualitySelect.value,
        videoQuality: videoQualitySelect.value,
        embedThumbnail: embedThumbnailCheck.checked,
        subtitlesEnabled: subtitlesEnabledCheck.checked,
        skipExisting: skipExistingCheck.checked,
        downloadDelay: downloadDelayInput.value || '0',
        speedLimit: speedLimitInput.value.trim(),
        proxy: proxyInput.value.trim(),
        proxyEnabled: !!state.currentSettings.proxyEnabled,
        savedProxies: state.currentSettings.savedProxies || [],
        customArgs: customArgsInput.value.trim(),
        verbose: verboseCheck.checked,
        jsRuntime: jsRuntimeCheck.checked,
        clearBetweenItems: clearBetweenItemsCheck.checked,
        appLang: appLangSelect.value,
    };
    const result = await api('POST', '/settings', newSettings);
    if (result.success) {
        state.currentSettings = { ...state.currentSettings, ...newSettings };
        appendToTerminal('[SYSTEM] Einstellungen gespeichert!\n\n');
        closeSettingsModal();
    }
}

// ─── Cookies ──────────────────────────────────────────────────────────────────

export async function loadCookiesStatus() {
    const result = await api('GET', '/cookies-status');
    updateCookiesUI(result.active);
}

function updateCookiesUI(active) {
    if (!cookiesStatusBadge) return;
    const tr = TRANSLATIONS[state.currentSettings.appLang || 'de'] || TRANSLATIONS.de;
    if (active) {
        cookiesStatusBadge.textContent = tr['cookies.active'];
        cookiesStatusBadge.className = 'cookies-status-badge active';
        cookiesRemoveBtn.classList.remove('hidden');
    } else {
        cookiesStatusBadge.textContent = tr['cookies.inactive'];
        cookiesStatusBadge.className = 'cookies-status-badge';
        cookiesRemoveBtn.classList.add('hidden');
    }
}

export function handleCookiesUpload() {
    const file = cookiesFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const res = await fetch('/api/upload-cookies', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: e.target.result });
        const data = await res.json();
        if (data.success) { updateCookiesUI(true); showToast('Cookies gespeichert'); }
        cookiesFileInput.value = '';
    };
    reader.readAsText(file);
}

export async function handleCookiesRemove() {
    const result = await api('DELETE', '/cookies');
    if (result.success) { updateCookiesUI(false); showToast('Cookies entfernt'); }
}
