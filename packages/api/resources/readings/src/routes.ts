import { type Request, type Response, Router } from 'express'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  validateBody as validateBodyRaw,
  validateQuery as validateQueryRaw,
} from '@molecule/api-middleware-validation'

import { ingestBulk, ingestReading, listAggregatedReadings, listRawReadings } from './service.js'
import { readingBulkSchema, readingCreateSchema, readingQuerySchema } from './validation.js'

const validateBody = validateBodyRaw as unknown as (
  schema: unknown,
) => import('express').RequestHandler
const validateQuery = validateQueryRaw as unknown as (
  schema: unknown,
) => import('express').RequestHandler

export function createReadingsRouter(): Router {
  const router = Router()

  router.post('/', validateBody(readingCreateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    res
      .status(201)
      .json(await ingestReading(userId, req.body as Parameters<typeof ingestReading>[1]))
  })

  router.post('/bulk', validateBody(readingBulkSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const body = req.body as { readings: Parameters<typeof ingestBulk>[1] }
    const inserted = await ingestBulk(userId, body.readings)
    res.status(201).json({ inserted })
  })

  router.get('/', validateQuery(readingQuerySchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const q = req.query as Record<string, unknown>
    const granularity = (typeof q.granularity === 'string' ? q.granularity : 'raw') as
      | 'raw'
      | '5min'
      | 'hour'
      | 'day'
    if (granularity === 'raw') {
      res.json(
        await listRawReadings(userId, {
          sensor_id: typeof q.sensor_id === 'string' ? q.sensor_id : undefined,
          metric: typeof q.metric === 'string' ? q.metric : undefined,
          from: typeof q.from === 'string' ? q.from : undefined,
          to: typeof q.to === 'string' ? q.to : undefined,
          limit: typeof q.limit === 'number' ? q.limit : undefined,
        }),
      )
    } else {
      res.json(
        await listAggregatedReadings(userId, {
          granularity,
          sensor_id: typeof q.sensor_id === 'string' ? q.sensor_id : undefined,
          metric: typeof q.metric === 'string' ? q.metric : undefined,
          from: typeof q.from === 'string' ? q.from : undefined,
          to: typeof q.to === 'string' ? q.to : undefined,
          limit: typeof q.limit === 'number' ? q.limit : undefined,
        }),
      )
    }
  })

  return router
}
