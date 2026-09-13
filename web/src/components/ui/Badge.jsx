const TONE_CLASS = {
  neutral: 'bg-bg-2 text-text-2',
  active: 'bg-indigo/20 text-indigo',
  success: 'bg-success/20 text-success',
  danger: 'bg-danger/20 text-danger',
};

export default function Badge({ tone = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TONE_CLASS[tone] || TONE_CLASS.neutral}`}>
      {children}
    </span>
  );
}
