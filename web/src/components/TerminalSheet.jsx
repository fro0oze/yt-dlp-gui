import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { subscribe } from '../ws/client.js';
import { subscribeOpenTerminal } from '../terminalControl.js';
import IconButton from './ui/IconButton.jsx';

export default function TerminalSheet() {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState('');
  const [progress, setProgress] = useState(null);
  const logRef = useRef(null);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'terminal') {
        setLog((prev) => {
          const next = prev + msg.data;
          return next.length > 100_000 ? next.slice(-100_000) : next;
        });
      } else if (msg.type === 'queue-update') {
        const active = msg.data.items.find((item) => item.status === 'active');
        setProgress(active && active.progress ? Number(active.progress) : null);
      }
    });
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log, open]);

  useEffect(() => {
    return subscribeOpenTerminal(() => setOpen(true));
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Terminal öffnen"
          className="fixed right-6 w-14 h-14 rounded-full bg-indigo text-text-0 flex items-center justify-center shadow-lg"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        >
          {progress !== null ? `${Math.round(progress)}%` : '▶'}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed bottom-0 right-0 top-0 w-full sm:w-[480px] bg-bg-1 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <Dialog.Title className="text-text-0 font-semibold">Terminal</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton icon={X} label="Schließen" />
            </Dialog.Close>
          </div>
          <pre ref={logRef} className="flex-1 overflow-y-auto text-terminal font-mono text-xs whitespace-pre-wrap">
            {log || '(keine Ausgabe)'}
          </pre>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
