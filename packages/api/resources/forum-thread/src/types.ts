export type ThreadStatus = 'open' | 'closed' | 'locked' | 'archived'

export interface ForumThreadRow {
  id: string
  author_id: string
  category_id: string | null
  title: string
  body: string
  slug: string
  status: ThreadStatus
  is_pinned: boolean
  vote_score: number
  reply_count: number
  view_count: number
  last_activity_at: string | Date
  created_at: string | Date
  updated_at: string | Date
}

export interface ForumReplyRow {
  id: string
  thread_id: string
  parent_reply_id: string | null
  author_id: string
  body: string
  vote_score: number
  is_deleted: boolean
  created_at: string | Date
  updated_at: string | Date
}

export interface ForumVoteRow {
  id: string
  user_id: string
  target_type: 'thread' | 'reply'
  target_id: string
  value: 1 | -1
  created_at: string | Date
}
