// أنواع مطابقة لما يرجّعه الباك اند فعلياً (تأكدت من الحقول بالكود/الاختبار الحي)

export interface User {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified?: boolean
  email?: string
}

export interface Post {
  id: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified: boolean
  content: string
  media_urls: string[] | null
  media_types: string[] | null
  created_at: string
  likes_count: number
  reposts_count: number
  replies_count: number
  liked_by_me: boolean
  reposted_by_me: boolean
  is_pinned: boolean
}

export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
}

export interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}
