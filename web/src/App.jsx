import { useState } from 'react';
import Home from './screens/Home.jsx';
import Queue from './screens/Queue.jsx';
import TerminalSheet from './components/TerminalSheet.jsx';

export default function App() {
  const [view, setView] = useState('home');

  return (
    <div className="min-h-screen bg-bg-0 text-text-0">
      <nav className="flex gap-2 p-4 border-b border-bg-1">
        <button
          type="button"
          onClick={() => setView('home')}
          className={view === 'home' ? 'text-text-0 font-semibold' : 'text-text-2'}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setView('queue')}
          className={view === 'queue' ? 'text-text-0 font-semibold' : 'text-text-2'}
        >
          Queue
        </button>
      </nav>
      {view === 'home' ? <Home /> : <Queue />}
      <TerminalSheet />
    </div>
  );
}
