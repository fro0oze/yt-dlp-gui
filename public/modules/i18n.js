import { state } from './state.js';

// ─── Translations ────────────────────────────────────────────────────────────

const TRANSLATIONS = {
    de: {
        'btn.settings': 'Einstellungen', 'btn.download': 'Download', 'btn.cancelDownload': 'Abbrechen',
        'btn.cancelModal': 'Abbrechen', 'terminal.title': 'Terminal', 'btn.clear': 'Leeren',
        'url.placeholder': 'URL eingeben...', 'modal.title': 'Einstellungen', 'btn.save': 'Speichern',
        'section.audio': 'Audio', 'label.audioQuality': 'Audioqualität',
        'option.audio128': '128 kbps — Klein', 'option.audio192': '192 kbps — Ausgewogen', 'option.audio320': '320 kbps — Beste Qualität',
        'hint.audioQuality': 'Gilt für MP3-Downloads', 'label.embedThumbnail': 'Thumbnail einbetten',
        'hint.embedThumbnail': 'Coverbild einbetten', 'section.video': 'Video',
        'label.videoQuality': 'Videoqualität', 'option.videoBest': 'Beste verfügbar',
        'hint.videoQuality': 'Gilt für MP4-Downloads', 'label.subtitles': 'Untertitel herunterladen',
        'hint.subtitles': 'Eingebettet in MKV', 'section.general': 'Allgemein', 'label.appLang': 'App-Sprache',
        'label.skipExisting': 'Bestehende überspringen', 'hint.skipExisting': 'Bereits heruntergeladene überspringen',
        'label.downloadDelay': 'Pause zwischen Downloads', 'hint.downloadDelay': '0 = deaktiviert',
        'suffix.sec': 'sec', 'label.clearBetween': 'Terminal auto-leeren',
        'hint.clearBetween': 'Nach Downloads leeren', 'label.speedLimit': 'Geschwindigkeitslimit',
        'hint.speedLimit': 'Bandbreite begrenzen', 'placeholder.speedLimit': 'z.B. 5M, 500K — leer = unbegrenzt',
        'section.advanced': 'Erweitert', 'label.proxy': 'Proxy-Server',
        'hint.proxy': 'Proxy nutzen um die IP zu verbergen', 'label.customArgs': 'Eigene Argumente',
        'hint.customArgs': 'Zusätzliche yt-dlp Argumente', 'placeholder.customArgs': 'z.B. --playlist-start 1',
        'label.jsRuntime': 'Deno JS-Runtime', 'hint.jsRuntime': 'Verbessert Erkennung',
        'label.verbose': 'Ausführliche Ausgabe', 'hint.verbose': 'Debug-Infos', 'btn.vpn': 'VPN',
        'section.youtube': 'YouTube Account', 'label.cookies': 'Browser Cookies',
        'hint.cookies': 'Für private Playlists', 'btn.cookiesUpload': 'Hochladen',
        'btn.cookiesRemove': 'Entfernen', 'cookies.active': 'Aktiv', 'cookies.inactive': 'Nicht aktiv',
        'hint.cookiesHow': '"Get cookies.txt LOCALLY" Browser-Extension', 'label.shortcuts': 'iOS Shortcuts Endpoint',
        'hint.shortcuts': 'POST mit {"url": "..."}', 'btn.copy': 'Kopieren',
        'aria.close': 'Schließen', 'aria.addToQueue': 'Zur Warteschlange hinzufügen',
        'aria.savePlaylist': 'Playlist speichern', 'aria.addProxy': 'Proxy hinzufügen', 'aria.remove': 'Entfernen',
        'placeholder.queueUrl': 'URL...', 'aria.queueUrl': 'Download-URL',
        'placeholder.queueName': 'Name (optional)', 'aria.queueName': 'Name (optional)',
        'placeholder.ytPlaylist': 'Playlist URL...', 'aria.ytPlaylist': 'Playlist-URL',
        'placeholder.ytFilter': 'Filtern...', 'aria.ytFilter': 'Videos filtern',
    },
    en: {
        'btn.settings': 'Settings', 'btn.download': 'Download', 'btn.cancelDownload': 'Cancel',
        'btn.cancelModal': 'Cancel', 'terminal.title': 'Terminal', 'btn.clear': 'Clear',
        'url.placeholder': 'Enter URL...', 'modal.title': 'Settings', 'btn.save': 'Save Settings',
        'section.audio': 'Audio', 'label.audioQuality': 'Audio Quality',
        'option.audio128': '128 kbps — Small', 'option.audio192': '192 kbps — Balanced', 'option.audio320': '320 kbps — Best',
        'hint.audioQuality': 'Applied for MP3', 'label.embedThumbnail': 'Embed Thumbnail',
        'hint.embedThumbnail': 'Embed cover art', 'section.video': 'Video',
        'label.videoQuality': 'Video Quality', 'option.videoBest': 'Best Available',
        'hint.videoQuality': 'Applied for MP4', 'label.subtitles': 'Download Subtitles',
        'hint.subtitles': 'Embedded in MKV', 'section.general': 'General', 'label.appLang': 'App Language',
        'label.skipExisting': 'Skip Existing Files', 'hint.skipExisting': 'Skip already downloaded',
        'label.downloadDelay': 'Delay Between Downloads', 'hint.downloadDelay': '0 = disabled',
        'suffix.sec': 'sec', 'label.clearBetween': 'Auto-Clear Terminal',
        'hint.clearBetween': 'Clear after downloads', 'label.speedLimit': 'Speed Limit',
        'hint.speedLimit': 'Limit bandwidth', 'placeholder.speedLimit': 'e.g. 5M, 500K — blank = unlimited',
        'section.advanced': 'Advanced', 'label.proxy': 'Proxy Server',
        'hint.proxy': 'Use proxy to hide your IP', 'label.customArgs': 'Custom Arguments',
        'hint.customArgs': 'Additional yt-dlp arguments', 'placeholder.customArgs': 'e.g. --playlist-start 1',
        'label.jsRuntime': 'Use Deno JS Runtime', 'hint.jsRuntime': 'Improves detection',
        'label.verbose': 'Verbose Output', 'hint.verbose': 'Debug info', 'btn.vpn': 'VPN',
        'section.youtube': 'YouTube Account', 'label.cookies': 'Browser Cookies',
        'hint.cookies': 'For private playlists', 'btn.cookiesUpload': 'Upload',
        'btn.cookiesRemove': 'Remove', 'cookies.active': 'Active', 'cookies.inactive': 'Not active',
        'hint.cookiesHow': '"Get cookies.txt LOCALLY" browser extension', 'label.shortcuts': 'iOS Shortcuts Endpoint',
        'hint.shortcuts': 'POST with {"url": "..."}', 'btn.copy': 'Copy',
        'aria.close': 'Close', 'aria.addToQueue': 'Add to queue',
        'aria.savePlaylist': 'Save playlist', 'aria.addProxy': 'Add proxy', 'aria.remove': 'Remove',
        'placeholder.queueUrl': 'URL...', 'aria.queueUrl': 'Download URL',
        'placeholder.queueName': 'Name (optional)', 'aria.queueName': 'Name (optional)',
        'placeholder.ytPlaylist': 'Playlist URL...', 'aria.ytPlaylist': 'Playlist URL',
        'placeholder.ytFilter': 'Filter...', 'aria.ytFilter': 'Filter videos',
    }
};

export function t(key) {
    const lang = state.currentSettings.appLang || 'de';
    return (TRANSLATIONS[lang] || TRANSLATIONS.de)[key] || key;
}

export function applyTranslations(lang) {
    const tr = TRANSLATIONS[lang] || TRANSLATIONS.de;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (tr[key] !== undefined) el.textContent = tr[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (tr[key] !== undefined) el.placeholder = tr[key];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        if (tr[key] !== undefined) el.setAttribute('aria-label', tr[key]);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (tr[key] !== undefined) el.title = tr[key];
    });
}

export { TRANSLATIONS };
