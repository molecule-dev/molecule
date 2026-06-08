import { type Request, type RequestHandler, type Response, Router } from 'express'

import { getParamId, requireUser } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { validateBody as validateBodyRaw } from '@molecule/api-middleware-validation'

import {
  createActionItem,
  createMeetingForOwner,
  deleteActionItem,
  deleteMeetingForOwner,
  getMeetingForOwner,
  listActionItems,
  listMeetingsForOwner,
  updateActionItem,
  updateMeetingForOwner,
} from './service.js'
import type { ActionItemRow, MeetingRow } from './types.js'
import {
  actionItemCreateSchema,
  actionItemUpdateSchema,
  meetingCreateSchema,
  meetingUpdateSchema,
} from './validation.js'

const validateBody = validateBodyRaw as unknown as (schema: unknown) => RequestHandler

/** Creates and returns an Express Router with all meeting and action-item CRUD routes. */
export function createMeetingRouter(): Router {
  const router = Router()

  router.get('/', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const q = req.query as Record<string, unknown>
    res.json(
      await listMeetingsForOwner(userId, {
        status:
          typeof q.status === 'string'
            ? (q.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
            : undefined,
        page: typeof q.page === 'string' ? Number(q.page) : undefined,
        limit: typeof q.limit === 'string' ? Number(q.limit) : undefined,
      }),
    )
  })

  router.post('/', validateBody(meetingCreateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    res
      .status(201)
      .json(
        await createMeetingForOwner(
          userId,
          req.body as Parameters<typeof createMeetingForOwner>[1],
        ),
      )
  })

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const m = await getMeetingForOwner(getParamId(req), userId)
    if (!m) {
      res
        .status(404)
        .json({ error: t('meeting.notFound', undefined, { defaultValue: 'Meeting not found' }) })
      return
    }
    res.json(m)
  })

  router.put('/:id', validateBody(meetingUpdateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const m = await updateMeetingForOwner(getParamId(req), userId, req.body as Partial<MeetingRow>)
    if (!m) {
      res
        .status(404)
        .json({ error: t('meeting.notFound', undefined, { defaultValue: 'Meeting not found' }) })
      return
    }
    res.json(m)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const ok = await deleteMeetingForOwner(getParamId(req), userId)
    if (!ok) {
      res
        .status(404)
        .json({ error: t('meeting.notFound', undefined, { defaultValue: 'Meeting not found' }) })
      return
    }
    res.status(204).end()
  })

  // Action items
  router.get('/:id/action-items', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const items = await listActionItems(getParamId(req), userId)
    if (items === null) {
      res
        .status(404)
        .json({ error: t('meeting.notFound', undefined, { defaultValue: 'Meeting not found' }) })
      return
    }
    res.json(items)
  })

  router.post(
    '/:id/action-items',
    validateBody(actionItemCreateSchema),
    async (req: Request, res: Response) => {
      const userId = requireUser(res)
      if (!userId) return
      const item = await createActionItem(
        getParamId(req),
        userId,
        req.body as Parameters<typeof createActionItem>[2],
      )
      if (!item) {
        res
          .status(404)
          .json({ error: t('meeting.notFound', undefined, { defaultValue: 'Meeting not found' }) })
        return
      }
      res.status(201).json(item)
    },
  )

  router.put(
    '/:id/action-items/:itemId',
    validateBody(actionItemUpdateSchema),
    async (req: Request, res: Response) => {
      const userId = requireUser(res)
      if (!userId) return
      const item = await updateActionItem(
        getParamId(req, 'itemId'),
        getParamId(req),
        userId,
        req.body as Partial<ActionItemRow>,
      )
      if (!item) {
        res.status(404).json({
          error: t('actionItem.notFound', undefined, { defaultValue: 'Action item not found' }),
        })
        return
      }
      res.json(item)
    },
  )

  router.delete('/:id/action-items/:itemId', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const ok = await deleteActionItem(getParamId(req, 'itemId'), getParamId(req), userId)
    if (!ok) {
      res.status(404).json({
        error: t('actionItem.notFound', undefined, { defaultValue: 'Action item not found' }),
      })
      return
    }
    res.status(204).end()
  })

  return router
}
