/**
 * Express router for wiki pages.
 *
 * Routes (mounted at e.g. `/pages`):
 * - `GET    /?space_id=…&parent_id=…` — list pages in a space
 * - `GET    /:id`                      — single page
 * - `GET    /:id/breadcrumbs`          — parent-chain breadcrumbs
 * - `GET    /by-slug/:spaceId/:slug`   — fetch by slug
 * - `POST   /`                          — create
 * - `PUT    /:id`                       — update (re-indexes for search bond)
 * - `DELETE /:id`                       — recursive delete (children + page)
 *
 * @module
 */

import type { RequestHandler } from 'express'
import { type Request, type Response, Router } from 'express'

import { getParamId, requireUser } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import {
  validateBody as validateBodyRaw,
  validateQuery as validateQueryRaw,
} from '@molecule/api-middleware-validation'

import {
  createPage,
  deletePage,
  getAccessibleSpace,
  getBreadcrumbs,
  getPageById,
  getPageBySlug,
  listPagesInSpace,
  updatePage,
} from './service.js'
import type { WikiPageRow } from './types.js'
import {
  slugify,
  wikiPageCreateSchema,
  wikiPageQuerySchema,
  wikiPageUpdateSchema,
} from './validation.js'

const validateBody = validateBodyRaw as unknown as (schema: unknown) => RequestHandler
const validateQuery = validateQueryRaw as unknown as (schema: unknown) => RequestHandler

/**
 * Creates and returns the Express router with all wiki-page CRUD routes.
 */
export function createWikiPageRouter(): Router {
  const router = Router()

  router.get('/', validateQuery(wikiPageQuerySchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const q = req.query as Record<string, unknown>
    if (typeof q.space_id !== 'string') {
      res.status(400).json({
        error: t('wiki.spaceIdRequired', undefined, { defaultValue: 'space_id is required' }),
      })
      return
    }
    const space = await getAccessibleSpace(q.space_id, userId)
    if (!space) {
      res
        .status(404)
        .json({ error: t('wiki.spaceNotFound', undefined, { defaultValue: 'Space not found' }) })
      return
    }
    res.json(
      await listPagesInSpace(q.space_id, {
        parent_id:
          typeof q.parent_id === 'string' ? q.parent_id : q.parent_id === null ? null : undefined,
        is_published: typeof q.is_published === 'boolean' ? q.is_published : undefined,
      }),
    )
  })

  router.get('/by-slug/:spaceId/:slug', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const space = await getAccessibleSpace(req.params.spaceId as string, userId)
    if (!space) {
      res
        .status(404)
        .json({ error: t('wiki.spaceNotFound', undefined, { defaultValue: 'Space not found' }) })
      return
    }
    const page = await getPageBySlug(req.params.spaceId as string, req.params.slug as string)
    if (!page) {
      res
        .status(404)
        .json({ error: t('wiki.pageNotFound', undefined, { defaultValue: 'Page not found' }) })
      return
    }
    res.json(page)
  })

  router.get('/:id/breadcrumbs', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const page = await getPageById(getParamId(req))
    if (!page) {
      res
        .status(404)
        .json({ error: t('wiki.pageNotFound', undefined, { defaultValue: 'Page not found' }) })
      return
    }
    const space = await getAccessibleSpace(page.space_id, userId)
    if (!space) {
      res
        .status(404)
        .json({ error: t('wiki.pageNotFound', undefined, { defaultValue: 'Page not found' }) })
      return
    }
    res.json(await getBreadcrumbs(page.id))
  })

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const page = await getPageById(getParamId(req))
    if (!page) {
      res
        .status(404)
        .json({ error: t('wiki.pageNotFound', undefined, { defaultValue: 'Page not found' }) })
      return
    }
    const space = await getAccessibleSpace(page.space_id, userId)
    if (!space) {
      res
        .status(404)
        .json({ error: t('wiki.pageNotFound', undefined, { defaultValue: 'Page not found' }) })
      return
    }
    res.json(page)
  })

  router.post('/', validateBody(wikiPageCreateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const body = req.body as Parameters<typeof createPage>[0]
    const space = await getAccessibleSpace(body.space_id, userId)
    if (!space || space.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('wiki.spaceNotFound', undefined, { defaultValue: 'Space not found' }) })
      return
    }
    const slug = body.slug ?? slugify(body.title)
    res.status(201).json(await createPage({ ...body, slug }))
  })

  router.put('/:id', validateBody(wikiPageUpdateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const page = await getPageById(getParamId(req))
    if (!page) {
      res
        .status(404)
        .json({ error: t('wiki.pageNotFound', undefined, { defaultValue: 'Page not found' }) })
      return
    }
    const space = await getAccessibleSpace(page.space_id, userId)
    if (!space || space.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('wiki.pageNotFound', undefined, { defaultValue: 'Page not found' }) })
      return
    }
    const updated = await updatePage(page.id, req.body as Partial<WikiPageRow>)
    res.json(updated)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const page = await getPageById(getParamId(req))
    if (!page) {
      res
        .status(404)
        .json({ error: t('wiki.pageNotFound', undefined, { defaultValue: 'Page not found' }) })
      return
    }
    const space = await getAccessibleSpace(page.space_id, userId)
    if (!space || space.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('wiki.pageNotFound', undefined, { defaultValue: 'Page not found' }) })
      return
    }
    await deletePage(page.id)
    res.status(204).end()
  })

  return router
}
