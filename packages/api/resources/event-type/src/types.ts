/** The medium through which an event type meeting takes place. */
export type LocationKind = 'video' | 'phone' | 'in_person' | 'custom'

/** Database row shape for a bookable event type owned by a user. */
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

/** Database row shape for a recurring weekly availability rule belonging to a user. */
export interface AvailabilityRuleRow {
  id: string
  user_id: string
  day_of_week: number // 0=Sunday, 6=Saturday
  start_minute: number // minutes since midnight, local time
  end_minute: number
  timezone: string
  created_at: string | Date
}

/** A discrete time window indicating whether a booking slot is open or blocked. */
export interface AvailabilitySlot {
  start: string // ISO datetime
  end: string
  available: boolean
}
