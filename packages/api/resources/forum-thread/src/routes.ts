import { type Request, type RequestHandler, type Response, Router } from 'express'

import { getParamId, requireUser } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import {
  validateBody as validateBodyRaw,
  validateQuery as validateQueryRaw,
} from '@molecule/api-middleware-validation'

import {
  castVote,
  createReply,
  createThread,
  deleteReply,
  deleteThread,
  getThread,
  incrementViewCount,
  listReplies,
  listThreads,
  updateThread,
} from './service.js'
import {
  replyCreateSchema,
  threadCreateSchema,
  threadListQuerySchema,
  threadUpdateSchema,
  voteSchema,
} from './validation.js'

const validateBody = validateBodyRaw as unknown as (schema: unknown) => RequestHandler
const validateQuery = validateQueryRaw as unknown as (schema: unknown) => RequestHandler

/**
 * Express router for forum threads. Pass `isModeratorFor(userId)` to
 * allow moderator-only operations (pinning, status changes, deleting
 * others' threads/replies).
 */
export function createForumThreadRouter(
  opts: { isModeratorFor?: (userId: string) => boolean | Promise<boolean> } = {},
): Router {
  const router = Router()
  const isMod = opts.isModeratorFor ?? (() => false)

  // Public reads
  router.get('/', validateQuery(threadListQuerySchema), async (req: Request, res: Response) => {
    const q = req.query as Record<string, unknown>
    res.json(
      await listThreads({
        category_id: typeof q.category_id === 'string' ? q.category_id : undefined,
        status:
          typeof q.status === 'string'
            ? (q.status as 'open' | 'closed' | 'locked' | 'archived')
            : undefined,
        sort: typeof q.sort === 'string' ? (q.sort as 'recent' | 'top' | 'pinned') : undefined,
        page: typeof q.page === 'number' ? q.page : undefined,
        limit: typeof q.limit === 'number' ? q.limit : undefined,
      }),
    )
  })

  router.get('/:id', async (req: Request, res: Response) => {
    const thread = await getThread(getParamId(req))
    if (!thread) {
      res
        .status(404)
        .json({ error: t('thread.notFound', undefined, { defaultValue: 'Thread not found' }) })
      return
    }
    await incrementViewCount(thread.id)
    res.json(thread)
  })

  router.get('/:id/replies', async (req: Request, res: Response) => {
    const thread = await getThread(getParamId(req))
    if (!thread) {
      res
        .status(404)
        .json({ error: t('thread.notFound', undefined, { defaultValue: 'Thread not found' }) })
      return
    }
    res.json(await listReplies(thread.id))
  })

  // Authed writes
  router.post('/', validateBody(threadCreateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    res.status(201).json(await createThread(userId, req.body as Parameters<typeof createThread>[1]))
  })

  router.put('/:id', validateBody(threadUpdateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const moderator = await isMod(userId)
    const thread = await updateThread(
      getParamId(req),
      userId,
      moderator,
      req.body as Parameters<typeof updateThread>[3],
    )
    if (!thread) {
      res
        .status(404)
        .json({ error: t('thread.notFound', undefined, { defaultValue: 'Thread not found' }) })
      return
    }
    res.json(thread)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const moderator = await isMod(userId)
    const ok = await deleteThread(getParamId(req), userId, moderator)
    if (!ok) {
      res
        .status(404)
        .json({ error: t('thread.notFound', undefined, { defaultValue: 'Thread not found' }) })
      return
    }
    res.status(204).end()
  })

  router.post(
    '/:id/replies',
    validateBody(replyCreateSchema),
    async (req: Request, res: Response) => {
      const userId = requireUser(res)
      if (!userId) return
      const reply = await createReply(
        getParamId(req),
        userId,
        req.body as Parameters<typeof createReply>[2],
      )
      if (!reply) {
        res.status(400).json({
          error: t('thread.locked', undefined, { defaultValue: 'Thread is closed for replies' }),
        })
        return
      }
      res.status(201).json(reply)
    },
  )

  router.delete('/replies/:replyId', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const moderator = await isMod(userId)
    const ok = await deleteReply(getParamId(req, 'replyId'), userId, moderator)
    if (!ok) {
      res
        .status(404)
        .json({ error: t('reply.notFound', undefined, { defaultValue: 'Reply not found' }) })
      return
    }
    res.status(204).end()
  })

  router.post('/:id/vote', validateBody(voteSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const result = await castVote(
      userId,
      'thread',
      getParamId(req),
      (req.body as { value: 1 | -1 }).value,
    )
    if (!result) {
      res
        .status(404)
        .json({ error: t('thread.notFound', undefined, { defaultValue: 'Thread not found' }) })
      return
    }
    res.json(result)
  })

  router.post(
    '/replies/:replyId/vote',
    validateBody(voteSchema),
    async (req: Request, res: Response) => {
      const userId = requireUser(res)
      if (!userId) return
      const result = await castVote(
        userId,
        'reply',
        getParamId(req, 'replyId'),
        (req.body as { value: 1 | -1 }).value,
      )
      if (!result) {
        res
          .status(404)
          .json({ error: t('reply.notFound', undefined, { defaultValue: 'Reply not found' }) })
        return
      }
      res.json(result)
    },
  )

  return router
}
