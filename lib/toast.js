let listeners = [];

export function subscribeToast(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function showToast(message, type = 'error') {
  const id = Date.now() + Math.random();
  listeners.forEach((fn) => fn({ id, message, type }));
  return id;
}
