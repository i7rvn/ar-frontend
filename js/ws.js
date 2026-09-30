// ═══════════════════════════════════════════════════════════════
// AR — اتصال WebSocket (رسائل فورية، إشعارات، حالة الكتابة)
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';

let socket = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
const listeners = new Map(); // eventType -> Set(callback)
const pendingQueue = []; // رسائل حاولت الإرسال قبل اكتمال الاتصال

function getAccessToken() {
  return localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY);
}

export function wsOn(type, callback) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(callback);
  return () => listeners.get(type)?.delete(callback);
}

export function wsSend(type, payload) {
  const message = JSON.stringify({ type, payload });
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(message);
  } else {
    pendingQueue.push(message);
  }
}

function flushPendingQueue() {
  while (pendingQueue.length > 0 && socket?.readyState === WebSocket.OPEN) {
    socket.send(pendingQueue.shift());
  }
}

export function connectWS() {
  const token = getAccessToken();
  if (!token) return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  socket = new WebSocket(`${CONFIG.WS_URL}?token=${encodeURIComponent(token)}`);

  socket.addEventListener('open', () => {
    reconnectAttempts = 0;
    flushPendingQueue();
  });

  socket.addEventListener('message', (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    listeners.get(data.type)?.forEach((cb) => cb(data.payload));
  });

  socket.addEventListener('close', () => {
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    socket?.close();
  });
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 15000);
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(connectWS, delay);
}

export function disconnectWS() {
  clearTimeout(reconnectTimer);
  reconnectAttempts = 0;
  if (socket) {
    socket.close();
    socket = null;
  }
}
