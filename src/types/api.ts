export interface User {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified?: boolean
  email?: string
  bio?: string | null
  banner_url?: string | null
  location?: string | null
  website?: string | null
  is_private?: boolean
  isFollowing?: boolean
  canViewPosts?: boolean
  followers_count?: number
  following_count?: number
  posts_count?: number
  reputation_points?: number
  reputation_level?: string
  created_at?: string
}

export type PostVisibility = 'public' | 'unlisted' | 'followers' | 'mentioned'

export interface PollOption { id: string; option_text: string; position: number; vote_count: number }
export interface Poll {
  id: string; postId: string; expiresAt: string; createdAt: string; hasEnded: boolean
  totalVotes: number; votedByMe: boolean; myOptionId: string | null; options: PollOption[]
}

export interface Post {
  id: string; user_id: string; username: string; display_name: string; avatar_url: string | null
  is_verified: boolean; content: string; media_urls: string[] | null; media_types: string[] | null
  created_at: string; updated_at?: string; likes_count: number; reposts_count: number; replies_count: number
  quotes_count?: number; views_count?: number; liked_by_me: boolean; reposted_by_me: boolean
  is_pinned: boolean; is_sensitive?: boolean; sensitive_warning?: string | null
  visibility?: PostVisibility; poll?: Poll | null
}

export interface Conversation {
  id?: string; conversation_id?: string; type: 'direct' | 'group'; name?: string | null
  avatar_url?: string | null; display_name?: string | null; display_avatar?: string | null
  last_msg_at?: string | null; last_msg_text?: string | null; unread_count?: number; is_muted?: boolean
  other_user_id?: string | null
}

export interface Message {
  id: string; conversation_id: string; sender_id: string; encrypted_content: string; nonce: string
  msg_type: 'text' | 'image' | 'video' | 'audio' | 'file'; media_url?: string | null
  reply_to_id?: string | null; is_deleted?: boolean; is_edited?: boolean; edited_at?: string | null
  is_pinned?: boolean; pinned_at?: string | null; created_at: string
  encryption_version?: number
  encryption_algorithm?: string
  e2e_key_envelopes?: Array<{ messageId: string; keyId: string; encryptedMessageKey: string }>
  sender?: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

export interface Story {
  id: string; user_id: string; caption?: string | null; visibility: 'public' | 'followers'
  expires_at: string; created_at: string; media_id: string; url: string; type: string
  username: string; display_name: string; avatar_url: string | null; viewed_by_me?: boolean; viewCount?: number
}
export interface StoryGroup {
  userId: string; username: string; displayName: string; avatarUrl: string | null; stories: Story[]
}

export interface ApiEnvelope<T> { success: boolean; message?: string; data: T }
export interface AuthPayload { accessToken: string; refreshToken: string; user: User }