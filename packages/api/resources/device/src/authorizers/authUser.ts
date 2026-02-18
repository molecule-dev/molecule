import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequestHandler } from '@molecule/api-resource'

import type * as types from '../types.js'

/**
 * Middleware that verifies the device belongs to the authenticated user. Queries the database
 * for a device matching both the `:id` route parameter and `session.userId`. On success, stores
 * the device props in `res.locals.device` for downstream handlers and calls `next()`.
 * @param resource - The device resource configuration (tableName).
 * @param resource.tableName - The database table name for devices.
 * @returns An Express-compatible middleware function.
 */
export const authUser =
  ({ tableName }: { tableName: string }): MoleculeRequestHandler =>
  async (req, res, next) => {
    try {
      const { session } = res.locals
      const device = await findOne<types.Props>(tableName, [
        { field: 'id', operator: '=', value: req.params.id },
        { field: 'userId', operator: '=', value: session.userId },
      ])

      if (device) {
        res.locals.device = device
        return next()
      }
    } catch {
      /* no-op */
    }
    return next(t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }))
  }
