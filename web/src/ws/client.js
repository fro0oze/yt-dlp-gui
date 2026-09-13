const listeners = new Set();
let socket = null;

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
    listeners.forEach((listener) => listener(msg));
  });

  socket.addEventListener('close', () => {
    setTimeout(connect, 2000);
  });
}

export function subscribe(listener) {
  if (!socket) connect();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
