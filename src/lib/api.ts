import { config } from '@/lib/config'
import { tokens } from '@/lib/tokens'
import { useAuthStore } from '@/stores/auth'
import type { ApiEnvelope } from '@/types/api'

export class ApiError extends Error {
  status: number
  code?: string
  requiresTOTP?: boolean
  retryAfterSeconds?: number

  constructor(
    message: string,
    status: number,
    code?: string,
    extra?: { requiresTOTP?: boolean; retryAfterSeconds?: number },
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requiresTOTP = extra?.requiresTOTP
    this.retryAfterSeconds = extra?.retryAfterSeconds
  }
}

interface ApiErrorBody { message?: string; code?: string; requiresTOTP?: boolean; retryAfterSeconds?: number }

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** false = لا نبعث Authorization ولا نحاول تجديد التوكن (تسجيل الدخول/التسجيل) */
  auth?: boolean
  signal?: AbortSignal
}

// يمنع سباق عدة تجديدات توكن متزامنة (الخادم يدوّر refresh token)
let refreshPromise: Promise<void> | null = null

async function refreshSession(): Promise<void> {
  const refreshToken = tokens.getRefresh()
  if (!refreshToken) throw new ApiError('لا توجد جلسة', 401, 'NO_SESSION')

  const res = await fetch(`${config.apiUrl}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Key': config.clientKey },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) throw new ApiError('انتهت الجلسة', 401, 'SESSION_EXPIRED')

  const json = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>
  // لازم نخزّن الاثنين: الخادم يبطّل القديم بعد كل تجديد
  tokens.set(json.data.accessToken, json.data.refreshToken)
}

async function request<T>(endpoint: string, opts: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts

  const headers: Record<string, string> = { 'X-Client-Key': config.clientKey }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = tokens.getAccess()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${config.apiUrl}${endpoint}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError('تحقق من اتصالك بالإنترنت', 0, 'NETWORK_ERROR')
  }

  let json: ApiErrorBody | null = null
  try {
    json = await response.json()
  } catch {
    // رد بلا JSON (نادر) — نكمل بجسم فارغ
  }

  // 401: نجدد التوكن مرة واحدة ثم نعيد نفس الطلب
  if (response.status === 401 && auth && !isRetry && tokens.getRefresh()) {
    try {
      refreshPromise ??= refreshSession().finally(() => {
        refreshPromise = null
      })
      await refreshPromise
      return request<T>(endpoint, opts, true)
    } catch {
      useAuthStore.getState().clear()
      throw new ApiError('انتهت جلستك، سجّل الدخول من جديد', 401, 'SESSION_EXPIRED')
    }
  }
  if (response.status === 401 && auth) useAuthStore.getState().clear()

  if (!response.ok) {
    throw new ApiError(json?.message || 'حدث خطأ غير متوقع', response.status, json?.code, {
      requiresTOTP: json?.requiresTOTP as boolean | undefined,
      retryAfterSeconds: json?.retryAfterSeconds as number | undefined,
    })
  }

  return json as T
}

async function upload<T>(endpoint: string, form: FormData, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {
    'X-Client-Key': config.clientKey,
  }
  const token = tokens.getAccess()
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: form,
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError('تحقق من اتصالك بالإنترنت', 0, 'NETWORK_ERROR')
  }

  let json: ApiErrorBody | null = null
  try { json = (await response.json()) as typeof json } catch {}

  if (response.status === 401 && token && tokens.getRefresh()) {
    try {
      refreshPromise ??= refreshSession().finally(() => { refreshPromise = null })
      await refreshPromise
      return upload<T>(endpoint, form, signal)
    } catch {
      useAuthStore.getState().clear()
      throw new ApiError('انتهت جلستك، سجّل الدخول من جديد', 401, 'SESSION_EXPIRED')
    }
  }
  if (!response.ok) {
    throw new ApiError(json?.message || 'حدث خطأ غير متوقع', response.status, json?.code)
  }
  return json as T
}

export const api = {
  get: <T>(endpoint: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...opts, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...opts, method: 'POST', body: body ?? {} }),
  put: <T>(endpoint: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...opts, method: 'PUT', body: body ?? {} }),
  patch: <T>(endpoint: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...opts, method: 'PATCH', body: body ?? {} }),
  upload: <T>(endpoint: string, form: FormData, signal?: AbortSignal) => upload<T>(endpoint, form, signal),
  delete: <T>(endpoint: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...opts, method: 'DELETE' }),
}
