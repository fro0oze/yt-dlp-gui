export default function Card({ children, className = '' }) {
  return <div className={`bg-bg-1 rounded-card shadow-card p-4 ${className}`}>{children}</div>;
}
