import { Home as HomeIcon, ListChecks, Folder, Settings as SettingsIcon } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'queue', label: 'Queue', icon: ListChecks },
  { id: 'playlists', label: 'Playlists', icon: Folder },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function BottomTabBar({ active, onChange }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around bg-bg-0 border-t border-bg-1 pt-2"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex flex-col items-center gap-1 text-xs font-medium px-3 py-1 ${active === id ? 'text-indigo' : 'text-text-3'}`}
        >
          <Icon size={22} />
          {label}
        </button>
      ))}
    </nav>
  );
}
