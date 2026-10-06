let accessToken: string | null = null

export const tokens = {
  getAccess: () => accessToken,
  getRefresh: () => null,
  set: (nextAccessToken?: string) => {
    accessToken = nextAccessToken ?? null
  },
  clear: () => {
    accessToken = null
  },
} as const
