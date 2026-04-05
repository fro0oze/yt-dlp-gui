// Translations
const TRANSLATIONS = {
    de: {
        'btn.settings': '⚙️ Einstellungen',
        'btn.download': '⬇️ Download',
        'btn.download.busy': '⏳ Lädt...',
        'btn.cancel': '✖ Abbrechen',
        'btn.openFolder': '📁 Download-Ordner öffnen',
        'btn.changeFolder': '📂 Ordner wählen',
        'btn.exit': '❌ Beenden',
        'terminal.title': 'Terminal',
        'btn.clear': 'Leeren',
        'url.placeholder': 'URL eingeben...',
        'modal.title': 'Einstellungen',
        'btn.save': 'Einstellungen speichern',
        'btn.cancel': 'Abbrechen',
        'btn.checkUpdate': '↑ Auf Updates prüfen',
        'btn.browse': 'Durchsuchen',
        'label.downloadPath': 'Download-Pfad',
        'hint.downloadPath': 'Standard: Desktop',
        'section.audio': 'Audio',
        'label.audioQuality': 'Audioqualität',
        'option.audio128': '128 kbps — Klein',
        'option.audio192': '192 kbps — Ausgewogen',
        'option.audio320': '320 kbps — Beste Qualität',
        'hint.audioQuality': 'Gilt für MP3-Downloads',
        'label.embedThumbnail': 'Thumbnail einbetten',
        'hint.embedThumbnail': 'Coverbild in die heruntergeladene Datei einbetten',
        'section.video': 'Video',
        'label.videoQuality': 'Videoqualität',
        'option.videoBest': 'Beste verfügbar',
        'hint.videoQuality': 'Gilt für MP4-Downloads',
        'label.subtitles': 'Untertitel herunterladen',
        'hint.subtitles': 'Deutsch + Originalsprache eingebettet in MKV',
        'section.general': 'Allgemein',
        'label.appLang': 'App-Sprache',
        'label.skipExisting': 'Bestehende Dateien überspringen',
        'hint.skipExisting': 'Ordner prüfen — überspringt bereits heruntergeladene Dateien',
        'label.downloadDelay': 'Pause zwischen Downloads',
        'hint.downloadDelay': 'Pause zwischen Playlist-Einträgen (0 = deaktiviert)',
        'suffix.sec': 'sec',
        'label.notify': 'Benachrichtigung bei Abschluss',
        'hint.notify': 'Windows-Benachrichtigung wenn der Download fertig ist',
        'label.clearBetween': 'Terminal automatisch leeren',
        'hint.clearBetween': 'Terminal nach Downloads, Abbruch und zwischen Playlist-Einträgen leeren',
        'label.speedLimit': 'Geschwindigkeitslimit',
        'hint.speedLimit': 'Download-Bandbreite begrenzen',
        'placeholder.speedLimit': 'z.B. 5M, 500K — leer = unbegrenzt',
        'section.advanced': 'Erweitert',
        'label.proxy': 'Proxy-Server',
        'hint.proxy': 'Proxy nutzen um die eigene IP zu verbergen',
        'label.customArgs': 'Eigene Argumente',
        'hint.customArgs': 'Zusätzliche yt-dlp Argumente (leerzeichen-getrennt)',
        'placeholder.customArgs': 'z.B. --playlist-start 1 --playlist-end 5',
        'label.jsRuntime': 'Deno JS-Runtime verwenden',
        'hint.jsRuntime': 'Wird automatisch heruntergeladen — verbessert Format- & Sprach-Erkennung',
        'label.verbose': 'Ausführliche Ausgabe',
        'hint.verbose': 'Detaillierte Debug-Infos — Netzwerk, Formate, Extractor',
        'btn.vpn': 'VPN',
    },
    en: {
        'btn.settings': '⚙️ Settings',
        'btn.download': '⬇️ Download',
        'btn.download.busy': '⏳ Downloading...',
        'btn.cancel': '✖ Cancel',
        'btn.openFolder': '📁 Open Download Folder',
        'btn.changeFolder': '📂 Change Folder',
        'btn.exit': '❌ Exit',
        'terminal.title': 'Terminal Output',
        'btn.clear': 'Clear',
        'url.placeholder': 'Enter URL...',
        'modal.title': 'Settings',
        'btn.save': 'Save Settings',
        'btn.cancel': 'Cancel',
        'btn.checkUpdate': '↑ Check for Updates',
        'btn.browse': 'Browse',
        'label.downloadPath': 'Download Path',
        'hint.downloadPath': 'Default: User Desktop',
        'section.audio': 'Audio',
        'label.audioQuality': 'Audio Quality',
        'option.audio128': '128 kbps — Small file size',
        'option.audio192': '192 kbps — Balanced',
        'option.audio320': '320 kbps — Best quality',
        'hint.audioQuality': 'Applied when downloading as MP3',
        'label.embedThumbnail': 'Embed Thumbnail',
        'hint.embedThumbnail': 'Embed cover art into the downloaded file',
        'section.video': 'Video',
        'label.videoQuality': 'Video Quality',
        'option.videoBest': 'Best Available',
        'hint.videoQuality': 'Applied when downloading as MP4',
        'label.subtitles': 'Download Subtitles',
        'hint.subtitles': 'German + original language embedded in MKV',
        'section.general': 'General',
        'label.appLang': 'App Language',
        'label.skipExisting': 'Skip Existing Files',
        'hint.skipExisting': 'Check download folder before starting — skips if already downloaded',
        'label.downloadDelay': 'Delay Between Downloads',
        'hint.downloadDelay': 'Pause between playlist items to avoid rate limiting (0 = disabled)',
        'suffix.sec': 'sec',
        'label.notify': 'Notify on Completion',
        'hint.notify': 'Windows notification when download finishes',
        'label.clearBetween': 'Auto-Clear Terminal',
        'hint.clearBetween': 'Clear terminal after downloads, cancellation, and between playlist items',
        'label.speedLimit': 'Speed Limit',
        'hint.speedLimit': 'Limit download bandwidth',
        'placeholder.speedLimit': 'e.g. 5M, 500K — blank = unlimited',
        'section.advanced': 'Advanced',
        'label.proxy': 'Proxy Server',
        'hint.proxy': 'Use proxy to hide your IP',
        'label.customArgs': 'Custom Arguments',
        'hint.customArgs': 'Additional yt-dlp arguments (space-separated)',
        'placeholder.customArgs': 'e.g., --playlist-start 1 --playlist-end 5',
        'label.jsRuntime': 'Use Deno JS Runtime',
        'hint.jsRuntime': 'Auto-downloaded — improves format & language extraction',
        'label.verbose': 'Verbose Output',
        'hint.verbose': 'Show detailed debug info — network requests, format selection, extractor internals',
        'btn.vpn': 'VPN',
    }
};

function applyTranslations(lang) {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.de;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key] !== undefined) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key] !== undefined) el.placeholder = t[key];
    });
}

// DOM Elements
const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const mp3Btn = document.getElementById('mp3Btn');
const mp4Btn = document.getElementById('mp4Btn');
const openFolderBtn = document.getElementById('openFolderBtn');
const changeFolderBtn = document.getElementById('changeFolderBtn');
const exitBtn = document.getElementById('exitBtn');
const settingsBtn = document.getElementById('settingsBtn');
const terminal = document.getElementById('terminal');
const clearTerminalBtn = document.getElementById('clearTerminalBtn');
const appVersionEl = document.getElementById('appVersion');
const checkUpdateBtn = document.getElementById('checkUpdateBtn');

// Modal Elements
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const downloadPathInput = document.getElementById('downloadPath');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const audioQualitySelect = document.getElementById('audioQuality');
const videoQualitySelect = document.getElementById('videoQuality');
const embedThumbnailCheck = document.getElementById('embedThumbnail');
const subtitlesEnabledCheck = document.getElementById('subtitlesEnabled');
const skipExistingCheck = document.getElementById('skipExisting');
const downloadDelayInput = document.getElementById('downloadDelay');
const notifyOnCompleteCheck = document.getElementById('notifyOnComplete');
const speedLimitInput = document.getElementById('speedLimit');
const proxyInput = document.getElementById('proxyInput');
const customArgsInput = document.getElementById('customArgs');
const verboseCheck = document.getElementById('verbose');
const jsRuntimeCheck = document.getElementById('jsRuntime');
const clearBetweenItemsCheck = document.getElementById('clearBetweenItems');
const appLangSelect = document.getElementById('appLang');
const vpnBtn = document.getElementById('vpnBtn');
const subBtn = document.getElementById('subBtn');
const addProxyBtn = document.getElementById('addProxyBtn');
const proxyListEl = document.getElementById('proxyList');

// Language Modal Elements
const langModal = document.getElementById('langModal');
const langModalTitle = document.getElementById('langModalTitle');
const closeLangModalBtn = document.getElementById('closeLangModalBtn');
const langDownloadBtn = document.getElementById('langDownloadBtn');
const langCancelBtn = document.getElementById('langCancelBtn');
const langAudioList = document.getElementById('langAudioList');
const langSubList = document.getElementById('langSubList');
const langAudioSection = document.getElementById('langAudioSection');
const langSubSection = document.getElementById('langSubSection');

// State
let currentSettings = {};
let isDownloading = false;
let lastLineIsProgress = false;
let pendingDownloadUrl = '';

// Initialize
async function init() {
    applyTranslations('de'); // apply default language immediately before settings load
    await loadSettings();
    setupEventListeners();
    setupIpcListeners();
    const version = await window.electronAPI.getAppVersion();
    appVersionEl.textContent = `v${version}`;
    appendToTerminal('[SYSTEM] YouTube Downloader initialized. Ready for downloads!\n\n');
}

// Load settings from electron-store
async function loadSettings() {
    currentSettings = await window.electronAPI.getSettings();
    updateSettingsUI();
}

// Update settings UI with current values
function updateSettingsUI() {
    downloadPathInput.value = currentSettings.downloadPath;
    audioQualitySelect.value = currentSettings.audioQuality || '192';
    videoQualitySelect.value = currentSettings.videoQuality || 'best';
    embedThumbnailCheck.checked = !!currentSettings.embedThumbnail;
    subtitlesEnabledCheck.checked = !!currentSettings.subtitlesEnabled;
    skipExistingCheck.checked = currentSettings.skipExisting !== false;
    downloadDelayInput.value = currentSettings.downloadDelay || '0';
    notifyOnCompleteCheck.checked = currentSettings.notifyOnComplete !== false;
    speedLimitInput.value = currentSettings.speedLimit || '';
    proxyInput.value = currentSettings.proxy || '';
    customArgsInput.value = currentSettings.customArgs || '';
    verboseCheck.checked = !!currentSettings.verbose;
    jsRuntimeCheck.checked = !!currentSettings.jsRuntime;
    clearBetweenItemsCheck.checked = currentSettings.clearBetweenItems !== false;
    appLangSelect.value = currentSettings.appLang || 'de';
    applyTranslations(currentSettings.appLang || 'de');
    updateFormatButtons(currentSettings.format);
    updateVpnButton();
    updateSubButton();
    renderProxyList();
}

// Update active state of format buttons
function updateFormatButtons(format) {
    mp3Btn.classList.toggle('active', format === 'mp3');
    mp4Btn.classList.toggle('active', format === 'mp4');
    mp4Btn.textContent = currentSettings.subtitlesEnabled ? 'MKV' : 'MP4';

    const activeFormat = mp3Btn.classList.contains('active') ? 'mp3' : 'mp4';
    window.electronAPI.updateFormat(activeFormat);
}

// Update SUB button state and MP4/MKV label
function updateSubButton() {
    subBtn.classList.toggle('active', !!currentSettings.subtitlesEnabled);
    mp4Btn.textContent = currentSettings.subtitlesEnabled ? 'MKV' : 'MP4';
}

// Toggle subtitles on/off
async function toggleSub() {
    currentSettings.subtitlesEnabled = !currentSettings.subtitlesEnabled;
    updateSubButton();
    await window.electronAPI.saveSettings(currentSettings);
    showToast(currentSettings.subtitlesEnabled ? 'Subtitles ON — MKV' : 'Subtitles OFF — MP4');
}

// Update VPN button state
function updateVpnButton() {
    const enabled = !!currentSettings.proxyEnabled;
    const hasProxy = (currentSettings.savedProxies || []).length > 0 || (currentSettings.proxy && currentSettings.proxy.trim());
    vpnBtn.classList.toggle('active', enabled && hasProxy);
}

// Toggle VPN on/off
async function toggleVpn() {
    const proxies = currentSettings.savedProxies || [];
    const hasProxy = proxies.length > 0 || (currentSettings.proxy && currentSettings.proxy.trim());
    if (!hasProxy) {
        appendToTerminal('[SYSTEM] No proxy configured. Add a proxy in Settings first.\n\n');
        return;
    }
    currentSettings.proxyEnabled = !currentSettings.proxyEnabled;
    // If enabling and no active proxy set but savedProxies exist, use the first one
    if (currentSettings.proxyEnabled && (!currentSettings.proxy || !currentSettings.proxy.trim()) && proxies.length > 0) {
        currentSettings.proxy = proxies[0];
    }
    updateVpnButton();
    await window.electronAPI.toggleProxy({
        proxyEnabled: currentSettings.proxyEnabled,
        proxy: currentSettings.proxy,
        savedProxies: currentSettings.savedProxies,
    });
    if (currentSettings.proxyEnabled) {
        showToast(`VPN ON — ${currentSettings.proxy}`);
    } else {
        showToast('VPN OFF');
    }
}

// Render proxy list in settings
function renderProxyList() {
    proxyListEl.innerHTML = '';
    const proxies = currentSettings.savedProxies || [];
    proxies.forEach((proxy, index) => {
        const item = document.createElement('div');
        item.className = 'proxy-item' + (currentSettings.proxy === proxy ? ' active' : '');

        const url = document.createElement('span');
        url.className = 'proxy-item-url';
        url.textContent = proxy;

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
        remove.textContent = '\u00d7';
        remove.title = 'Remove';
        remove.addEventListener('click', (e) => {
            e.stopPropagation();
            proxies.splice(index, 1);
            currentSettings.savedProxies = proxies;
            if (currentSettings.proxy === proxy) {
                currentSettings.proxy = proxies[0] || '';
                proxyInput.value = currentSettings.proxy;
            }
            renderProxyList();
            updateVpnButton();
            window.electronAPI.toggleProxy({ proxyEnabled: currentSettings.proxyEnabled, proxy: currentSettings.proxy, savedProxies: proxies });
        });

        item.addEventListener('click', () => {
            // Move to top (make default/active)
            proxies.splice(index, 1);
            proxies.unshift(proxy);
            currentSettings.savedProxies = proxies;
            currentSettings.proxy = proxy;
            proxyInput.value = proxy;
            renderProxyList();
            updateVpnButton();
            window.electronAPI.toggleProxy({ proxyEnabled: currentSettings.proxyEnabled, proxy: proxy, savedProxies: proxies });
        });

        item.appendChild(url);
        item.appendChild(label);
        item.appendChild(remove);
        proxyListEl.appendChild(item);
    });
}

// Add proxy to saved list
function addProxy() {
    const value = proxyInput.value.trim();
    if (!value) return;
    const proxies = currentSettings.savedProxies || [];
    if (proxies.includes(value)) return;
    proxies.unshift(value);
    currentSettings.savedProxies = proxies;
    currentSettings.proxy = value;
    renderProxyList();
    updateVpnButton();
    window.electronAPI.toggleProxy({ proxyEnabled: currentSettings.proxyEnabled, proxy: value, savedProxies: proxies });
}

// Show a brief toast notification
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('toast-visible');
    // force reflow to restart animation
    void toast.offsetWidth;
    toast.classList.add('toast-visible');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('toast-visible'), 2000);
}

// Setup Event Listeners
function setupEventListeners() {
    // Download button
    downloadBtn.addEventListener('click', handleDownload);

    // Enter key in URL input
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleDownload();
        }
    });

    // Open folder button
    openFolderBtn.addEventListener('click', async () => {
        await window.electronAPI.openFolder();
    });

    // Change folder button
    changeFolderBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.selectFolder();
        if (result.success) {
            currentSettings.downloadPath = result.path;
            downloadPathInput.value = result.path;
            await window.electronAPI.saveSettings(currentSettings);
            showToast(`Folder: ${result.path}`);
        }
    });

    // Exit button
    exitBtn.addEventListener('click', () => {
        window.close();
    });

    // Settings button
    settingsBtn.addEventListener('click', openSettingsModal);

    // Modal close buttons
    closeModalBtn.addEventListener('click', closeSettingsModal);
    cancelSettingsBtn.addEventListener('click', closeSettingsModal);

    // Save settings button
    saveSettingsBtn.addEventListener('click', handleSaveSettings);

    // Select folder button
    selectFolderBtn.addEventListener('click', handleSelectFolder);

    // Check for updates button
    checkUpdateBtn.addEventListener('click', async () => {
        closeSettingsModal();
        await window.electronAPI.checkForUpdates();
    });

    // Format toggle buttons
    mp3Btn.addEventListener('click', () => {
        currentSettings.format = 'mp3';
        updateFormatButtons('mp3');
    });

    mp4Btn.addEventListener('click', () => {
        currentSettings.format = 'mp4';
        updateFormatButtons('mp4');
    });

    // VPN toggle button
    vpnBtn.addEventListener('click', toggleVpn);

    // SUB toggle button
    subBtn.addEventListener('click', toggleSub);

    // Language modal
    langDownloadBtn.addEventListener('click', () => {
        const langOptions = getSelectedLanguages();
        langModal.classList.remove('active');
        startDownload(pendingDownloadUrl, langOptions);
        pendingDownloadUrl = '';
    });
    langCancelBtn.addEventListener('click', () => {
        langModal.classList.remove('active');
        pendingDownloadUrl = '';
    });
    closeLangModalBtn.addEventListener('click', () => {
        langModal.classList.remove('active');
        pendingDownloadUrl = '';
    });
    langModal.addEventListener('click', (e) => {
        if (e.target === langModal) {
            langModal.classList.remove('active');
            pendingDownloadUrl = '';
        }
    });

    // Add proxy button
    addProxyBtn.addEventListener('click', addProxy);

    // App language — live preview
    appLangSelect.addEventListener('change', () => {
        applyTranslations(appLangSelect.value);
    });

    // Clear terminal button
    clearTerminalBtn.addEventListener('click', clearTerminal);

    // Close modal on outside click
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });
}

// Setup IPC Listeners
function setupIpcListeners() {
    // Terminal output
    window.electronAPI.onTerminalOutput((data) => {
        appendToTerminal(data);
    });

    // Download complete (success or failure)
    window.electronAPI.onDownloadComplete((result) => {
        isDownloading = false;
        lastLineIsProgress = false;
        updateDownloadButton();

        if (result.cancelled) {
            if (currentSettings.clearBetweenItems !== false) setTimeout(clearTerminal, 1500);
        } else if (result.success) {
            if (currentSettings.clearBetweenItems !== false) setTimeout(clearTerminal, 1500);
        } else {
            appendToTerminal(`[SYSTEM] Download failed (exit code ${result.code})\n`);
        }
    });
}

// Handle download
async function handleDownload() {
    if (isDownloading) {
        await window.electronAPI.cancelDownload();
        return;
    }

    const url = urlInput.value.trim();

    if (!url) {
        appendToTerminal('[ERROR] Please enter a valid URL\n\n');
        return;
    }

    // If subtitles enabled + video format → show language picker
    if (currentSettings.subtitlesEnabled && currentSettings.format === 'mp4') {
        pendingDownloadUrl = url;
        urlInput.value = '';
        await showLanguagePicker(url);
        return;
    }

    startDownload(url, null);
}

// Show language picker modal
async function showLanguagePicker(url) {
    langAudioList.innerHTML = '<div style="color:#52525b;font-size:12px;padding:8px;">Loading...</div>';
    langSubList.innerHTML = '<div style="color:#52525b;font-size:12px;padding:8px;">Loading...</div>';
    langModal.classList.add('active');

    const result = await window.electronAPI.listLanguages(url);

    if (!result.success) {
        langModal.classList.remove('active');
        appendToTerminal('[ERROR] Could not detect languages. Downloading with defaults...\n\n');
        startDownload(url, null);
        return;
    }

    // Only 1 audio track and ≤1 subtitle → skip picker, download directly
    if (result.audio.length <= 1 && result.subtitles.length <= 1) {
        langModal.classList.remove('active');
        const langOptions = {
            audio: result.audio.map(a => a.code),
            subtitles: result.subtitles.map(s => s.code),
        };
        startDownload(url, langOptions);
        return;
    }

    if (result.title) {
        langModalTitle.textContent = result.title;
    }

    // Render audio languages
    if (result.audio.length > 0) {
        langAudioSection.style.display = '';
        langAudioList.innerHTML = '';
        result.audio.forEach(lang => {
            const preselect = lang.code === 'de' || lang.code === 'original' || result.audio.length <= 2;
            langAudioList.appendChild(createLangItem(lang.code, lang.name, false, preselect));
        });
    } else {
        langAudioSection.style.display = 'none';
    }

    // Render subtitle languages
    if (result.subtitles.length > 0) {
        langSubSection.style.display = '';
        langSubList.innerHTML = '';
        result.subtitles.forEach(lang => {
            const preselect = lang.code === 'de' || lang.code.startsWith('de');
            langSubList.appendChild(createLangItem(lang.code, lang.name, lang.auto, preselect));
        });
    } else {
        langSubSection.style.display = 'none';
    }
}

// Create a language list item with checkbox
function createLangItem(code, name, isAuto, checked) {
    const item = document.createElement('label');
    item.className = 'lang-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = code;
    checkbox.checked = checked;

    const info = document.createElement('div');
    info.className = 'lang-item-info';

    const codeEl = document.createElement('span');
    codeEl.className = 'lang-item-code';
    codeEl.textContent = code;

    const nameEl = document.createElement('span');
    nameEl.className = 'lang-item-name';
    nameEl.textContent = name !== code ? name : '';

    info.appendChild(codeEl);
    info.appendChild(nameEl);

    if (isAuto) {
        const tag = document.createElement('span');
        tag.className = 'lang-item-tag auto';
        tag.textContent = 'auto';
        info.appendChild(tag);
    }

    item.appendChild(checkbox);
    item.appendChild(info);
    return item;
}

// Get selected languages from the picker
function getSelectedLanguages() {
    const audio = Array.from(langAudioList.querySelectorAll('input:checked')).map(cb => cb.value);
    const subtitles = Array.from(langSubList.querySelectorAll('input:checked')).map(cb => cb.value);
    return { audio, subtitles };
}

// Start the actual download
function startDownload(url, langOptions) {
    isDownloading = true;
    updateDownloadButton();
    urlInput.value = '';
    window.electronAPI.startDownload(url, langOptions);
}

// Update download button state
function updateDownloadButton() {
    const t = TRANSLATIONS[currentSettings.appLang || 'de'] || TRANSLATIONS.de;
    if (isDownloading) {
        downloadBtn.textContent = t['btn.cancel'];
        downloadBtn.classList.remove('btn-primary', 'btn-disabled');
        downloadBtn.classList.add('btn-danger');
        downloadBtn.disabled = false;
    } else {
        downloadBtn.textContent = t['btn.download'];
        downloadBtn.classList.remove('btn-danger');
        downloadBtn.classList.add('btn-primary');
        downloadBtn.disabled = false;
    }
}

// Clear terminal and reset progress tracking
function clearTerminal() {
    terminal.textContent = '';
    lastLineIsProgress = false;
}

// Append text to terminal — handles \r (overwrite) and progress-line deduplication
function appendToTerminal(text) {
    if (!text) return;

    // Clear terminal between playlist items (item 2, 3, ... of N)
    if (currentSettings.clearBetweenItems !== false) {
        const playlistItemMatch = text.match(/\[download\] Downloading item (\d+) of \d+/);
        if (playlistItemMatch && parseInt(playlistItemMatch[1], 10) > 1) {
            clearTerminal();
        }
    }

    // Normalize \r\n → \n, then split on remaining \r (cursor-to-line-start signal)
    const normalized = text.replace(/\r\n/g, '\n');

    if (normalized.includes('\r')) {
        // yt-dlp uses \r to overwrite the current line in-place
        normalized.split('\r').forEach((part, i) => {
            if (!part) return;
            if (i === 0) {
                terminal.textContent += part;
            } else {
                // Overwrite everything after the last newline
                const lastNl = terminal.textContent.lastIndexOf('\n');
                terminal.textContent = (lastNl !== -1 ? terminal.textContent.substring(0, lastNl + 1) : '') + part;
            }
        });
        const lastNl = terminal.textContent.lastIndexOf('\n');
        const lastLine = terminal.textContent.substring(lastNl + 1);
        lastLineIsProgress = /\[(download|UPDATE)\].*\d+\.?\d*%/.test(lastLine);
    } else {
        // No \r: use progress-detection to overwrite the previous progress line
        const isProgress = /\[(download|UPDATE)\].*\d+\.?\d*%/.test(normalized);

        if (isProgress && lastLineIsProgress) {
            const lastNl = terminal.textContent.lastIndexOf('\n');
            terminal.textContent = (lastNl !== -1 ? terminal.textContent.substring(0, lastNl + 1) : '')
                + normalized.trimEnd() + '\n';
        } else {
            terminal.textContent += normalized;
        }
        lastLineIsProgress = isProgress;
    }

    terminal.scrollTop = terminal.scrollHeight;
}

// Open settings modal
function openSettingsModal() {
    updateSettingsUI();
    settingsModal.classList.add('active');
}

// Close settings modal
function closeSettingsModal() {
    settingsModal.classList.remove('active');
}

// Handle save settings
async function handleSaveSettings() {
    const newSettings = {
        downloadPath: downloadPathInput.value,
        format: currentSettings.format,
        audioQuality: audioQualitySelect.value,
        videoQuality: videoQualitySelect.value,
        embedThumbnail: embedThumbnailCheck.checked,
        subtitlesEnabled: subtitlesEnabledCheck.checked,
        skipExisting: skipExistingCheck.checked,
        downloadDelay: downloadDelayInput.value || '0',
        notifyOnComplete: notifyOnCompleteCheck.checked,
        speedLimit: speedLimitInput.value.trim(),
        proxy: proxyInput.value.trim(),
        proxyEnabled: !!currentSettings.proxyEnabled,
        savedProxies: currentSettings.savedProxies || [],
        customArgs: customArgsInput.value.trim(),
        verbose: verboseCheck.checked,
        jsRuntime: jsRuntimeCheck.checked,
        clearBetweenItems: clearBetweenItemsCheck.checked,
        appLang: appLangSelect.value,
    };

    const result = await window.electronAPI.saveSettings(newSettings);

    if (result.success) {
        currentSettings = newSettings;
        appendToTerminal('[SYSTEM] Settings saved successfully!\n\n');
        closeSettingsModal();
    } else {
        appendToTerminal('[ERROR] Failed to save settings\n\n');
    }
}

// Handle folder selection
async function handleSelectFolder() {
    const result = await window.electronAPI.selectFolder();

    if (result.success) {
        downloadPathInput.value = result.path;
    }
}

// Initialize on load
init();
