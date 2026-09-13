const VARIANTS = {
  primary: 'bg-indigo text-text-0 px-4 py-2',
  secondary: 'bg-bg-2 text-text-2 px-4 py-2',
  danger: 'bg-danger text-text-0 px-4 py-2',
  ghost: 'bg-transparent text-text-2 px-2 py-1',
};

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`rounded-lg font-medium disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
