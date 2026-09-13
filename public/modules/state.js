// ─── Shared mutable app state ──────────────────────────────────────────────
// A single object so every module mutates the same live reference
// (property assignment, never `state = ...` reassignment).

export const state = {
    currentSettings: {},
    isDownloading: false,
    lastLineIsProgress: false,
    pendingDownloadUrl: '',
    ws: null,
    queueRemaining: 0,
    localQueue: [],
    queueIdCounter: 0,
    selectedQueueIds: new Set(),
    lastRemovedQueueItems: null,
    dragSrcQueueId: null,
};
