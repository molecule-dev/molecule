/**
 * Delete subscriber handler.
 *
 * DELETE /subscribers/:id — hard-deletes a subscriber record. Note that
 * end-user opt-out should go through `unsubscribe`, which preserves the row
 * for audit; this handler is for admin cleanup only.
 *
 * Admin-only is enforced here, not merely documented: it rejects non-admin
 * callers (401 when unauthenticated, 403 otherwise) before deleting anything —
 * defense-in-depth that does not depend on the `requireAdmin` route middleware
 * being wired.
 *
 * @module
 */

import { deleteById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isSubscriberAdmin } from '../authorizers/index.js'

/**
 * Hard-deletes a subscriber by id.
 *
 * @param req - Request with `:id` path parameter.
 * @param res - Response. Returns 204 on success or 404 if no row matched.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }
  if (!(await isSubscriberAdmin(res))) {
    res.status(403).json({
      error: t('subscriber.error.forbidden', undefined, {
        defaultValue: 'Admin access required to manage subscribers',
      }),
      errorKey: 'subscriber.error.forbidden',
    })
    return
  }

  const id = req.params.id
  if (!id) {
    res.status(400).json({
      error: t('subscriber.error.idRequired', undefined, {
        defaultValue: 'Subscriber id is required',
      }),
      errorKey: 'subscriber.error.idRequired',
    })
    return
  }

  try {
    const result = await deleteById('subscribers', id)
    if (!result.affected || result.affected === 0) {
      res.status(404).json({
        error: t('subscriber.error.notFound', undefined, {
          defaultValue: 'Subscriber not found',
        }),
        errorKey: 'subscriber.error.notFound',
      })
      return
    }

    logger.debug('Subscriber deleted', { subscriberId: id })
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete subscriber', { error, id })
    res.status(500).json({
      error: t('subscriber.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete subscriber',
      }),
      errorKey: 'subscriber.error.deleteFailed',
    })
  }
}
