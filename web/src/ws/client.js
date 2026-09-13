const listeners = new Set();
let socket = null;
let lastQueueUpdate = null;

function connect() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${proto}//${window.location.host}/ws`);

  socket.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg.type === 'queue-update') lastQueueUpdate = msg;
    listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        console.error(err);
      }
    });
  });

  socket.addEventListener('close', () => {
    setTimeout(connect, 2000);
  });
}

export function subscribe(listener) {
  if (!socket) connect();
  listeners.add(listener);
  if (lastQueueUpdate) listener(lastQueueUpdate);
  return () => listeners.delete(listener);
}
