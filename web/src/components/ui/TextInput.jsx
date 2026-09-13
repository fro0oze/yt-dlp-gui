export default function TextInput({ className = '', ...props }) {
  return (
    <input
      className={`bg-bg-2 text-text-0 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo placeholder:text-text-3 ${className}`}
      {...props}
    />
  );
}
