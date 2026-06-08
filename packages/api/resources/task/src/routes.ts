/**
 * Express router mounting all task CRUD endpoints.
 *
 * Routes (relative to mount point, e.g. `/tasks`):
 * - `GET    /`        — list tasks for caller
 * - `GET    /:id`     — single task by id
 * - `POST   /`        — create
 * - `PUT    /:id`     — update (partial)
 * - `DELETE /:id`     — delete
 * - `POST   /reorder` — bulk position update
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'

import { getParamId, requireUser } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import {
  validateBody as validateBodyRaw,
  validateQuery as validateQueryRaw,
} from '@molecule/api-middleware-validation'

// Cast through unknown to bridge zod v3/v4 type drift between this pkg's
// zod and the validation pkg's zod peerDep. Behaviour-equivalent.
const validateBody = validateBodyRaw as unknown as (schema: unknown) => RequestHandler
const validateQuery = validateQueryRaw as unknown as (schema: unknown) => RequestHandler

import {
  createTaskForOwner,
  deleteTaskForOwner,
  getTaskForOwner,
  listTasksForOwner,
  reorderTasksForOwner,
  updateTaskForOwner,
} from './service.js'
import {
  reorderSchema,
  taskCreateSchema,
  taskListQuerySchema,
  taskUpdateSchema,
} from './validation.js'

/**
 * Creates and returns an Express Router with all task CRUD and reorder endpoints mounted.
 */
export function createTaskRouter(): Router {
  const router = Router()

  router.get('/', validateQuery(taskListQuerySchema), async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const q = req.query as Record<string, unknown>
    const tasks = await listTasksForOwner(ownerId, {
      parent_id: typeof q.parent_id === 'string' ? q.parent_id : undefined,
      completed: typeof q.completed === 'boolean' ? q.completed : undefined,
      due_date: typeof q.due_date === 'string' ? q.due_date : undefined,
      filter: q.filter === 'today' || q.filter === 'upcoming' ? q.filter : undefined,
      limit: typeof q.limit === 'number' ? q.limit : undefined,
      offset: typeof q.offset === 'number' ? q.offset : undefined,
    })
    res.json(tasks)
  })

  router.post('/reorder', validateBody(reorderSchema), async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const body = req.body as { tasks: Array<{ id: string; position: number }> }
    const updated = await reorderTasksForOwner(ownerId, body.tasks)
    res.json({ updated })
  })

  router.get('/:id', async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const task = await getTaskForOwner(getParamId(req), ownerId)
    if (!task) {
      res
        .status(404)
        .json({ error: t('task.notFound', undefined, { defaultValue: 'Task not found' }) })
      return
    }
    res.json(task)
  })

  router.post('/', validateBody(taskCreateSchema), async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const body = req.body as Parameters<typeof createTaskForOwner>[1]
    const task = await createTaskForOwner(ownerId, body)
    res.status(201).json(task)
  })

  router.put('/:id', validateBody(taskUpdateSchema), async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const task = await updateTaskForOwner(
      getParamId(req),
      ownerId,
      req.body as Parameters<typeof updateTaskForOwner>[2],
    )
    if (!task) {
      res
        .status(404)
        .json({ error: t('task.notFound', undefined, { defaultValue: 'Task not found' }) })
      return
    }
    res.json(task)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const ownerId = requireUser(res)
    if (!ownerId) return
    const ok = await deleteTaskForOwner(getParamId(req), ownerId)
    if (!ok) {
      res
        .status(404)
        .json({ error: t('task.notFound', undefined, { defaultValue: 'Task not found' }) })
      return
    }
    res.status(204).end()
  })

  return router
}

/**
 * Singleton task router instance created from {@link createTaskRouter}.
 */
export const taskRouter = createTaskRouter()
