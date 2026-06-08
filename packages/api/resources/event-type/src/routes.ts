/**
 * Express router for event types + availability.
 *
 * Public routes (no auth):
 * - `GET /by-slug/:slug` — fetch published event-type by slug
 * - `GET /by-slug/:slug/availability?date=YYYY-MM-DD` — slot generation
 *
 * Authed routes (host operating their catalog):
 * - `GET /` / `POST /` / `GET /:id` / `PUT /:id` / `DELETE /:id`
 * - `GET /availability/rules` — list host's availability rules
 * - `PUT /availability/rules` — replace all rules for host
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
  createEventTypeForOwner,
  deleteEventTypeForOwner,
  generateSlots,
  getEventTypeBySlug,
  getEventTypeForOwner,
  listAvailabilityRulesForUser,
  listEventTypesForOwner,
  setAvailabilityRulesForUser,
  updateEventTypeForOwner,
} from './service.js'
import type { EventTypeRow } from './types.js'
import {
  availabilityQuerySchema,
  availabilityRuleSchema,
  eventTypeCreateSchema,
  eventTypeUpdateSchema,
} from './validation.js'

const validateBody = validateBodyRaw as unknown as (schema: unknown) => RequestHandler
const validateQuery = validateQueryRaw as unknown as (schema: unknown) => RequestHandler

/** Creates and returns the Express router for event-type and availability endpoints. */
export function createEventTypeRouter(): Router {
  const router = Router()

  // Public — by slug
  router.get('/by-slug/:slug', async (req: Request, res: Response) => {
    const slug = req.params.slug as string
    const et = await getEventTypeBySlug(slug)
    if (!et) {
      res.status(404).json({
        error: t('eventType.notFound', undefined, { defaultValue: 'Event type not found' }),
      })
      return
    }
    res.json({ eventType: et })
  })

  router.get(
    '/by-slug/:slug/availability',
    validateQuery(availabilityQuerySchema),
    async (req: Request, res: Response) => {
      const slug = req.params.slug as string
      const et = await getEventTypeBySlug(slug)
      if (!et) {
        res.status(404).json({
          error: t('eventType.notFound', undefined, { defaultValue: 'Event type not found' }),
        })
        return
      }
      const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10)
      const rules = await listAvailabilityRulesForUser(et.owner_id)
      const slots = generateSlots({
        date,
        durationMinutes: et.duration_minutes,
        bufferBeforeMinutes: et.buffer_before_minutes,
        bufferAfterMinutes: et.buffer_after_minutes,
        rules,
      })
      res.json({ slots, duration_minutes: et.duration_minutes })
    },
  )

  // Authed — catalog
  router.get('/availability/rules', async (_req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    res.json(await listAvailabilityRulesForUser(userId))
  })

  router.put(
    '/availability/rules',
    validateBody(availabilityRuleSchema.array()),
    async (req: Request, res: Response) => {
      const userId = requireUser(res)
      if (!userId) return
      const rules = req.body as Parameters<typeof setAvailabilityRulesForUser>[1]
      res.json(await setAvailabilityRulesForUser(userId, rules))
    },
  )

  router.get('/', async (_req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    res.json(await listEventTypesForOwner(userId, { include_inactive: true }))
  })

  router.post('/', validateBody(eventTypeCreateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    res
      .status(201)
      .json(
        await createEventTypeForOwner(
          userId,
          req.body as Parameters<typeof createEventTypeForOwner>[1],
        ),
      )
  })

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const et = await getEventTypeForOwner(getParamId(req), userId)
    if (!et) {
      res.status(404).json({
        error: t('eventType.notFound', undefined, { defaultValue: 'Event type not found' }),
      })
      return
    }
    res.json(et)
  })

  router.put('/:id', validateBody(eventTypeUpdateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const et = await updateEventTypeForOwner(
      getParamId(req),
      userId,
      req.body as Partial<EventTypeRow>,
    )
    if (!et) {
      res.status(404).json({
        error: t('eventType.notFound', undefined, { defaultValue: 'Event type not found' }),
      })
      return
    }
    res.json(et)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const ok = await deleteEventTypeForOwner(getParamId(req), userId)
    if (!ok) {
      res.status(404).json({
        error: t('eventType.notFound', undefined, { defaultValue: 'Event type not found' }),
      })
      return
    }
    res.status(204).end()
  })

  return router
}
