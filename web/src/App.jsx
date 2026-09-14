import { useState } from 'react';
import Home from './screens/Home.jsx';
import Queue from './screens/Queue.jsx';
import Settings from './screens/Settings.jsx';
import Playlists from './screens/Playlists.jsx';
import TerminalSheet from './components/TerminalSheet.jsx';
import BottomTabBar from './components/BottomTabBar.jsx';

export default function App() {
  const [view, setView] = useState('home');

  return (
    <div className="min-h-screen bg-bg-0 text-text-0 pb-24">
      {view === 'home' ? <Home /> : view === 'queue' ? <Queue /> : view === 'playlists' ? <Playlists /> : <Settings />}
      <TerminalSheet />
      <BottomTabBar active={view} onChange={setView} />
    </div>
  );
}
