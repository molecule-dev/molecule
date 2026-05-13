export type LocationKind = 'video' | 'phone' | 'in_person' | 'custom'

export interface EventTypeRow {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  duration_minutes: number
  location_kind: LocationKind
  location_value: unknown
  buffer_before_minutes: number
  buffer_after_minutes: number
  min_notice_minutes: number
  max_per_day: number | null
  requires_confirmation: boolean
  color: string | null
  is_active: boolean
  position: number
  created_at: string | Date
  updated_at: string | Date
}

export interface AvailabilityRuleRow {
  id: string
  user_id: string
  day_of_week: number // 0=Sunday, 6=Saturday
  start_minute: number // minutes since midnight, local time
  end_minute: number
  timezone: string
  created_at: string | Date
}

export interface AvailabilitySlot {
  start: string // ISO datetime
  end: string
  available: boolean
}
