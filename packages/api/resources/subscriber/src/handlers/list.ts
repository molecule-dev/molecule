/**
 * List subscribers handler.
 *
 * GET /subscribers — paginated listing of subscribers, optionally filtered by
 * channel, status, or topic. Tokens are stripped from the response.
 *
 * Admin-only: exposes subscriber PII, so it rejects non-admin callers (401 when
 * unauthenticated, 403 otherwise) before reading any data — defense-in-depth that
 * does not depend on the `requireAdmin` route middleware being wired.
 *
 * @module
 */

import type { WhereCondition } from '@molecule/api-database'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isSubscriberAdmin } from '../authorizers/index.js'
import type { PaginatedResult, PublicSubscriber, SubscriberRow } from '../types.js'
import { isSubscriberChannel, isSubscriberStatus, toPublicSubscriber } from '../utilities.js'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * Lists subscribers with optional filtering and pagination.
 *
 * @param req - Request with optional `channel`, `status`, `topic`, `page`, and `limit` query params.
 * @param res - Response. On success returns a {@link PaginatedResult} of {@link PublicSubscriber}.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const channel = req.query.channel as string | undefined
  const status = req.query.status as string | undefined
  const topic = req.query.topic as string | undefined
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT))

  const where: WhereCondition[] = []
  if (channel !== undefined) {
    if (!isSubscriberChannel(channel)) {
      res.status(400).json({
        error: t('subscriber.error.invalidChannel', undefined, {
          defaultValue: 'channel must be one of: email, sms, webhook',
        }),
        errorKey: 'subscriber.error.invalidChannel',
      })
      return
    }
    where.push({ field: 'channel', operator: '=', value: channel })
  }
  if (status !== undefined) {
    if (!isSubscriberStatus(status)) {
      res.status(400).json({
        error: t('subscriber.error.invalidStatus', undefined, {
          defaultValue: 'status must be one of: pending, confirmed, unsubscribed',
        }),
        errorKey: 'subscriber.error.invalidStatus',
      })
      return
    }
    where.push({ field: 'status', operator: '=', value: status })
  }
  if (topic !== undefined && topic.length > 0) {
    where.push({ field: 'topic', operator: '=', value: topic })
  }

  try {
    const total = await count('subscribers', where)
    const rows = await findMany<SubscriberRow>('subscribers', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })

    const result: PaginatedResult<PublicSubscriber> = {
      data: rows.map(toPublicSubscriber),
      total,
      page,
      limit,
    }

    res.status(200).json(result)
  } catch (error) {
    logger.error('Failed to list subscribers', { error })
    res.status(500).json({
      error: t('subscriber.error.listFailed', undefined, {
        defaultValue: 'Failed to list subscribers',
      }),
      errorKey: 'subscriber.error.listFailed',
    })
  }
}
