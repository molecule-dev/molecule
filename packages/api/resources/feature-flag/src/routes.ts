/**
 * Express router for feature flags + targeting rules.
 *
 * Routes (mounted at e.g. `/flags`):
 * - `GET    /`              — list flags
 * - `GET    /:id`           — single flag
 * - `POST   /`              — create flag
 * - `PUT    /:id`           — update flag
 * - `DELETE /:id`           — delete flag
 * - `GET    /:id/rules`     — list targeting rules
 * - `POST   /:id/rules`     — add a targeting rule
 * - `DELETE /:id/rules/:ruleId` — delete rule
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

import {
  addRuleToFlag,
  createFlagForUser,
  deleteFlagForUser,
  deleteRule,
  getFlagForUser,
  listFlagsForUser,
  listRulesForFlag,
  updateFlagForUser,
} from './service.js'
import {
  flagCreateSchema,
  flagListQuerySchema,
  flagUpdateSchema,
  ruleSchema,
} from './validation.js'

const validateBody = validateBodyRaw as unknown as (schema: unknown) => RequestHandler
const validateQuery = validateQueryRaw as unknown as (schema: unknown) => RequestHandler

/**
 * Creates and returns an Express Router with all feature-flag and targeting-rule endpoints.
 */
export function createFeatureFlagRouter(): Router {
  const router = Router()

  router.get('/', validateQuery(flagListQuerySchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const q = req.query as Record<string, unknown>
    res.json(
      await listFlagsForUser(userId, {
        page: typeof q.page === 'number' ? q.page : undefined,
        limit: typeof q.limit === 'number' ? q.limit : undefined,
        project_id: typeof q.project_id === 'string' ? q.project_id : undefined,
        environment: typeof q.environment === 'string' ? q.environment : undefined,
        state:
          typeof q.state === 'string'
            ? (q.state as 'on' | 'off' | 'killed' | 'scheduled')
            : undefined,
      }),
    )
  })

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const flag = await getFlagForUser(getParamId(req), userId)
    if (!flag) {
      res
        .status(404)
        .json({ error: t('flag.notFound', undefined, { defaultValue: 'Flag not found' }) })
      return
    }
    res.json(flag)
  })

  router.post('/', validateBody(flagCreateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const body = req.body as Parameters<typeof createFlagForUser>[1]
    res.status(201).json(await createFlagForUser(userId, body))
  })

  router.put('/:id', validateBody(flagUpdateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const flag = await updateFlagForUser(
      getParamId(req),
      userId,
      req.body as Parameters<typeof updateFlagForUser>[2],
    )
    if (!flag) {
      res
        .status(404)
        .json({ error: t('flag.notFound', undefined, { defaultValue: 'Flag not found' }) })
      return
    }
    res.json(flag)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const ok = await deleteFlagForUser(getParamId(req), userId)
    if (!ok) {
      res
        .status(404)
        .json({ error: t('flag.notFound', undefined, { defaultValue: 'Flag not found' }) })
      return
    }
    res.status(204).end()
  })

  router.get('/:id/rules', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const rules = await listRulesForFlag(getParamId(req), userId)
    if (rules === null) {
      res
        .status(404)
        .json({ error: t('flag.notFound', undefined, { defaultValue: 'Flag not found' }) })
      return
    }
    res.json(rules)
  })

  router.post('/:id/rules', validateBody(ruleSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const rule = await addRuleToFlag(
      getParamId(req),
      userId,
      req.body as Parameters<typeof addRuleToFlag>[2],
    )
    if (!rule) {
      res
        .status(404)
        .json({ error: t('flag.notFound', undefined, { defaultValue: 'Flag not found' }) })
      return
    }
    res.status(201).json(rule)
  })

  router.delete('/:id/rules/:ruleId', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const ok = await deleteRule(getParamId(req, 'ruleId'), getParamId(req), userId)
    if (!ok) {
      res
        .status(404)
        .json({ error: t('rule.notFound', undefined, { defaultValue: 'Rule not found' }) })
      return
    }
    res.status(204).end()
  })

  return router
}
