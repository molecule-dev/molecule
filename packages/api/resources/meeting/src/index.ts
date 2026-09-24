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
 * ```typescript
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   createActionItem,
 *   createMeetingForOwner,
 *   createMeetingRouter,
 *   updateMeetingForOwner,
 * } from '@molecule/api-resource-meeting'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL), then mount the
 * // router AFTER the global auth middleware that sets res.locals.session (else every call 401s).
 * setStore(store)
 * const app = express()
 * app.use(express.json())
 * app.use('/meetings', createMeetingRouter())
 * // GET|POST / · GET|PUT|DELETE /:id · GET|POST /:id/action-items · PUT|DELETE /:id/action-items/:itemId
 *
 * // Server-side equivalent of POST /meetings, POST /meetings/:id/action-items, PUT /meetings/:id:
 * const userId = 'user-123' // the SESSION user — never a client-sent id
 * const meeting = await createMeetingForOwner(userId, {
 *   title: 'Sprint planning',
 *   scheduled_at: '2026-08-01T10:00:00Z', // omit it and the meeting is created 'completed'
 *   attendees: [{ name: 'Ada', email: 'ada@example.com' }],
 * })
 * const item = await createActionItem(meeting.id, userId, { description: 'Send recap' })
 * const done = await updateMeetingForOwner(meeting.id, userId, {
 *   status: 'completed',
 *   started_at: '2026-08-01T10:00:00Z',
 *   ended_at: '2026-08-01T10:45:00Z',
 * })
 * console.log(meeting.status, item?.is_completed, done?.duration_seconds) // 'scheduled' false 2700
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
 * **Bond the DataStore first** (`setStore(...)` from `@molecule/api-database`).
 * A meeting created WITHOUT `scheduled_at` starts as `'completed'`, not
 * `'scheduled'`. `duration_seconds` is derived (in SECONDS) only when both
 * `started_at` and `ended_at` are set via update. There is no AI in this
 * package — `transcript` and `summary` are plain columns you fill yourself
 * (e.g. with `@molecule/api-ai`), and action items are never auto-extracted.
 * `GET /meetings` returns `{ data, total }` (`?status`, `?page` 1-based,
 * `?limit` default 50) — read the rows off `.data`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
