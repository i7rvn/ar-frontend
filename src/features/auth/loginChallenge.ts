interface LoginChallenge {
  identifier: string
  password: string
  expiresAt: number
}

let pendingChallenge: LoginChallenge | null = null

export function setLoginChallenge(credentials: Omit<LoginChallenge, 'expiresAt'>) {
  pendingChallenge = { ...credentials, expiresAt: Date.now() + 10 * 60 * 1000 }
}

export function getLoginChallenge() {
  if (pendingChallenge && pendingChallenge.expiresAt <= Date.now()) {
    pendingChallenge = null
  }
  return pendingChallenge
}

export function clearLoginChallenge() {
  pendingChallenge = null
}
