export default function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-2 gap-4 cursor-pointer">
      <span className="text-text-1">{label}</span>
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-indigo' : 'bg-bg-2'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-text-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </span>
    </label>
  );
}
