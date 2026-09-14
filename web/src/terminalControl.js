const listeners = new Set();

export function openTerminal() {
  listeners.forEach((listener) => listener());
}

export function subscribeOpenTerminal(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
