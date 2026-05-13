export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface MeetingRow {
  id: string
  owner_id: string
  title: string
  description: string | null
  status: MeetingStatus
  scheduled_at: string | Date | null
  started_at: string | Date | null
  ended_at: string | Date | null
  duration_seconds: number
  recording_url: string | null
  transcript: string | null
  summary: string | null
  attendees: Array<{ name: string; email?: string }>
  created_at: string | Date
  updated_at: string | Date
}

export interface ActionItemRow {
  id: string
  meeting_id: string
  description: string
  assignee: string | null
  due_date: string | Date | null
  is_completed: boolean
  source_excerpt: string | null
  created_at: string | Date
  updated_at: string | Date
}
