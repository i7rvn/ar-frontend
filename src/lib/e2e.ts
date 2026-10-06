import { api } from '@/lib/api'
import type { ApiEnvelope, Message } from '@/types/api'

const DB_NAME = 'ar-secure-keys'
const STORE = 'identity'
const ID = 'current'

interface IdentityRecord { id: string; keyPair: CryptoKeyPair }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getStoredIdentity(): Promise<IdentityRecord | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(ID)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function storeIdentity(identity: IdentityRecord): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(identity, ID)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  db.close()
}

export async function getIdentity(): Promise<CryptoKeyPair> {
  const existing = await getStoredIdentity()
  if (existing?.keyPair) return existing.keyPair
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    false,
    ['encrypt', 'decrypt'],
  ) as CryptoKeyPair
  await storeIdentity({ id: ID, keyPair })
  return keyPair
}

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  source.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

export async function registerOwnPublicKey(): Promise<void> {
  const keyPair = await getIdentity()
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  await api.put<ApiEnvelope<unknown>>('/messages/e2e-keys', { publicKeyJwk })
}

export async function getPublicKey(userId: string): Promise<{ id: string; publicKeyJwk: JsonWebKey } | null> {
  const res = await api.get<ApiEnvelope<{ id: string; public_key_jwk: JsonWebKey }>>(`/messages/e2e-keys/${encodeURIComponent(userId)}`)
  return res.data ? { id: res.data.id, publicKeyJwk: res.data.public_key_jwk } : null
}

export async function encryptTextForRecipients(text: string, recipients: Array<{ userId: string; keyId: string; publicKeyJwk: JsonWebKey }>): Promise<Pick<Message, 'encrypted_content' | 'nonce'> & { encryptionVersion: 2; encryptionAlgorithm: 'RSA-OAEP-256'; keyEnvelopes: Array<{ recipientUserId: string; keyId: string; encryptedMessageKey: string }> }> {
  const contentKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, contentKey, new TextEncoder().encode(text))
  const rawKey = await crypto.subtle.exportKey('raw', contentKey)

  const keyEnvelopes = [] as Array<{ recipientUserId: string; keyId: string; encryptedMessageKey: string }>
  for (const recipient of recipients) {
    const publicKey = await crypto.subtle.importKey(
      'jwk', recipient.publicKeyJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']
    )
    const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawKey)
    keyEnvelopes.push({ recipientUserId: recipient.userId, keyId: recipient.keyId, encryptedMessageKey: bytesToBase64(wrapped) })
  }

  return {
    encrypted_content: bytesToBase64(encrypted),
    nonce: bytesToBase64(iv),
    encryptionVersion: 2,
    encryptionAlgorithm: 'RSA-OAEP-256',
    keyEnvelopes,
  }
}

export async function decryptTextMessage(message: Message): Promise<string | null> {
  if (message.encryption_version !== undefined && message.encryption_version < 2) return null
  const envelope = message.e2e_key_envelopes?.[0]
  if (!envelope) return null
  const keyPair = await getIdentity()
  try {
    const rawKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, keyPair.privateKey, base64ToBytes(envelope.encryptedMessageKey))
    const contentKey = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt'])
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(message.nonce) }, contentKey, base64ToBytes(message.encrypted_content))
    return new TextDecoder().decode(plaintext)
  } catch {
    return null
  }
}

export { bytesToBase64 }
export interface ConversationE2EMember {
  userId: string
  keyId: string | null
  publicKeyJwk: JsonWebKey | null
  keyVersion?: number | null
}

export async function getConversationE2EMembers(conversationId: string): Promise<ConversationE2EMember[]> {
  const res = await api.get<ApiEnvelope<ConversationE2EMember[]>>(
    `/messages/conversations/${encodeURIComponent(conversationId)}/e2e-members`,
  )
  return res.data
}
