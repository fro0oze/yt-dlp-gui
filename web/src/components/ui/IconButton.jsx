const TONE_CLASS = {
  default: 'text-text-2',
  danger: 'text-danger',
};

export default function IconButton({ icon: Icon, label, tone = 'default', className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`w-11 h-11 flex items-center justify-center rounded-lg ${TONE_CLASS[tone] || TONE_CLASS.default} ${className}`}
      {...props}
    >
      <Icon size={20} />
    </button>
  );
}
