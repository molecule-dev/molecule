/**
 * Subscribe handler.
 *
 * POST /subscribers — creates a `pending` subscriber and returns one-time
 * confirm + unsubscribe tokens. The caller is responsible for delivering the
 * confirmation link to the subscriber via the appropriate channel.
 *
 * @module
 */

import { create as dbCreate, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CreateSubscriberInput, SubscriberRow } from '../types.js'
import {
  generateToken,
  isSubscriberChannel,
  isValidAddress,
  toPublicSubscriber,
} from '../utilities.js'

/**
 * Creates a new pending subscriber. Re-issuing a subscription against an
 * existing `(channel, address, topic)` triple is rejected with 409 — callers
 * should resend the confirmation link out-of-band rather than mint a new one.
 *
 * @param req - Request whose body matches {@link CreateSubscriberInput}.
 * @param res - Response. On success returns 201 with `{ subscriber, confirmToken, unsubscribeToken }`.
 */
export async function subscribe(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const input = (req.body ?? {}) as Partial<CreateSubscriberInput>

  if (!isSubscriberChannel(input.channel)) {
    res.status(400).json({
      error: t('subscriber.error.invalidChannel', undefined, {
        defaultValue: 'channel must be one of: email, sms, webhook',
      }),
      errorKey: 'subscriber.error.invalidChannel',
    })
    return
  }

  if (typeof input.address !== 'string' || !isValidAddress(input.channel, input.address)) {
    res.status(400).json({
      error: t('subscriber.error.invalidAddress', undefined, {
        defaultValue: 'address is not valid for the given channel',
      }),
      errorKey: 'subscriber.error.invalidAddress',
    })
    return
  }

  const topic = typeof input.topic === 'string' && input.topic.length > 0 ? input.topic : null

  try {
    const existing = await findOne<SubscriberRow>('subscribers', [
      { field: 'channel', operator: '=', value: input.channel },
      { field: 'address', operator: '=', value: input.address },
      topic === null
        ? { field: 'topic', operator: 'is_null' }
        : { field: 'topic', operator: '=', value: topic },
    ])

    if (existing) {
      res.status(409).json({
        error: t('subscriber.error.alreadyExists', undefined, {
          defaultValue: 'A subscription already exists for this channel/address/topic',
        }),
        errorKey: 'subscriber.error.alreadyExists',
      })
      return
    }

    const confirmToken = generateToken()
    const unsubscribeToken = generateToken()

    const result = await dbCreate<SubscriberRow>('subscribers', {
      channel: input.channel,
      address: input.address,
      topic,
      status: 'pending',
      confirmToken,
      unsubscribeToken,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      confirmedAt: null,
      unsubscribedAt: null,
    })

    if (!result.data) {
      throw new Error('subscriber row not returned from database')
    }

    logger.debug('Subscriber created', {
      subscriberId: result.data.id,
      channel: input.channel,
      topic,
    })

    res.status(201).json({
      subscriber: toPublicSubscriber(result.data),
      confirmToken,
      unsubscribeToken,
    })
  } catch (error) {
    logger.error('Failed to create subscriber', { error })
    res.status(500).json({
      error: t('subscriber.error.createFailed', undefined, {
        defaultValue: 'Failed to create subscriber',
      }),
      errorKey: 'subscriber.error.createFailed',
    })
  }
}
