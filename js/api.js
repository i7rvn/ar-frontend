// ═══════════════════════════════════════════════════════════════
// AR — طبقة الاتصال بالخادم (نقطة واحدة لكل استدعاءات API)
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { store } from './store.js';

let refreshPromise = null; // يمنع سباق عدة تجديدات توكن متزامنة

function getAccessToken() {
  return localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(CONFIG.REFRESH_TOKEN_STORAGE_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, accessToken);
  if (refreshToken) localStorage.setItem(CONFIG.REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
  localStorage.removeItem(CONFIG.REFRESH_TOKEN_STORAGE_KEY);
}

// ─── خطأ API منظَّم — يحمل الرسالة الحقيقية من الخادم دائماً ────
export class ApiError extends Error {
  constructor(message, status, code, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError('لا توجد جلسة', 401, 'NO_SESSION');

  const res = await fetch(`${CONFIG.API_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Key': CONFIG.CLIENT_KEY },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) throw new ApiError('انتهت الجلسة', 401, 'SESSION_EXPIRED');
  const data = await res.json();
  // الخادم يستعمل refresh-token rotation؛ الاحتفاظ بالتوكن القديم
  // سيجعل التجديد التالي يفشل حتى لو نجح هذا الطلب.
  setTokens({
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
  });
  return data.data.accessToken;
}

// ─── الدالة المركزية لكل طلب ────────────────────────────────────
export async function apiFetch(endpoint, options = {}) {
  const { skipAuth = false, isRetry = false, ...fetchOptions } = options;

  const headers = {
    'X-Client-Key': CONFIG.CLIENT_KEY,
    ...(fetchOptions.body && !(fetchOptions.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...fetchOptions.headers,
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${CONFIG.API_URL}${endpoint}`, { ...fetchOptions, headers });
  } catch {
    throw new ApiError('تحقق من اتصالك بالإنترنت', 0, 'NETWORK_ERROR');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // رد بلا محتوى JSON (نادر) - نكمل بجسم فارغ
  }

  // 401: نحاول تجديد التوكن مرة واحدة فقط، ثم نعيد نفس الطلب
  if (response.status === 401 && !skipAuth && !isRetry && getRefreshToken()) {
    try {
      if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      await refreshPromise;
      return apiFetch(endpoint, { ...options, isRetry: true });
    } catch {
      clearTokens();
      store.emit('auth:logout');
      throw new ApiError('انتهت جلستك، سجّل الدخول من جديد', 401, 'SESSION_EXPIRED');
    }
  }

  if (response.status === 401 && !skipAuth) {
    clearTokens();
    store.emit('auth:logout');
  }

  if (!response.ok) {
    throw new ApiError(
      body?.message || 'حدث خطأ غير متوقع',
      response.status,
      body?.code,
      {
        requiresTOTP: body?.requiresTOTP,
        retryAfterSeconds: body?.retryAfterSeconds,
      }
    );
  }

  return body;
}

// ─── اختصارات ─────────────────────────────────────────────────
export const api = {
  get: (endpoint, options) => apiFetch(endpoint, { method: 'GET', ...options }),
  post: (endpoint, data, options) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(data), ...options }),
  put: (endpoint, data, options) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(data), ...options }),
  delete: (endpoint, options) => apiFetch(endpoint, { method: 'DELETE', ...options }),
  upload: (endpoint, formData, options) => apiFetch(endpoint, { method: 'POST', body: formData, ...options }),
};

// ─── رفع بتقدّم حقيقي (XHR — fetch لا يدعم upload progress) ─────
// يُستعمَل فقط حيث تقدّم الرفع مطلوب فعلياً (أفاتار/بانر) لإعطاء
// تغذية راجعة صادقة، ماشي progress bar وهمي يتحرك بمؤقّت وهمي
export function uploadWithProgress(endpoint, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${CONFIG.API_URL}${endpoint}`);

    const token = getAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('X-Client-Key', CONFIG.CLIENT_KEY);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener('load', () => {
      let body;
      try { body = JSON.parse(xhr.responseText); } catch { body = null; }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        reject(new ApiError(body?.message || 'فشل الرفع', xhr.status, body?.code));
      }
    });

    xhr.addEventListener('error', () => reject(new ApiError('خطأ شبكة أثناء الرفع', 0)));
    xhr.send(formData);
  });
}

// ─── جلب صورة من الخادم كـdata URL ──────────────────────────────
// <img src> المباشر لا يقدر يبعث X-Client-Key (كل /api/ يتطلبه)، فنجلب
// الصورة بـfetch عادي ونحوّلها لـdata URL — مسموح بـCSP (img-src data:)
// وصالح أيضاً لخاصية download بعكس رابط cross-origin مباشر
export async function fetchImageAsDataURL(endpoint) {
  const res = await fetch(`${CONFIG.API_URL}${endpoint}`, {
    headers: { 'X-Client-Key': CONFIG.CLIENT_KEY },
  });
  if (!res.ok) throw new ApiError('تعذّر تحميل الصورة', res.status);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ApiError('تعذّر قراءة الصورة', 0));
    reader.readAsDataURL(blob);
  });
}
