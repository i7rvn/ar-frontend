// ═══════════════════════════════════════════════════════════════
// AR — إدارة الحالة العامة (نمط Pub/Sub بسيط، بلا مكتبات)
// ═══════════════════════════════════════════════════════════════

function createStore() {
  const state = {
    user: null,
    lang: 'ar',
    theme: 'dark',
  };

  const listeners = new Map(); // eventName -> Set(callback)

  function on(event, callback) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(callback);
    return () => listeners.get(event)?.delete(callback);
  }

  function emit(event, payload) {
    listeners.get(event)?.forEach((cb) => cb(payload));
  }

  function setState(partial) {
    Object.assign(state, partial);
    emit('state:change', state);
  }

  function getState() {
    return state;
  }

  return { on, emit, setState, getState };
}

export const store = createStore();
