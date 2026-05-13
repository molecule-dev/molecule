/**
 * Express router factory for the journal-entry resource. Mount at any
 * path (e.g. `/api/journal`).
 *
 * @module
 */

import { Router, type Request, type Response } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import {
  validateBody as validateBodyRaw,
  validateParams,
} from '@molecule/api-middleware-validation'

import {
  computeStreak,
  createEntryForOwner,
  deleteEntryForOwner,
  exportEntries,
  formatExport,
  getEntryForOwner,
  listEntriesForOwner,
  updateEntryForOwner,
} from './service.js'
import { createEntrySchema, updateEntrySchema } from './validation.js'

const validateBody = validateBodyRaw as unknown as (
  schema: unknown,
) => import('express').RequestHandler

const EXPORT_FORMATS = ['json', 'csv', 'txt'] as const
type ExportFormat = (typeof EXPORT_FORMATS)[number]

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
}

function notFound(res: Response): Response {
  return res.status(404).json({
    error: t('journal.notFound', undefined, { defaultValue: 'Journal entry not found' }),
  })
}

function internalError(res: Response): Response {
  return res.status(500).json({
    error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
  })
}

/** Build the journal-entry router. */
export function createJournalEntryRouter(): Router {
  const router = Router()

  router.get('/entries', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    try {
      const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100))
      res.json(await listEntriesForOwner(userId, limit))
    } catch {
      internalError(res)
    }
  })

  router.get('/entries/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    try {
      const entry = await getEntryForOwner(userId, String(req.params.id))
      if (!entry) return notFound(res)
      res.json(entry)
    } catch {
      internalError(res)
    }
  })

  router.post('/entries', validateBody(createEntrySchema), async (req, res) => {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    try {
      const body = req.body as z.infer<typeof createEntrySchema>
      const created = await createEntryForOwner(userId, body)
      if (!created) return internalError(res)
      res.status(201).json(created)
    } catch {
      internalError(res)
    }
  })

  router.put(
    '/entries/:id',
    validateParams(idParamSchema),
    validateBody(updateEntrySchema),
    async (req, res) => {
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      try {
        const body = req.body as z.infer<typeof updateEntrySchema>
        const updated = await updateEntryForOwner(userId, String(req.params.id), body)
        if (!updated) return notFound(res)
        res.json(updated)
      } catch {
        internalError(res)
      }
    },
  )

  router.delete(
    '/entries/:id',
    validateParams(idParamSchema),
    async (req: Request, res: Response) => {
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      try {
        const ok = await deleteEntryForOwner(userId, String(req.params.id))
        if (!ok) return notFound(res)
        res.status(204).end()
      } catch {
        internalError(res)
      }
    },
  )

  router.get('/streak', async (_req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    try {
      res.json({ streak: await computeStreak(userId) })
    } catch {
      internalError(res)
    }
  })

  router.get('/export/:format', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    try {
      const format = String(req.params.format).toLowerCase() as ExportFormat
      if (!EXPORT_FORMATS.includes(format)) {
        return res.status(400).json({
          error: t('journal.invalidExportFormat', undefined, {
            defaultValue: 'Unsupported export format.',
          }),
        })
      }
      const records = await exportEntries(userId)
      const { contentType, body } = formatExport(records, format)
      const stamp = new Date().toISOString().slice(0, 10)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `attachment; filename="journal-${stamp}.${format}"`)
      res.end(body)
    } catch {
      internalError(res)
    }
  })

  return router
}
