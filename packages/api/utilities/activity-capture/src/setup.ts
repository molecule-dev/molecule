/**
 * `setupActivityCapture()`: route the bonded email, SMS, push, webhook and channel providers
 * through their capture providers when molecule.dev runs the app.
 *
 * @module
 */

import { bond, get } from '@molecule/api-bond'
import { logger } from '@molecule/api-logger'

/**
 * Each capturable bond category, the package that records its calls, and that package's factory
 * that wraps a real provider (tee mode). Only categories the app has bonded are touched.
 */
const CAPTURE_PROVIDERS: ReadonlyArray<readonly [string, string, string]> = [
  ['email', '@molecule/api-emails-capture', 'createEmailCaptureProvider'],
  ['sms', '@molecule/api-sms-capture', 'createSMSCaptureProvider'],
  ['push-notifications', '@molecule/api-push-capture', 'createPushCaptureProvider'],
  ['webhook', '@molecule/api-webhook-capture', 'createWebhookCaptureProvider'],
  ['channel', '@molecule/api-channel-capture', 'createChannelCaptureProvider'],
]

/**
 * Record what the app sends in the molecule.dev Activity panel.
 *
 * Call it last in `setupBonds()`, after every provider is bonded. It does nothing unless
 * `MOLECULE_ACTIVITY_URL` is set, which molecule.dev does for the apps it runs. Then it bonds the
 * HTTP activity sink and, for each capturable category the app has bonded:
 *
 * - with `MOLECULE_ACTIVITY_MODE=tee` (a production deploy), wraps the real provider: the send is
 *   delivered and recorded with its outcome;
 * - otherwise (the dev sandbox), replaces it: the send is recorded and not delivered.
 *
 * A category whose capture package cannot be loaded, or (in tee mode) has no wrapping factory,
 * keeps its real provider: delivering always wins over recording.
 *
 * @returns Once every bonded category is routed.
 */
export async function setupActivityCapture(): Promise<void> {
  if (!process.env.MOLECULE_ACTIVITY_URL) return

  const tee = process.env.MOLECULE_ACTIVITY_MODE === 'tee'

  const [{ setSink }, { createHttpSink }] = await Promise.all([
    import('@molecule/api-activity'),
    import('@molecule/api-activity-http'),
  ])
  // The sink reads the URL, token and app id per request.
  setSink(createHttpSink())

  for (const [category, providerPackage, factoryName] of CAPTURE_PROVIDERS) {
    const realProvider = get(category)
    if (realProvider == null) continue
    let captureModule: Record<string, unknown>
    try {
      captureModule = (await import(providerPackage)) as Record<string, unknown>
    } catch (error) {
      logger.warn('activity-capture: a capture package could not be loaded; not capturing it', {
        package: providerPackage,
        category,
        error,
      })
      continue
    }
    if (tee) {
      const wrap = captureModule[factoryName]
      if (typeof wrap !== 'function') {
        logger.warn(
          'activity-capture: the capture package cannot wrap a provider; delivering unrecorded',
          {
            package: providerPackage,
            factory: factoryName,
            category,
          },
        )
        continue
      }
      bond(category, (wrap as (real: unknown) => unknown)(realProvider))
      continue
    }
    const { provider } = captureModule
    if (provider == null) {
      logger.warn('activity-capture: the capture package exports no provider; not capturing it', {
        package: providerPackage,
        category,
      })
      continue
    }
    bond(category, provider)
  }
}
