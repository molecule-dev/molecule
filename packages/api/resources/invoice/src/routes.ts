/**
 * Express router for invoices.
 *
 * Routes (mounted at e.g. `/invoices`):
 * - `GET    /`            — list
 * - `GET    /:id`         — single
 * - `POST   /`            — create
 * - `PUT    /:id`         — update (incl. status changes)
 * - `DELETE /:id`         — delete
 * - `POST   /:id/payment` — record a payment (auto-promotes status)
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'

import { getParamId, requireUser } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { validateBody as validateBodyRaw } from '@molecule/api-middleware-validation'

import {
  createInvoiceForUser,
  deleteInvoiceForUser,
  getInvoiceForUser,
  listInvoicesForUser,
  recordPayment,
  updateInvoiceForUser,
} from './service.js'
import { invoiceCreateSchema, invoiceUpdateSchema, recordPaymentSchema } from './validation.js'

const validateBody = validateBodyRaw as unknown as (schema: unknown) => RequestHandler

/**
 * Creates and returns an Express router with all CRUD + payment routes for invoices.
 */
export function createInvoiceRouter(): Router {
  const router = Router()

  router.get('/', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const q = req.query as Record<string, unknown>
    res.json(
      await listInvoicesForUser(userId, {
        client_id: typeof q.client_id === 'string' ? q.client_id : undefined,
        status:
          typeof q.status === 'string'
            ? (q.status as 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void')
            : undefined,
        page: typeof q.page === 'string' ? Number(q.page) : undefined,
        limit: typeof q.limit === 'string' ? Number(q.limit) : undefined,
      }),
    )
  })

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const inv = await getInvoiceForUser(getParamId(req), userId)
    if (!inv) {
      res
        .status(404)
        .json({ error: t('invoice.notFound', undefined, { defaultValue: 'Invoice not found' }) })
      return
    }
    res.json(inv)
  })

  router.post('/', validateBody(invoiceCreateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    res
      .status(201)
      .json(
        await createInvoiceForUser(userId, req.body as Parameters<typeof createInvoiceForUser>[1]),
      )
  })

  router.put('/:id', validateBody(invoiceUpdateSchema), async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const inv = await updateInvoiceForUser(
      getParamId(req),
      userId,
      req.body as Parameters<typeof updateInvoiceForUser>[2],
    )
    if (!inv) {
      res
        .status(404)
        .json({ error: t('invoice.notFound', undefined, { defaultValue: 'Invoice not found' }) })
      return
    }
    res.json(inv)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    const ok = await deleteInvoiceForUser(getParamId(req), userId)
    if (!ok) {
      res
        .status(404)
        .json({ error: t('invoice.notFound', undefined, { defaultValue: 'Invoice not found' }) })
      return
    }
    res.status(204).end()
  })

  router.post(
    '/:id/payment',
    validateBody(recordPaymentSchema),
    async (req: Request, res: Response) => {
      const userId = requireUser(res)
      if (!userId) return
      const inv = await recordPayment(
        getParamId(req),
        userId,
        (req.body as { amount: number }).amount,
      )
      if (!inv) {
        res
          .status(404)
          .json({ error: t('invoice.notFound', undefined, { defaultValue: 'Invoice not found' }) })
        return
      }
      res.json(inv)
    },
  )

  return router
}
