# @molecule/api-resource-task

`@molecule/api-resource-task` — owner-scoped task CRUD with subtasks,
priorities, due dates, position ordering, recurrence rules, and
completion semantics.

Extracted from the to-do-list flagship app. Provides a ready-to-mount
Express router (`createTaskRouter()`) plus pure data-access functions
for use outside HTTP contexts.

## Quick Start

```ts
import { createTaskRouter } from '@molecule/api-resource-task'
router.use('/tasks', createTaskRouter())
```

```ts
import { listTasksForOwner, createTaskForOwner } from '@molecule/api-resource-task'

const tasks = await listTasksForOwner(userId, { filter: 'today' })
const created = await createTaskForOwner(userId, { title: 'Ship release', priority: 1 })
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-task @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation express zod
npm install -D @types/express
```

## API

### Interfaces

#### `Task`

Wire format — serialised for transport to the frontend.

```typescript
interface Task {
  id: string
  title: string
  description: string | null
  priority: TaskPriority
  due_date: string | null
  due_time: string | null
  parent_id: string | null
  recurrence_rule: string | null
  recurring: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  completed: boolean
  completed_at: string | null
  position: number
  created_at: string
  updated_at: string
}
```

#### `TaskRow`

Database row shape for a task.

```typescript
interface TaskRow {
  id: string
  owner_id: string
  parent_id: string | null
  title: string
  description: string | null
  priority: TaskPriority
  due_date: string | Date | null
  due_time: string | null
  recurrence_rule: string | null
  position: number | string
  is_completed: boolean
  completed_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}
```

### Types

#### `TaskPriority`

Priority levels — 1 (lowest) through 4 (highest).

```typescript
type TaskPriority = 1 | 2 | 3 | 4
```

### Functions

#### `createTaskForOwner(ownerId, data)`

Create a new task owned by the given user and return the serialised Task.

```typescript
function createTaskForOwner(ownerId: string, data: { title: string; description?: string; parent_id?: string | null; priority?: number; due_date?: string | null; due_time?: string | null; recurrence_rule?: string | null; position?: number; }): Promise<Task>
```

#### `createTaskRouter()`

Creates and returns an Express Router with all task CRUD and reorder endpoints mounted.

```typescript
function createTaskRouter(): Router
```

#### `deleteTaskForOwner(taskId, ownerId)`

Delete a task owned by the given user; returns true if deleted, false if not found/owned.

```typescript
function deleteTaskForOwner(taskId: string, ownerId: string): Promise<boolean>
```

#### `getTaskForOwner(taskId, ownerId)`

Load a single task scoped to its owner. Returns null if missing or not owned.

```typescript
function getTaskForOwner(taskId: string, ownerId: string): Promise<Task | null>
```

#### `listTasksForOwner(ownerId, opts?)`

List tasks for an owner with optional filters.

```typescript
function listTasksForOwner(ownerId: string, opts?: { parent_id?: string | null; completed?: boolean; due_date?: string; filter?: "today" | "upcoming"; limit?: number; offset?: number; }): Promise<Task[]>
```

#### `reorderTasksForOwner(ownerId, items)`

Update the position field for a batch of tasks owned by the given user; returns the count of rows updated.

```typescript
function reorderTasksForOwner(ownerId: string, items: { id: string; position: number; }[]): Promise<number>
```

#### `toTask(row)`

Serialise a DB row into a wire-format Task.

```typescript
function toTask(row: TaskRow): Task
```

#### `updateTaskForOwner(taskId, ownerId, patch)`

Apply a partial patch to a task owned by the given user; returns the updated Task or null if not found/owned.

```typescript
function updateTaskForOwner(taskId: string, ownerId: string, patch: Partial<{ title: string; description: string | null; parent_id: string | null; priority: number; due_date: string | null; due_time: string | null; recurrence_rule: string | null; position: number; is_completed: boolean; }>): Promise<Task | null>
```

### Constants

#### `reorderSchema`

Validates the request body for bulk-reordering tasks (array of id + position pairs).

```typescript
const reorderSchema: z.ZodObject<{ tasks: z.ZodArray<z.ZodObject<{ id: z.ZodString; position: z.ZodNumber; }, z.core.$strip>>; }, z.core.$strip>
```

#### `taskCreateSchema`

Validates the request body for creating a new task.

```typescript
const taskCreateSchema: z.ZodObject<{ title: z.ZodString; description: z.ZodOptional<z.ZodString>; parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; priority: z.ZodOptional<z.ZodNumber>; due_date: z.ZodOptional<z.ZodNullable<z.ZodString>>; due_time: z.ZodOptional<z.ZodNullable<z.ZodString>>; recurrence_rule: z.ZodOptional<z.ZodNullable<z.ZodString>>; position: z.ZodOptional<z.ZodNumber>; }, z.core.$strip>
```

#### `taskListQuerySchema`

Validates query parameters for listing tasks (filtering, pagination, and due-date constraints).

```typescript
const taskListQuerySchema: z.ZodObject<{ parent_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; completed: z.ZodOptional<z.ZodCoercedBoolean<unknown>>; due_date: z.ZodOptional<z.ZodString>; filter: z.ZodOptional<z.ZodEnum<{ today: "today"; upcoming: "upcoming"; }>>; limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>; offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>; }, z.core.$strip>
```

#### `taskRouter`

Singleton task router instance created from {@link createTaskRouter}.

```typescript
const taskRouter: Router
```

#### `taskUpdateSchema`

Validates the request body for updating an existing task (all fields optional, plus completion flag).

```typescript
const taskUpdateSchema: z.ZodObject<{ title: z.ZodOptional<z.ZodString>; description: z.ZodOptional<z.ZodOptional<z.ZodString>>; parent_id: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; priority: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; due_date: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; due_time: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; recurrence_rule: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; position: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; is_completed: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`
- `express`
- `zod`

Session-auth prerequisite: every route reads the caller via
`requireUser(res)` (`res.locals.session.userId`, 401 fail-closed) — mount
`createTaskRouter()` behind your global auth middleware. All queries are
owner-scoped through the `*ForOwner` service functions using that session
id; never pass a client-supplied owner id. Unlike declarative-route
resources there is no `routes`/`requestHandlerMap` export — this package
ships the Express router factory shown above (plus a `taskRouter`
singleton).

Tables: `src/__setup__/tasks.sql` creates `tasks`. An mlcl-scaffolded API
replays `__setup__/*.sql` automatically on migrate; anywhere else run it
once — nothing at runtime creates them.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Creating a task through the UI persists its real fields (title,
  description, priority 1–4, due_date, due_time) and it appears in the
  signed-in user's list immediately and after a full reload; a task created
  with no priority defaults to 4.
- [ ] Toggling completion flips `completed` and stamps `completed_at`: the
  task leaves the active list and shows in the completed view; toggling it
  back clears `completed_at` and returns it to the active list.
- [ ] Editing a task's title, description, priority, or due date via the
  update flow reflects immediately in the UI and persists across a reload.
- [ ] Ordering holds: the list sorts by priority (highest first) then
  position, and reordering tasks (drag/move → the reorder action's position
  writes) persists — a reload keeps the new order, not the pre-drag one.
- [ ] Filters narrow to exactly the right set: `today` shows only incomplete
  tasks due today, `upcoming` only incomplete tasks that have a due date, the
  completed view only completed tasks, and opening a task's subtasks lists
  only its children (parent_id) — never the whole task list.
- [ ] If the app surfaces recurrence or overdue: a task with a recurrence
  rule shows its recurring label (daily/weekly/monthly/yearly), and an
  incomplete task whose due_date is in the past reads as overdue.
- [ ] AUTHORIZATION — every path is owner-scoped to the session user
  (`*ForOwner`): a user sees and mutates only their OWN tasks. Guessing or
  tampering another user's task id on GET/PUT/DELETE `/:id` returns 404 and
  never that task's data; slipping a foreign id into a reorder batch leaves
  that task's position unchanged (it is skipped, not moved).
