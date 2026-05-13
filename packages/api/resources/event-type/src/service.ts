/**
 * Event-type service — Calendly-style availability + slot generation.
 *
 * @module
 */

import {
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'

import type { AvailabilityRuleRow, AvailabilitySlot, EventTypeRow, LocationKind } from './types.js'

const EVENT_TYPES_TABLE = 'event_types'
const RULES_TABLE = 'availability_rules'

export async function listEventTypesForOwner(
  ownerId: string,
  opts: { include_inactive?: boolean } = {},
): Promise<EventTypeRow[]> {
  const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
  if (!opts.include_inactive) where.push({ field: 'is_active', operator: '=', value: true })
  const orderBy: OrderBy[] = [
    { field: 'position', direction: 'asc' },
    { field: 'created_at', direction: 'asc' },
  ]
  return findMany<EventTypeRow>(EVENT_TYPES_TABLE, { where, orderBy })
}

export async function getEventTypeBySlug(slug: string): Promise<EventTypeRow | null> {
  const row = await findOne<EventTypeRow>(EVENT_TYPES_TABLE, [
    { field: 'slug', operator: '=', value: slug },
    { field: 'is_active', operator: '=', value: true },
  ])
  return row ?? null
}

export async function getEventTypeForOwner(
  eventTypeId: string,
  ownerId: string,
): Promise<EventTypeRow | null> {
  const row = await findById<EventTypeRow>(EVENT_TYPES_TABLE, eventTypeId)
  if (!row || row.owner_id !== ownerId) return null
  return row
}

export async function createEventTypeForOwner(
  ownerId: string,
  data: {
    name: string
    slug: string
    description?: string | null
    duration_minutes?: number
    location_kind?: LocationKind
    location_value?: unknown
    buffer_before_minutes?: number
    buffer_after_minutes?: number
    min_notice_minutes?: number
    max_per_day?: number | null
    requires_confirmation?: boolean
    color?: string | null
    is_active?: boolean
    position?: number
  },
): Promise<EventTypeRow> {
  const result = await create<EventTypeRow>(EVENT_TYPES_TABLE, {
    owner_id: ownerId,
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    duration_minutes: data.duration_minutes ?? 30,
    location_kind: data.location_kind ?? 'video',
    location_value: data.location_value ?? null,
    buffer_before_minutes: data.buffer_before_minutes ?? 0,
    buffer_after_minutes: data.buffer_after_minutes ?? 0,
    min_notice_minutes: data.min_notice_minutes ?? 240,
    max_per_day: data.max_per_day ?? null,
    requires_confirmation: data.requires_confirmation ?? false,
    color: data.color ?? null,
    is_active: data.is_active ?? true,
    position: data.position ?? 0,
  } as Partial<EventTypeRow>)
  return result.data!
}

export async function updateEventTypeForOwner(
  eventTypeId: string,
  ownerId: string,
  patch: Partial<EventTypeRow>,
): Promise<EventTypeRow | null> {
  const existing = await findById<EventTypeRow>(EVENT_TYPES_TABLE, eventTypeId)
  if (!existing || existing.owner_id !== ownerId) return null
  await updateById(EVENT_TYPES_TABLE, eventTypeId, patch)
  return findById<EventTypeRow>(EVENT_TYPES_TABLE, eventTypeId)
}

export async function deleteEventTypeForOwner(
  eventTypeId: string,
  ownerId: string,
): Promise<boolean> {
  const row = await findById<EventTypeRow>(EVENT_TYPES_TABLE, eventTypeId)
  if (!row || row.owner_id !== ownerId) return false
  await deleteById(EVENT_TYPES_TABLE, eventTypeId)
  return true
}

export async function listAvailabilityRulesForUser(userId: string): Promise<AvailabilityRuleRow[]> {
  return findMany<AvailabilityRuleRow>(RULES_TABLE, {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [
      { field: 'day_of_week', direction: 'asc' },
      { field: 'start_minute', direction: 'asc' },
    ],
  })
}

export async function setAvailabilityRulesForUser(
  userId: string,
  rules: Array<{
    day_of_week: number
    start_minute: number
    end_minute: number
    timezone: string
  }>,
): Promise<AvailabilityRuleRow[]> {
  // Replace all rules for the user with the given set.
  const existing = await listAvailabilityRulesForUser(userId)
  for (const r of existing) await deleteById(RULES_TABLE, r.id)
  for (const rule of rules) {
    await create<AvailabilityRuleRow>(RULES_TABLE, {
      user_id: userId,
      ...rule,
    } as Partial<AvailabilityRuleRow>)
  }
  return listAvailabilityRulesForUser(userId)
}

/**
 * Generate available slots for a given date based on the user's
 * availability rules + event-type duration + buffers.
 *
 * Caller is responsible for filtering against existing bookings.
 */
export function generateSlots(opts: {
  date: string // YYYY-MM-DD
  durationMinutes: number
  bufferBeforeMinutes?: number
  bufferAfterMinutes?: number
  rules: Pick<AvailabilityRuleRow, 'day_of_week' | 'start_minute' | 'end_minute'>[]
}): AvailabilitySlot[] {
  const day = new Date(opts.date + 'T00:00:00Z')
  const dayOfWeek = day.getUTCDay()
  const rulesForDay = opts.rules.filter((r) => r.day_of_week === dayOfWeek)
  const totalSlotMinutes =
    opts.durationMinutes + (opts.bufferBeforeMinutes ?? 0) + (opts.bufferAfterMinutes ?? 0)

  const slots: AvailabilitySlot[] = []
  for (const rule of rulesForDay) {
    let cursor = rule.start_minute
    while (cursor + totalSlotMinutes <= rule.end_minute) {
      const startMs = day.getTime() + cursor * 60_000
      const endMs = startMs + opts.durationMinutes * 60_000
      slots.push({
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        available: true,
      })
      cursor += totalSlotMinutes
    }
  }
  return slots
}
