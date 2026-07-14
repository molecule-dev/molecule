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
 * Run the bundled setup SQL once to create the `tasks` table:
 * `setup/tasks.sql`. The migrator factory in
 * `@molecule/api-bonds-default-express` will run it automatically if
 * placed in your `api/migrations` directory.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
