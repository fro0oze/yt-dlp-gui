// Translations
const TRANSLATIONS = {
    de: {
        'btn.settings': '⚙️ Einstellungen',
        'btn.download': '⬇️ Download',
        'btn.download.busy': '⏳ Lädt...',
        'btn.openFolder': '📁 Download-Ordner öffnen',
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
        'label.subtitles': 'Untertitel',
        'subtitle.off': 'Aus',
        'subtitle.separate': 'Separate Datei',
        'subtitle.separateHint': '(.vtt neben dem Video)',
        'subtitle.embed': 'Eingebettet',
        'subtitle.embedMp4': 'In MP4 einbetten',
        'subtitle.embedMkv': 'In MKV einbetten',
        'label.subtitleLang': 'Sprache',
        'section.general': 'Allgemein',
        'label.appLang': 'App-Sprache',
        'label.skipExisting': 'Bestehende Dateien überspringen',
        'hint.skipExisting': 'Ordner prüfen — überspringt bereits heruntergeladene Dateien',
        'label.downloadDelay': 'Pause zwischen Downloads',
        'hint.downloadDelay': 'Pause zwischen Playlist-Einträgen (0 = deaktiviert)',
        'suffix.sec': 'sec',
        'label.notify': 'Benachrichtigung bei Abschluss',
        'hint.notify': 'Windows-Benachrichtigung wenn der Download fertig ist',
        'label.clearBetween': 'Terminal zwischen Playlist-Einträgen leeren',
        'hint.clearBetween': 'Terminal-Ausgabe vor jedem neuen Playlist-Eintrag leeren',
        'label.speedLimit': 'Geschwindigkeitslimit',
        'hint.speedLimit': 'Download-Bandbreite begrenzen',
        'placeholder.speedLimit': 'z.B. 5M, 500K — leer = unbegrenzt',
        'section.advanced': 'Erweitert',
        'label.proxy': 'Proxy-Server',
        'hint.proxy': 'Proxy nutzen um die eigene IP zu verbergen',
        'label.customArgs': 'Eigene Argumente',
        'hint.customArgs': 'Zusätzliche yt-dlp Argumente (leerzeichen-getrennt)',
        'placeholder.customArgs': 'z.B. --playlist-start 1 --playlist-end 5',
        'label.jsRuntime': 'Node.js JS-Runtime verwenden',
        'hint.jsRuntime': 'Benötigt installiertes Node.js — verbessert Format-Erkennung',
        'label.verbose': 'Ausführliche Ausgabe',
        'hint.verbose': 'Detaillierte Debug-Infos — Netzwerk, Formate, Extractor',
    },
    en: {
        'btn.settings': '⚙️ Settings',
        'btn.download': '⬇️ Download',
        'btn.download.busy': '⏳ Downloading...',
        'btn.openFolder': '📁 Open Download Folder',
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
        'subtitle.off': 'Off',
        'subtitle.separate': 'Separate file',
        'subtitle.separateHint': '(.vtt alongside video)',
        'subtitle.embed': 'Embedded',
        'subtitle.embedMp4': 'Embed in MP4',
        'subtitle.embedMkv': 'Embed in MKV',
        'label.subtitleLang': 'Language',
        'section.general': 'General',
        'label.appLang': 'App Language',
        'label.skipExisting': 'Skip Existing Files',
        'hint.skipExisting': 'Check download folder before starting — skips if already downloaded',
        'label.downloadDelay': 'Delay Between Downloads',
        'hint.downloadDelay': 'Pause between playlist items to avoid rate limiting (0 = disabled)',
        'suffix.sec': 'sec',
        'label.notify': 'Notify on Completion',
        'hint.notify': 'Windows notification when download finishes',
        'label.clearBetween': 'Clear Between Playlist Items',
        'hint.clearBetween': 'Clear terminal output before each new playlist item',
        'label.speedLimit': 'Speed Limit',
        'hint.speedLimit': 'Limit download bandwidth',
        'placeholder.speedLimit': 'e.g. 5M, 500K — blank = unlimited',
        'section.advanced': 'Advanced',
        'label.proxy': 'Proxy Server',
        'hint.proxy': 'Use proxy to hide your IP',
        'label.customArgs': 'Custom Arguments',
        'hint.customArgs': 'Additional yt-dlp arguments (space-separated)',
        'placeholder.customArgs': 'e.g., --playlist-start 1 --playlist-end 5',
        'label.jsRuntime': 'Use Node.js JS Runtime',
        'hint.jsRuntime': 'Requires Node.js installed — improves format extraction for some videos',
        'label.verbose': 'Verbose Output',
        'hint.verbose': 'Show detailed debug info — network requests, format selection, extractor internals',
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
const subtitleEmbedOptions = document.getElementById('subtitleEmbedOptions');
const subtitleLangGroup = document.getElementById('subtitleLangGroup');
const subtitleLangSelect = document.getElementById('subtitleLang');
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

// State
let currentSettings = {};
let isDownloading = false;
let lastLineIsProgress = false;

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
    const subtitleMode = currentSettings.subtitleMode || 'off';
    const subtitleRadio = document.querySelector(`input[name="subtitleMode"][value="${subtitleMode === 'embed-mkv' ? 'embed' : subtitleMode}"]`);
    if (subtitleRadio) subtitleRadio.checked = true;
    const embedFormat = subtitleMode === 'embed-mkv' ? 'mkv' : 'mp4';
    const embedFormatRadio = document.querySelector(`input[name="subtitleEmbedFormat"][value="${embedFormat}"]`);
    if (embedFormatRadio) embedFormatRadio.checked = true;
    subtitleEmbedOptions.classList.toggle('hidden', subtitleMode !== 'embed' && subtitleMode !== 'embed-mkv');
    subtitleLangGroup.classList.toggle('hidden', subtitleMode === 'off');
    subtitleLangSelect.value = currentSettings.subtitleLang || 'de';
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
}

// Update active state of format buttons
function updateFormatButtons(format) {
    mp3Btn.classList.toggle('active', format === 'mp3');
    mp4Btn.classList.toggle('active', format === 'mp4');
    
    const activeFormat = mp3Btn.classList.contains('active') ? 'mp3' : 'mp4';
    window.electronAPI.updateFormat(activeFormat);
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

    // App language — live preview
    appLangSelect.addEventListener('change', () => {
        applyTranslations(appLangSelect.value);
    });

    // Subtitle mode — show/hide embed sub-options and language selector
    document.querySelectorAll('input[name="subtitleMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            subtitleEmbedOptions.classList.toggle('hidden', radio.value !== 'embed');
            subtitleLangGroup.classList.toggle('hidden', radio.value === 'off');
        });
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

        if (result.success) {
            setTimeout(clearTerminal, 1500);
        } else {
            appendToTerminal(`[SYSTEM] Download failed (exit code ${result.code})\n`);
        }
    });
}

// Handle download
async function handleDownload() {
    const url = urlInput.value.trim();

    if (!url) {
        appendToTerminal('[ERROR] Please enter a valid URL\n\n');
        return;
    }

    if (isDownloading) {
        appendToTerminal('[WARNING] A download is already in progress\n\n');
        return;
    }

    isDownloading = true;
    updateDownloadButton();

    await window.electronAPI.startDownload(url);

    // Clear input after starting download
    urlInput.value = '';
}

// Update download button state
function updateDownloadButton() {
    const t = TRANSLATIONS[currentSettings.appLang || 'de'] || TRANSLATIONS.de;
    if (isDownloading) {
        downloadBtn.textContent = t['btn.download.busy'];
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.6';
        downloadBtn.style.cursor = 'not-allowed';
    } else {
        downloadBtn.textContent = t['btn.download'];
        downloadBtn.disabled = false;
        downloadBtn.style.opacity = '1';
        downloadBtn.style.cursor = 'pointer';
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
        lastLineIsProgress = /\[download\]\s+\d+\.?\d*%/.test(lastLine);
    } else {
        // No \r: use progress-detection to overwrite the previous progress line
        const isProgress = /\[download\]\s+\d+\.?\d*%/.test(normalized);

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
        subtitleMode: (() => {
            const mode = document.querySelector('input[name="subtitleMode"]:checked')?.value || 'off';
            if (mode === 'embed') {
                return document.querySelector('input[name="subtitleEmbedFormat"]:checked')?.value === 'mkv' ? 'embed-mkv' : 'embed';
            }
            return mode;
        })(),
        subtitleLang: subtitleLangSelect.value,
        skipExisting: skipExistingCheck.checked,
        downloadDelay: downloadDelayInput.value || '0',
        notifyOnComplete: notifyOnCompleteCheck.checked,
        speedLimit: speedLimitInput.value.trim(),
        proxy: proxyInput.value.trim(),
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
