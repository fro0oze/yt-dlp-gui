// ─── Modal Accessibility (focus trap + Escape + focus return) ─────────────────
// Generic factory, no app-specific dependencies — each modal wires its own
// element + close callback where it's opened/closed, avoiding circular imports.

export function createModalA11y(modalEl, closeFn) {
    let lastFocused = null;
    function getFocusable() {
        return Array.from(modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
            .filter(el => !el.disabled && el.offsetParent !== null);
    }
    function onKeydown(e) {
        if (e.key === 'Escape') { e.preventDefault(); closeFn(); return; }
        if (e.key !== 'Tab') return;
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    return {
        open() {
            lastFocused = document.activeElement;
            modalEl.addEventListener('keydown', onKeydown);
            const focusable = getFocusable();
            (focusable[0] || modalEl).focus();
        },
        close() {
            modalEl.removeEventListener('keydown', onKeydown);
            if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
        },
    };
}
