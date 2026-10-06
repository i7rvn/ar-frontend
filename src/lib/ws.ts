import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { config } from '@/lib/config'
import { tokens } from '@/lib/tokens'
import type { ApiEnvelope, Message } from '@/types/api'

type JsonObject = Record<string, unknown>
type ServerEvent = { type: string; payload?: JsonObject }
type Status = 'connecting' | 'open' | 'closed'

function stringField(payload: JsonObject, key: string): string | undefined {
  return typeof payload[key] === 'string' ? payload[key] as string : undefined
}

function isMessagePayload(payload: JsonObject): boolean {
  return Boolean(stringField(payload, 'id') && stringField(payload, 'conversation_id') && stringField(payload, 'sender_id') && stringField(payload, 'encrypted_content') && stringField(payload, 'nonce') && stringField(payload, 'msg_type'))
}

interface RealtimeSocket {
  subscribe: (listener: (event: ServerEvent) => void) => () => void
  send: (type: string, payload: unknown) => boolean
  stop: () => void
  get status(): Status
}

async function getWebSocketTicket(): Promise<string> {
  const response = await api.post<ApiEnvelope<{ ticket: string; expiresIn: number }>>('/auth/ws-ticket', {})
  if (!response.data.ticket) throw new Error('تعذر إنشاء جلسة WebSocket')
  return response.data.ticket
}

function websocketUrl(ticket: string): string {
  const apiUrl = new URL(config.apiUrl)
  return `${apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'}//${apiUrl.host}/ws?ticket=${encodeURIComponent(ticket)}`
}

export function createRealtimeSocket(): Promise<RealtimeSocket> {
  return new Promise((resolve) => {
    let socket: WebSocket | null = null
    let stopped = false
    let reconnectTimer: number | undefined
    let heartbeatTimer: number | undefined
    let reconnectAttempt = 0
    let opened = false
    const listeners = new Set<(event: ServerEvent) => void>()

    const clearTimers = () => {
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
      if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer)
      reconnectTimer = undefined
      heartbeatTimer = undefined
    }

    const send = (type: string, payload: unknown) => {
      if (socket?.readyState !== WebSocket.OPEN) return false
      socket.send(JSON.stringify({ type, payload }))
      return true
    }

    const scheduleReconnect = () => {
      if (stopped) return
      const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt)
      reconnectAttempt += 1
      reconnectTimer = window.setTimeout(() => { void connect() }, delay)
    }

    const connect = async () => {
      if (stopped || !tokens.getAccess()) return
      clearTimers()
      let ticket: string
      try { ticket = await getWebSocketTicket() } catch { scheduleReconnect(); return }
      if (stopped) return
      socket = new WebSocket(websocketUrl(ticket))
      socket.addEventListener('open', () => {
        opened = true
        reconnectAttempt = 0
        heartbeatTimer = window.setInterval(() => { send('ping', {}) }, 25_000)
        listeners.forEach((listener) => listener({ type: '__open__' }))
        if (!clientResolved) { clientResolved = true; resolve(client) }
      })
      socket.addEventListener('message', (event) => {
        try { listeners.forEach((listener) => listener(JSON.parse(String(event.data)) as ServerEvent)) } catch {}
      })
      socket.addEventListener('close', (event) => {
        opened = false
        clearTimers()
        listeners.forEach((listener) => listener({ type: '__close__', payload: { code: event.code } }))
        if (!stopped && event.code !== 4001) scheduleReconnect()
      })
    }

    let clientResolved = false
    const client: RealtimeSocket = {
      subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
      send,
      stop: () => { stopped = true; clearTimers(); socket?.close(1000, 'client stop'); socket = null },
      get status() { return opened ? 'open' : socket?.readyState === WebSocket.CONNECTING ? 'connecting' : 'closed' },
    }
    void connect()
  })
}

export interface RealtimeHandlers {
  onMessage?: (message: Message) => void
  onMessageEdited?: (message: Message) => void
  onMessageReaction?: (payload: JsonObject) => void
  onMessagePinned?: (message: Message) => void
  onMessageUnpinned?: (message: Message) => void
  onTyping?: (payload: { type: 'typing:start' | 'typing:stop'; userId: string; conversationId: string }) => void
  onRead?: (payload: { userId: string; conversationId: string }) => void
  onDelivered?: (payload: { userId: string; messageId: string; conversationId: string }) => void
}

export function useRealtimeConversation(conversationId: string | undefined, handlers: RealtimeHandlers) {
  const socketRef = useRef<RealtimeSocket | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const [status, setStatus] = useState<Status>('closed')
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])

  useEffect(() => {
    if (!conversationId || !tokens.getAccess()) return
    let cancelled = false
    let client: RealtimeSocket | null = null
    let cleanup: (() => void) | null = null
    const start = async () => {
      try { client = await createRealtimeSocket() } catch { setStatus('closed'); return }
      if (cancelled || !client) { client?.stop(); return }
      socketRef.current = client
      cleanup = client.subscribe((event) => {
        if (event.type === '__open__') { setStatus('open'); client?.send('join:room', { conversationId }); client?.send('message:read', { conversationId }); return }
        if (event.type === '__close__') { setStatus('closed'); setTypingUserIds([]); return }
        if (event.type === 'room:revoked') { setStatus('closed'); return }
        const payload = event.payload; if (!payload) return
        const conversation = stringField(payload, 'conversation_id') ?? stringField(payload, 'conversationId')
        const userId = stringField(payload, 'userId')
        const messageId = stringField(payload, 'messageId') ?? stringField(payload, 'id')
        if (event.type === 'message:new' && conversation === conversationId) { if (isMessagePayload(payload)) handlersRef.current.onMessage?.(payload as unknown as Message); if (messageId) client?.send('message:delivered', { conversationId, messageId }) }
        else if (event.type === 'message:edited' && conversation === conversationId) { if (isMessagePayload(payload)) handlersRef.current.onMessageEdited?.(payload as unknown as Message) }
        else if (event.type === 'message:reaction') handlersRef.current.onMessageReaction?.(payload)
        else if (event.type === 'message:pinned' && conversation === conversationId) { if (isMessagePayload(payload)) handlersRef.current.onMessagePinned?.(payload as unknown as Message) }
        else if (event.type === 'message:unpinned' && conversation === conversationId) { if (isMessagePayload(payload)) handlersRef.current.onMessageUnpinned?.(payload as unknown as Message) }
        else if ((event.type === 'typing:start' || event.type === 'typing:stop') && conversation === conversationId && userId) { handlersRef.current.onTyping?.({ type: event.type, userId, conversationId }); setTypingUserIds((ids) => event.type === 'typing:start' ? Array.from(new Set(ids.concat(userId))) : ids.filter((id) => id !== userId)) }
        else if (event.type === 'message:read' && conversation === conversationId && userId) handlersRef.current.onRead?.({ userId, conversationId })
        else if (event.type === 'message:delivered' && conversation === conversationId && userId && messageId) handlersRef.current.onDelivered?.({ userId, messageId, conversationId })
      })
      setStatus(client.status)
    }
    void start()
    return () => { cancelled = true; cleanup?.(); client?.send('leave:room', { conversationId }); client?.stop(); socketRef.current = null }
  }, [conversationId])

  const sendTyping = useCallback((active: boolean) => conversationId ? socketRef.current?.send(active ? 'typing:start' : 'typing:stop', { conversationId }) ?? false : false, [conversationId])
  const markRead = useCallback(() => conversationId ? socketRef.current?.send('message:read', { conversationId }) ?? false : false, [conversationId])
  return { status, typingUserIds, sendTyping, markRead }
}