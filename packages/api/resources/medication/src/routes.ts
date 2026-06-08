import { type Request, type RequestHandler, type Response, Router } from 'express'

import { getParamId, requireUser } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { validateBody as validateBodyRaw } from '@molecule/api-middleware-validation'

import {
  adherenceRate,
  createMedicationForOwner,
  deleteMedicationForOwner,
  getMedicationForOwner,
  listLogs,
  listMedicationsForOwner,
  logDose,
  updateMedicationForOwner,
} from './service.js'
import type { MedicationRow } from './types.js'
import { logCreateSchema, medicationCreateSchema, medicationUpdateSchema } from './validation.js'

const validateBody = validateBodyRaw as unknown as (schema: unknown) => RequestHandler

/** Creates and returns the Express router for medication CRUD and dose-logging endpoints. */
export function createMedicationRouter(): Router {
  const router = Router()

  router.get('/', async (_req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    res.json(await listMedicationsForOwner(userId, { include_inactive: true }))
  })

  router.post('/', validateBody(medicationCreateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    res
      .status(201)
      .json(
        await createMedicationForOwner(
          userId,
          req.body as Parameters<typeof createMedicationForOwner>[1],
        ),
      )
  })

  router.get('/adherence', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const from =
      (req.query.from as string) ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const to = (req.query.to as string) ?? new Date().toISOString()
    res.json(await adherenceRate(userId, from, to))
  })

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const m = await getMedicationForOwner(getParamId(req), userId)
    if (!m) {
      res.status(404).json({
        error: t('medication.notFound', undefined, { defaultValue: 'Medication not found' }),
      })
      return
    }
    res.json(m)
  })

  router.put('/:id', validateBody(medicationUpdateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const m = await updateMedicationForOwner(
      getParamId(req),
      userId,
      req.body as Partial<MedicationRow>,
    )
    if (!m) {
      res.status(404).json({
        error: t('medication.notFound', undefined, { defaultValue: 'Medication not found' }),
      })
      return
    }
    res.json(m)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const ok = await deleteMedicationForOwner(getParamId(req), userId)
    if (!ok) {
      res.status(404).json({
        error: t('medication.notFound', undefined, { defaultValue: 'Medication not found' }),
      })
      return
    }
    res.status(204).end()
  })

  router.get('/:id/logs', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const logs = await listLogs(getParamId(req), userId, {
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    })
    if (logs === null) {
      res.status(404).json({
        error: t('medication.notFound', undefined, { defaultValue: 'Medication not found' }),
      })
      return
    }
    res.json(logs)
  })

  router.post('/:id/logs', validateBody(logCreateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const log = await logDose(getParamId(req), userId, req.body as Parameters<typeof logDose>[2])
    if (!log) {
      res.status(404).json({
        error: t('medication.notFound', undefined, { defaultValue: 'Medication not found' }),
      })
      return
    }
    res.status(201).json(log)
  })

  return router
}
