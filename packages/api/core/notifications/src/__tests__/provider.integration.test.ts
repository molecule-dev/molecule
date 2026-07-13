/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual
 * `@molecule/api-bond` registry and `@molecule/api-i18n` fallback path.
 *
 * The unit suite (`provider.test.ts`) mocks `@molecule/api-bond`, and its
 * hand-written `isBonded` mock checked the NAMED map — the real `isBonded`
 * checks the SINGLETON map, so the real `hasProvider()` returned `false`
 * forever for channels registered with `setProvider(name, provider)`. The
 * mock's flattering behavior hid that for every release. This file pins the
 * contract against the real registry.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { unbond } from '@molecule/api-bond'

import { getAllProviders, getProvider, hasProvider, notifyAll, setProvider } from '../provider.js'
import type { Notification, NotificationsProvider } from '../types.js'

/** A REAL channel provider recording what it was asked to send. */
function makeChannel(
  name: string,
  behavior: 'ok' | 'reject' | 'throw' = 'ok',
): NotificationsProvider & { sent: Notification[] } {
  const sent: Notification[] = []
  return {
    name,
    sent,
    async send(notification: Notification) {
      sent.push(notification)
      if (behavior === 'throw') throw new Error(`${name} transport exploded`)
      if (behavior === 'reject') return { success: false, error: `${name} returned HTTP 500` }
      return { success: true }
    },
  }
}

const notification: Notification = {
  subject: 'Service Down',
  body: 'API is not responding',
  metadata: { severity: 'high' },
}

describe('@molecule/api-notifications × REAL @molecule/api-bond', () => {
  it('CONSUMER PROPERTY: hasProvider() sees channels registered via setProvider (named bonds)', () => {
    // Channels bond as NAMED providers; the singleton-map check the old code
    // used can never see them. Guard code like `if (hasProvider()) notifyAll(…)`
    // silently skipped every notification.
    unbond('notifications', 'webhook')
    unbond('notifications', 'slack')
    expect(hasProvider()).toBe(false)

    setProvider('webhook', makeChannel('webhook'))
    expect(hasProvider()).toBe(true)

    expect(getProvider('webhook')).not.toBeNull()
    expect(getProvider('does-not-exist')).toBeNull()
  })

  it('full lifecycle: notifyAll fans out through the real registry to every channel', async () => {
    const webhook = makeChannel('webhook')
    const slack = makeChannel('slack')
    setProvider('webhook', webhook)
    setProvider('slack', slack)

    expect(getAllProviders().size).toBe(2)

    const results = await notifyAll(notification)

    expect(results).toHaveLength(2)
    expect(results.every((r) => r.success)).toBe(true)
    expect(results.map((r) => r.channel).sort()).toEqual(['slack', 'webhook'])
    for (const r of results) {
      expect(Number.isNaN(Date.parse(r.sentAt!))).toBe(false)
    }
    expect(webhook.sent).toEqual([notification])
    expect(slack.sent).toEqual([notification])
  })

  it('FAILURE DISAMBIGUATION: a rejecting channel and a throwing channel each surface per-channel, others still deliver', async () => {
    const webhook = makeChannel('webhook')
    const slack = makeChannel('slack', 'reject')
    const pager = makeChannel('pager', 'throw')
    setProvider('webhook', webhook)
    setProvider('slack', slack)
    setProvider('pager', pager)

    const results = await notifyAll(notification)
    expect(results).toHaveLength(3)

    const byChannel = new Map(results.map((r) => [r.channel, r]))
    // Success is still success.
    expect(byChannel.get('webhook')).toMatchObject({ success: true })
    // A provider-reported failure keeps ITS error message and channel.
    expect(byChannel.get('slack')).toMatchObject({
      success: false,
      error: 'slack returned HTTP 500',
    })
    // A thrown transport error is caught, labeled with its channel, and does
    // not prevent the remaining channels from being tried.
    expect(byChannel.get('pager')).toMatchObject({
      success: false,
      error: 'pager transport exploded',
    })
    expect(webhook.sent).toHaveLength(1)

    unbond('notifications', 'pager')
  })

  it('returns [] (and does not throw) when no channels are bonded', async () => {
    unbond('notifications', 'webhook')
    unbond('notifications', 'slack')
    expect(hasProvider()).toBe(false)
    await expect(notifyAll(notification)).resolves.toEqual([])
  })
})
