/**
 * `@molecule/api-resource-meeting` — meeting CRUD + action items.
 *
 * Tracks scheduled/in_progress/completed/cancelled meetings with
 * attendees, optional recording URL, transcript, and AI-friendly
 * summary slot. Action items nest under meetings and track
 * completion + assignee + due date + source excerpt.
 *
 * Extracted from the ai-meeting-notes flagship.
 *
 * @example
 * ```ts
 * import { createMeetingRouter } from '@molecule/api-resource-meeting'
 * app.use('/meetings', createMeetingRouter())
 * // GET|POST / · GET|PUT|DELETE /:id
 * // GET|POST /:id/action-items · PUT|DELETE /:id/action-items/:itemId
 * ```
 *
 * @example
 * ```ts
 * import { createActionItem, createMeetingForOwner } from '@molecule/api-resource-meeting'
 *
 * const meeting = await createMeetingForOwner(userId, {
 *   title: 'Sprint planning',
 *   scheduled_at: '2026-08-01T10:00:00Z',
 * })
 * await createActionItem(meeting.id, userId, { description: 'Send recap' })
 * ```
 *
 * @remarks
 * Tables: `src/__setup__/meetings.sql` creates `meetings` +
 * `meeting_action_items`. An mlcl-scaffolded API replays `__setup__/*.sql`
 * automatically on migrate; anywhere else run it once — nothing at runtime
 * creates them.
 *
 * The router does not authenticate — it reads the caller from
 * `res.locals.session` (populated by your global auth middleware) and 401s
 * without a session. All service functions are owner-scoped
 * (`…ForOwner(…, ownerId)` / `(meetingId, ownerId, …)`) and return `null`
 * for rows the caller doesn't own — always pass the AUTHENTICATED user's id.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
