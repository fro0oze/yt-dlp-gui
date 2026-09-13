import {
    urlInput, downloadBtn,
    langModal, langModalTitle, langAudioList, langSubList, langAudioSection, langSubSection,
} from './dom.js';
import { state } from './state.js';
import { api } from './api.js';
import { appendToTerminal } from './terminal.js';
import { TRANSLATIONS } from './i18n.js';
import { createModalA11y } from './modal.js';

const langModalA11y = createModalA11y(langModal, () => closeLangModal());

// ─── Download ─────────────────────────────────────────────────────────────────

export async function handleDownload() {
    if (state.isDownloading) { await api('POST', '/cancel'); return; }
    const url = urlInput.value.trim();
    if (!url) { appendToTerminal('[ERROR] Bitte eine URL eingeben\n\n'); return; }
    if (state.currentSettings.subtitlesEnabled && state.currentSettings.format === 'mp4') {
        state.pendingDownloadUrl = url;
        urlInput.value = '';
        await showLanguagePicker(url);
        return;
    }
    startDownload(url, null);
}

export function openLangModal() {
    langModal.classList.add('active');
    langModalA11y.open();
}

export function closeLangModal() {
    langModal.classList.remove('active');
    langModalA11y.close();
}

async function showLanguagePicker(url) {
    langAudioList.innerHTML = '<div style="color:rgb(var(--c-text-4));font-size:var(--font-12);padding:var(--space-8);">Lädt...</div>';
    langSubList.innerHTML   = '<div style="color:rgb(var(--c-text-4));font-size:var(--font-12);padding:var(--space-8);">Lädt...</div>';
    openLangModal();

    const result = await api('POST', '/languages', { url });
    if (!result.success) {
        closeLangModal();
        startDownload(url, null);
        return;
    }

    if (result.audio.length <= 1 && result.subtitles.length <= 1) {
        closeLangModal();
        startDownload(url, { audio: result.audio.map(a => a.code), subtitles: result.subtitles.map(s => s.code) });
        return;
    }

    if (result.title) langModalTitle.textContent = result.title;

    if (result.audio.length > 0) {
        langAudioSection.style.display = '';
        langAudioList.innerHTML = '';
        result.audio.forEach(lang => langAudioList.appendChild(createLangItem(lang.code, lang.name, false, lang.code === 'de' || lang.code === 'original' || result.audio.length <= 2)));
    } else { langAudioSection.style.display = 'none'; }

    if (result.subtitles.length > 0) {
        langSubSection.style.display = '';
        langSubList.innerHTML = '';
        result.subtitles.forEach(lang => langSubList.appendChild(createLangItem(lang.code, lang.name, lang.auto, lang.code === 'de' || lang.code.startsWith('de'))));
    } else { langSubSection.style.display = 'none'; }
}

function createLangItem(code, name, isAuto, checked) {
    const item = document.createElement('label');
    item.className = 'lang-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.value = code; checkbox.checked = checked;
    const info = document.createElement('div'); info.className = 'lang-item-info';
    const codeEl = document.createElement('span'); codeEl.className = 'lang-item-code'; codeEl.textContent = code;
    const nameEl = document.createElement('span'); nameEl.className = 'lang-item-name'; nameEl.textContent = name !== code ? name : '';
    info.appendChild(codeEl); info.appendChild(nameEl);
    if (isAuto) { const tag = document.createElement('span'); tag.className = 'lang-item-tag auto'; tag.textContent = 'auto'; info.appendChild(tag); }
    item.appendChild(checkbox); item.appendChild(info);
    return item;
}

export function getSelectedLanguages() {
    return {
        audio: Array.from(langAudioList.querySelectorAll('input:checked')).map(cb => cb.value),
        subtitles: Array.from(langSubList.querySelectorAll('input:checked')).map(cb => cb.value),
    };
}

export function startDownload(url, langOptions) {
    state.isDownloading = true;
    updateDownloadButton();
    urlInput.value = '';
    api('POST', '/download', { url, langOptions, customName: null });
}

export function updateDownloadButton() {
    const tr = TRANSLATIONS[state.currentSettings.appLang || 'de'] || TRANSLATIONS.de;
    if (state.isDownloading) {
        downloadBtn.textContent = tr['btn.cancelDownload'];
        downloadBtn.classList.replace('btn-primary', 'btn-danger');
    } else {
        downloadBtn.textContent = tr['btn.download'];
        downloadBtn.classList.replace('btn-danger', 'btn-primary');
    }
}
