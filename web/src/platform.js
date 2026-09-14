const GENERIC = { platform: 'generic', label: 'Generisch', capabilities: { quality: true, subtitles: false, multiAudio: false, playlist: false } };

export function detectPlatform(url) {
  if (!url) return GENERIC;

  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return GENERIC;
  }

  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    return { platform: 'youtube', label: 'YouTube', capabilities: { quality: true, subtitles: true, multiAudio: true, playlist: true } };
  }
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    return { platform: 'instagram', label: 'Instagram', capabilities: { quality: true, subtitles: false, multiAudio: false, playlist: false } };
  }
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    return { platform: 'tiktok', label: 'TikTok', capabilities: { quality: true, subtitles: false, multiAudio: false, playlist: false } };
  }

  return GENERIC;
}

export function isPlaylistUrl(url) {
  if (!url) return false;
  try {
    return new URL(url).searchParams.has('list');
  } catch {
    return false;
  }
}
