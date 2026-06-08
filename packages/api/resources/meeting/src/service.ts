/**
 * Meeting service — meetings + action items, with optional AI-assisted
 * summarization/extraction.
 *
 * @module
 */

import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'

import type { ActionItemRow, MeetingRow, MeetingStatus } from './types.js'

const MEETINGS_TABLE = 'meetings'
const ACTION_ITEMS_TABLE = 'meeting_action_items'

/** Returns a paginated list of meetings belonging to the given owner, optionally filtered by status. */
export async function listMeetingsForOwner(
  ownerId: string,
  opts: {
    status?: MeetingStatus
    page?: number
    limit?: number
  } = {},
): Promise<{ data: MeetingRow[]; total: number }> {
  const page = opts.page ?? 1
  const limit = opts.limit ?? 50
  const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
  if (opts.status) where.push({ field: 'status', operator: '=', value: opts.status })
  const orderBy: OrderBy[] = [{ field: 'scheduled_at', direction: 'desc' }]
  const offset = (page - 1) * limit
  const [data, total] = await Promise.all([
    findMany<MeetingRow>(MEETINGS_TABLE, { where, orderBy, limit, offset }),
    count(MEETINGS_TABLE, where),
  ])
  return { data, total }
}

/** Fetches a single meeting by ID, returning null if it does not exist or does not belong to the owner. */
export async function getMeetingForOwner(
  meetingId: string,
  ownerId: string,
): Promise<MeetingRow | null> {
  const row = await findById<MeetingRow>(MEETINGS_TABLE, meetingId)
  if (!row || row.owner_id !== ownerId) return null
  return row
}

/** Creates a new meeting record owned by the given owner and returns the inserted row. */
export async function createMeetingForOwner(
  ownerId: string,
  data: {
    title: string
    description?: string | null
    scheduled_at?: string | null
    attendees?: Array<{ name: string; email?: string }>
  },
): Promise<MeetingRow> {
  const result = await create<MeetingRow>(MEETINGS_TABLE, {
    owner_id: ownerId,
    title: data.title,
    description: data.description ?? null,
    status: data.scheduled_at ? 'scheduled' : 'completed',
    scheduled_at: data.scheduled_at ?? null,
    started_at: null,
    ended_at: null,
    duration_seconds: 0,
    recording_url: null,
    transcript: null,
    summary: null,
    attendees: data.attendees ?? [],
  } as Partial<MeetingRow>)
  return result.data!
}

/** Applies a partial patch to a meeting, recomputing duration_seconds when both timestamps are present, and returns the updated row or null if not found/owned. */
export async function updateMeetingForOwner(
  meetingId: string,
  ownerId: string,
  patch: Partial<MeetingRow>,
): Promise<MeetingRow | null> {
  const existing = await findById<MeetingRow>(MEETINGS_TABLE, meetingId)
  if (!existing || existing.owner_id !== ownerId) return null
  const updates: Record<string, unknown> = { ...patch }
  // Compute duration if both timestamps now set
  if ((patch.started_at || existing.started_at) && (patch.ended_at || existing.ended_at)) {
    const startedAt = new Date(String(patch.started_at ?? existing.started_at)).getTime()
    const endedAt = new Date(String(patch.ended_at ?? existing.ended_at)).getTime()
    if (Number.isFinite(startedAt) && Number.isFinite(endedAt) && endedAt > startedAt) {
      updates.duration_seconds = Math.round((endedAt - startedAt) / 1000)
    }
  }
  await updateById(MEETINGS_TABLE, meetingId, updates as Partial<MeetingRow>)
  return findById<MeetingRow>(MEETINGS_TABLE, meetingId)
}

/** Deletes a meeting by ID if it belongs to the given owner; returns true on success, false if not found or not owned. */
export async function deleteMeetingForOwner(meetingId: string, ownerId: string): Promise<boolean> {
  const row = await findById<MeetingRow>(MEETINGS_TABLE, meetingId)
  if (!row || row.owner_id !== ownerId) return false
  await deleteById(MEETINGS_TABLE, meetingId)
  return true
}

/** Returns all action items for a meeting in creation order, or null if the meeting is not found/owned. */
export async function listActionItems(
  meetingId: string,
  ownerId: string,
): Promise<ActionItemRow[] | null> {
  const meeting = await getMeetingForOwner(meetingId, ownerId)
  if (!meeting) return null
  return findMany<ActionItemRow>(ACTION_ITEMS_TABLE, {
    where: [{ field: 'meeting_id', operator: '=', value: meetingId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
}

/** Creates a new action item under a meeting owned by the given owner; returns the inserted row or null if the meeting is not found/owned. */
export async function createActionItem(
  meetingId: string,
  ownerId: string,
  data: {
    description: string
    assignee?: string | null
    due_date?: string | null
    source_excerpt?: string | null
  },
): Promise<ActionItemRow | null> {
  const meeting = await getMeetingForOwner(meetingId, ownerId)
  if (!meeting) return null
  const result = await create<ActionItemRow>(ACTION_ITEMS_TABLE, {
    meeting_id: meetingId,
    description: data.description,
    assignee: data.assignee ?? null,
    due_date: data.due_date ?? null,
    is_completed: false,
    source_excerpt: data.source_excerpt ?? null,
  } as Partial<ActionItemRow>)
  return result.data!
}

/** Applies a partial patch to an action item; returns the updated row or null if the meeting or item is not found/owned. */
export async function updateActionItem(
  itemId: string,
  meetingId: string,
  ownerId: string,
  patch: Partial<ActionItemRow>,
): Promise<ActionItemRow | null> {
  const meeting = await getMeetingForOwner(meetingId, ownerId)
  if (!meeting) return null
  const existing = await findById<ActionItemRow>(ACTION_ITEMS_TABLE, itemId)
  if (!existing || existing.meeting_id !== meetingId) return null
  await updateById(ACTION_ITEMS_TABLE, itemId, patch)
  return findById<ActionItemRow>(ACTION_ITEMS_TABLE, itemId)
}

/** Deletes an action item by ID if its parent meeting belongs to the given owner; returns true on success, false if not found or not owned. */
export async function deleteActionItem(
  itemId: string,
  meetingId: string,
  ownerId: string,
): Promise<boolean> {
  const meeting = await getMeetingForOwner(meetingId, ownerId)
  if (!meeting) return false
  const item = await findById<ActionItemRow>(ACTION_ITEMS_TABLE, itemId)
  if (!item || item.meeting_id !== meetingId) return false
  await deleteById(ACTION_ITEMS_TABLE, itemId)
  return true
}
