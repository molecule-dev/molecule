/**
 * Express router factory for the firmware resource. Mount at any base
 * path (e.g. `/api/firmware`).
 *
 * The per-device status-report endpoint requires a caller-supplied
 * device-token authorizer middleware (since device-auth implementations
 * vary across deployments — token, mTLS, JWT, etc.).
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import type { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import {
  validateBody as validateBodyRaw,
  validateQuery as validateQueryRaw,
} from '@molecule/api-middleware-validation'

import {
  createFirmwareForOwner,
  createRolloutForOwner,
  getFirmwareForOwner,
  listFirmwareForOwner,
  listRolloutsForOwner,
  publishFirmwareForOwner,
  recordRolloutDeviceStatus,
  updateFirmwareForOwner,
} from './service.js'
import {
  createFirmwareSchema,
  createRolloutSchema,
  listFirmwareQuerySchema,
  listRolloutsQuerySchema,
  rolloutDeviceStatusSchema,
  updateFirmwareSchema,
} from './validation.js'

const validateBody = validateBodyRaw as unknown as (schema: unknown) => RequestHandler
const validateQuery = validateQueryRaw as unknown as (schema: unknown) => RequestHandler

/**
 * Caller-supplied device-token authorization. Should set
 * `res.locals.deviceAuth = { deviceId, ownerId }` on success or 401 on
 * failure.
 */
export type DeviceTokenMiddleware = RequestHandler

interface DeviceAuthLocals {
  deviceId: string
  ownerId: string
}

/** Responds with a 401 Unauthorized JSON error. */
function unauthorized(res: Response): Response {
  return res.status(401).json({
    error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
  })
}

/** Responds with a 404 Not Found JSON error for a missing firmware version. */
function firmwareNotFound(res: Response): Response {
  return res.status(404).json({
    error: t('firmware.notFound', undefined, { defaultValue: 'Firmware version not found.' }),
  })
}

/** Responds with a 500 Internal Server Error JSON error. */
function internalError(res: Response): Response {
  return res.status(500).json({
    error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
  })
}

/** Build the firmware router. */
export function createFirmwareRouter(opts: { requireDeviceToken: DeviceTokenMiddleware }): Router {
  const router = Router()

  router.get('/', validateQuery(listFirmwareQuerySchema), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      const q = req.query as unknown as z.infer<typeof listFirmwareQuerySchema>
      res.json(await listFirmwareForOwner(userId, q))
    } catch (error) {
      logger.error('listFirmwareForOwner failed', { error })
      internalError(res)
    }
  })

  router.get(
    '/rollouts/list',
    validateQuery(listRolloutsQuerySchema),
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(res)
        if (!userId) return unauthorized(res)
        const q = req.query as unknown as z.infer<typeof listRolloutsQuerySchema>
        res.json(await listRolloutsForOwner(userId, q))
      } catch (error) {
        logger.error('listRolloutsForOwner failed', { error })
        internalError(res)
      }
    },
  )

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      const row = await getFirmwareForOwner(userId, getParamId(req))
      if (!row) return firmwareNotFound(res)
      res.json(row)
    } catch (error) {
      logger.error('getFirmwareForOwner failed', { error })
      internalError(res)
    }
  })

  router.post('/', validateBody(createFirmwareSchema), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      const created = await createFirmwareForOwner(
        userId,
        req.body as z.infer<typeof createFirmwareSchema>,
      )
      if (!created) return internalError(res)
      res.status(201).json(created)
    } catch (error) {
      logger.error('createFirmwareForOwner failed', { error })
      internalError(res)
    }
  })

  router.put('/:id', validateBody(updateFirmwareSchema), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      const updated = await updateFirmwareForOwner(
        userId,
        getParamId(req),
        req.body as Record<string, unknown>,
      )
      if (!updated) return firmwareNotFound(res)
      res.json(updated)
    } catch (error) {
      logger.error('updateFirmwareForOwner failed', { error })
      internalError(res)
    }
  })

  router.post('/:id/publish', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      const published = await publishFirmwareForOwner(userId, getParamId(req))
      if (!published) return firmwareNotFound(res)
      res.json(published)
    } catch (error) {
      logger.error('publishFirmwareForOwner failed', { error })
      internalError(res)
    }
  })

  router.post(
    '/rollouts',
    validateBody(createRolloutSchema),
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(res)
        if (!userId) return unauthorized(res)
        const body = req.body as z.infer<typeof createRolloutSchema>
        const result = await createRolloutForOwner(userId, body)
        if (!result.ok) {
          if (result.reason === 'not_found') return firmwareNotFound(res)
          if (result.reason === 'not_published') {
            return res.status(400).json({
              error: t('firmware.notPublished', undefined, {
                defaultValue: 'Firmware must be published before rollout.',
              }),
            })
          }
          return res.status(400).json({
            error: t('firmware.rolloutTargetsRequired', undefined, {
              defaultValue: 'At least one owned device id or a fleet with members is required.',
            }),
          })
        }
        res.status(201).json(result.rollout)
      } catch (error) {
        logger.error('createRolloutForOwner failed', { error })
        internalError(res)
      }
    },
  )

  router.post(
    '/rollouts/:rolloutId/devices/:deviceId/status',
    opts.requireDeviceToken,
    validateBody(rolloutDeviceStatusSchema),
    async (req: Request, res: Response) => {
      try {
        const auth = res.locals.deviceAuth as DeviceAuthLocals | undefined
        if (!auth) {
          return res.status(401).json({
            error: t('devices.invalidToken', undefined, {
              defaultValue: 'Invalid device token.',
            }),
          })
        }
        const rolloutId = String(req.params.rolloutId ?? '')
        const deviceId = String(req.params.deviceId ?? '')
        if (deviceId !== auth.deviceId) {
          return res.status(403).json({
            error: t('devices.tokenMismatch', undefined, {
              defaultValue: 'Token does not match device.',
            }),
          })
        }
        const body = req.body as z.infer<typeof rolloutDeviceStatusSchema>
        const result = await recordRolloutDeviceStatus({
          rolloutId,
          deviceId,
          ownerId: auth.ownerId,
          status: body.status,
          errorMessage: body.error_message,
        })
        if (!result.ok) {
          return res.status(404).json({
            error: t('firmware.taskNotFound', undefined, {
              defaultValue: 'Firmware update task not found.',
            }),
          })
        }
        res.json({ ok: true })
      } catch (error) {
        logger.error('recordRolloutDeviceStatus failed', { error })
        internalError(res)
      }
    },
  )

  return router
}
