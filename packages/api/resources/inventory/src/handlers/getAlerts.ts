/**
 * Handler for retrieving low-stock alerts.
 *
 * @module
 */

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { StockRow } from '../types.js'
import { toLowStockAlert } from '../utilities.js'

/**
 * Returns all products whose available stock is at or below their low-stock threshold.
 * Accepts an optional `threshold` query parameter to override the per-product threshold.
 * @param req - The request with optional `threshold` query parameter.
 * @param res - The response object.
 */
export async function getAlerts(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  try {
    const customThreshold = req.query.threshold ? Number(req.query.threshold) : undefined

    // Fetch all stock records — filtering by computed field (available = total - reserved)
    // must be done in application code since the DataStore abstraction doesn't support
    // computed-column filters.
    const rows = await findMany<StockRow>('inventory_stock')

    const alerts = rows
      .filter((row) => {
        const available = row.total - row.reserved
        const threshold = customThreshold ?? row.lowStockThreshold
        return available <= threshold
      })
      .map(toLowStockAlert)

    res.json(alerts)
  } catch (error) {
    logger.error('Failed to get low stock alerts', { error })
    res.status(500).json({
      error: t('inventory.error.alertsFailed', undefined, {
        defaultValue: 'Failed to get low stock alerts',
      }),
      errorKey: 'inventory.error.alertsFailed',
    })
  }
}
