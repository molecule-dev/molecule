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
 * ```ts
 * import { createTaskRouter } from '@molecule/api-resource-task'
 * router.use('/tasks', createTaskRouter())
 * ```
 *
 * @example
 * ```ts
 * import { listTasksForOwner, createTaskForOwner } from '@molecule/api-resource-task'
 *
 * const tasks = await listTasksForOwner(userId, { filter: 'today' })
 * const created = await createTaskForOwner(userId, { title: 'Ship release', priority: 1 })
 * ```
 *
 * @remarks
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
