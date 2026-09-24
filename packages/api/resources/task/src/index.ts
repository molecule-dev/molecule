/**
 * `@molecule/api-resource-task` — owner-scoped task CRUD with subtasks,
 * priorities, due dates, position ordering, recurrence rules, and
 * completion semantics.
 *
 * Extracted from the to-do-list flagship app. Provides a ready-to-mount
 * Express router (`createTaskRouter()`) plus pure data-access functions
 * for use outside HTTP contexts.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { createTaskForOwner, createTaskRouter } from '@molecule/api-resource-task'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL).
 * setStore(store)
 *
 * export const app = express()
 * app.use(express.json())
 * // The app's global auth middleware must set res.locals.session.userId BEFORE the router.
 * app.use('/tasks', createTaskRouter()) // GET/POST /tasks, GET/PUT/DELETE /tasks/:id, POST /tasks/reorder
 *
 * // Client (signed in): POST /tasks { title: 'Ship release', priority: 1, due_date: '2026-10-01' }
 * //   → 201 { id, title, priority: 1, due_date: '2026-10-01', completed: false, ... }
 * // PUT /tasks/:id { is_completed: true } → 200 { completed: true, completed_at: '<ISO>' }
 *
 * // Outside HTTP (seed, import, cron) use the owner-scoped service functions directly.
 * const task = await createTaskForOwner('user-1', { title: 'Water plants', recurrence_rule: 'every 1 week' })
 * console.log(task.recurring) // 'weekly'
 * ```
 *
 * @remarks
 * - **Bond the DataStore before mounting** (`setStore(...)`); every route and service function
 *   reads/writes the `tasks` table through it.
 * - Fields are snake_case on the wire (`due_date`, `parent_id`, `recurrence_rule`); to complete a
 *   task send `PUT /tasks/:id { is_completed: true }` (the response field is `completed`).
 *   `priority` is an integer 1–4 (anything else is stored as 4); `parent_id` must be a UUID.
 * - `recurrence_rule` is stored text only — completing a recurring task does NOT create the next
 *   occurrence; `recurring` is just a label derived from `every N day|week|month|year`.
 * - `GET /tasks` returns a bare `Task[]` (no pagination envelope); `?filter=today|upcoming`.
 * Session-auth prerequisite: every route reads the caller via
 * `requireUser(res)` (`res.locals.session.userId`, 401 fail-closed) — mount
 * `createTaskRouter()` behind your global auth middleware. All queries are
 * owner-scoped through the `*ForOwner` service functions using that session
 * id; never pass a client-supplied owner id. Unlike declarative-route
 * resources there is no `routes`/`requestHandlerMap` export — this package
 * ships the Express router factory shown above (plus a `taskRouter`
 * singleton).
 *
 * Tables: `src/__setup__/tasks.sql` creates `tasks`. An mlcl-scaffolded API
 * replays `__setup__/*.sql` automatically on migrate; anywhere else run it
 * once — nothing at runtime creates them.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Creating a task through the UI persists its real fields (title,
 *   description, priority 1–4, due_date, due_time) and it appears in the
 *   signed-in user's list immediately and after a full reload; a task created
 *   with no priority defaults to 4.
 * - [ ] Toggling completion flips `completed` and stamps `completed_at`: the
 *   task leaves the active list and shows in the completed view; toggling it
 *   back clears `completed_at` and returns it to the active list.
 * - [ ] Editing a task's title, description, priority, or due date via the
 *   update flow reflects immediately in the UI and persists across a reload.
 * - [ ] Ordering holds: the list sorts by priority (highest first) then
 *   position, and reordering tasks (drag/move → the reorder action's position
 *   writes) persists — a reload keeps the new order, not the pre-drag one.
 * - [ ] Filters narrow to exactly the right set: `today` shows only incomplete
 *   tasks due today, `upcoming` only incomplete tasks that have a due date, the
 *   completed view only completed tasks, and opening a task's subtasks lists
 *   only its children (parent_id) — never the whole task list.
 * - [ ] If the app surfaces recurrence or overdue: a task with a recurrence
 *   rule shows its recurring label (daily/weekly/monthly/yearly), and an
 *   incomplete task whose due_date is in the past reads as overdue.
 * - [ ] AUTHORIZATION — every path is owner-scoped to the session user
 *   (`*ForOwner`): a user sees and mutates only their OWN tasks. Guessing or
 *   tampering another user's task id on GET/PUT/DELETE `/:id` returns 404 and
 *   never that task's data; slipping a foreign id into a reorder batch leaves
 *   that task's position unchanged (it is skipped, not moved).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
