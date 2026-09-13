// ─── Toast ────────────────────────────────────────────────────────────────────

export function showToast(message, action, duration) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast'; toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = '';
    toast.appendChild(document.createTextNode(message));
    if (action) {
        const btn = document.createElement('button');
        btn.className = 'toast-action';
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
            action.onClick();
            toast.classList.remove('toast-visible');
            clearTimeout(toast._timeout);
        });
        toast.appendChild(btn);
    }
    toast.classList.remove('toast-visible');
    void toast.offsetWidth;
    toast.classList.add('toast-visible');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('toast-visible'), duration || 2000);
}
