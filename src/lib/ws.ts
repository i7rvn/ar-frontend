import { useCallback, useEffect, useRef, useState } from 'react'
import { config } from '@/lib/config'
import { tokens } from '@/lib/tokens'
import type { Message } from '@/types/api'

type JsonObject = Record<string, unknown>
type ServerEvent = { type: string; payload?: JsonObject }

function stringField(payload: JsonObject, key: string): string | undefined {
  return typeof payload[key] === 'string' ? payload[key] as string : undefined
}

function isMessagePayload(payload: JsonObject): payload is unknown as Message {
  return Boolean(
    stringField(payload, 'id') &&
    stringField(payload, 'conversation_id') &&
    stringField(payload, 'sender_id') &&
    stringField(payload, 'encrypted_content') &&
    stringField(payload, 'nonce') &&
    stringField(payload, 'msg_type'),
  )
}
type Status = 'connecting' | 'open' | 'closed'

function websocketUrl(token: string): string {
  const api = new URL(config.apiUrl)
  return `${api.protocol === 'https:' ? 'wss:' : 'ws:'}//${api.host}/ws?token=${encodeURIComponent(token)}`
}

export function createRealtimeSocket() {
  let socket: WebSocket | null = null
  let stopped = false
  let reconnectTimer: number | undefined
  let heartbeatTimer: number | undefined
  let reconnectAttempt = 0
  const listeners = new Set<(event: ServerEvent) => void>()

  const clearTimers = () => {
    if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
    if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer)
    reconnectTimer = undefined
    heartbeatTimer = undefined
  }

  const connect = () => {
    const token = tokens.getAccess()
    if (stopped || !token) return
    clearTimers()
    socket = new WebSocket(websocketUrl(token))
    socket.addEventListener('open', () => {
      reconnectAttempt = 0
      heartbeatTimer = window.setInterval(() => {
        send('ping', {})
      }, 25_000)
      listeners.forEach((listener) => listener({ type: '__open__' }))
    })
    socket.addEventListener('message', (event) => {
      try { listeners.forEach((listener) => listener(JSON.parse(String(event.data)) as ServerEvent)) } catch {}
    })
    socket.addEventListener('close', (event) => {
      clearTimers()
      listeners.forEach((listener) => listener({ type: '__close__', payload: { code: event.code } }))
      if (!stopped && event.code !== 4001) scheduleReconnect()
    })
    socket.addEventListener('error', () => {})
  }

  const scheduleReconnect = () => {
    const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt)
    reconnectAttempt += 1
    reconnectTimer = window.setTimeout(connect, delay)
  }

  const send = (type: string, payload: unknown) => {
    if (socket?.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify({ type, payload }))
    return true
  }

  const subscribe = (listener: (event: ServerEvent) => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  connect()
  return {
    subscribe,
    send,
    stop: () => { stopped = true; clearTimers(); socket?.close(1000, 'client stop'); socket = null },
    get status(): Status {
      if (socket?.readyState === WebSocket.OPEN) return 'open'
      if (socket?.readyState === WebSocket.CONNECTING) return 'connecting'
      return 'closed'
    },
  }
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
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const [status, setStatus] = useState<Status>('closed')
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])

  useEffect(() => {
    if (!conversationId || !tokens.getAccess()) return
    const client = createRealtimeSocket()
    socketRef.current = client
    const unsubscribe = client.subscribe((event) => {
      if (event.type === '__open__') {
        setStatus('open')
        client.send('join:room', { conversationId })
        client.send('message:read', { conversationId })
        return
      }
      if (event.type === '__close__') {
        setStatus('closed')
        setTypingUserIds([])
        return
      }
      if (event.type === 'room:revoked') {
        setStatus('closed')
        return
      }
      const payload = event.payload
      if (!payload) return
      const payloadConversationId = stringField(payload, 'conversation_id')
      const payloadConversationIdCamel = stringField(payload, 'conversationId')
      const payloadUserId = stringField(payload, 'userId')
      const payloadMessageId = stringField(payload, 'messageId') ?? stringField(payload, 'id')
      if (event.type === 'message:new' && payloadConversationId === conversationId) {
        if (isMessagePayload(payload)) handlersRef.current.onMessage?.(payload)
        if (payloadMessageId && stringField(payload, 'sender_id')) client.send('message:delivered', { conversationId, messageId: payloadMessageId })
      } else if (event.type === 'message:edited' && payloadConversationId === conversationId) {
        if (isMessagePayload(payload)) handlersRef.current.onMessageEdited?.(payload)
      } else if (event.type === 'message:reaction') {
        handlersRef.current.onMessageReaction?.(payload)
      } else if (event.type === 'message:pinned' && payloadConversationId === conversationId) {
        if (isMessagePayload(payload)) handlersRef.current.onMessagePinned?.(payload)
      } else if (event.type === 'message:unpinned' && payloadConversationId === conversationId) {
        if (isMessagePayload(payload)) handlersRef.current.onMessageUnpinned?.(payload)
      } else if ((event.type === 'typing:start' || event.type === 'typing:stop') && payloadConversationIdCamel === conversationId && payloadUserId) {
        handlersRef.current.onTyping?.({ type: event.type, userId: payloadUserId, conversationId })
        setTypingUserIds((ids) => event.type === 'typing:start'
          ? Array.from(new Set(ids.concat(payloadUserId)))
          : ids.filter((id) => id !== payloadUserId))
      } else if (event.type === 'message:read' && payloadConversationIdCamel === conversationId && payloadUserId) {
        handlersRef.current.onRead?.({ userId: payloadUserId, conversationId })
      } else if (event.type === 'message:delivered' && payloadConversationIdCamel === conversationId && payloadUserId && payloadMessageId) {
        handlersRef.current.onDelivered?.({ userId: payloadUserId, messageId: payloadMessageId, conversationId })
      }
    })
    setStatus(client.status)
    return () => { unsubscribe(); client.send('leave:room', { conversationId }); client.stop(); socketRef.current = null }
  }, [conversationId])

  const sendTyping = useCallback((active: boolean) => {
    if (!conversationId) return false
    return socketRef.current?.send(active ? 'typing:start' : 'typing:stop', { conversationId }) ?? false
  }, [conversationId])

  const markRead = useCallback(() => {
    if (!conversationId) return false
    return socketRef.current?.send('message:read', { conversationId }) ?? false
  }, [conversationId])

  return { status, typingUserIds, sendTyping, markRead }
}