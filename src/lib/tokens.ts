const accessToken = { value: null as string | null }

export const tokens = {
  getAccess: () => accessToken.value,
  getRefresh: () => null,
  set: (access?: string) => { if (access) accessToken.value = access },
  clear: () => { accessToken.value = null },
} as const