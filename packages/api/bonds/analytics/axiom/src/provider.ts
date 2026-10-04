/**
 * The Axiom analytics provider: each `track` / `identify` / `page` / `group`
 * call becomes one event in the configured Axiom dataset.
 *
 * @module
 */

import type { AnalyticsEvent, AnalyticsPageView, AnalyticsUserProps } from '@molecule/api-analytics'

import { createAxiomIngester } from './ingester.js'
import type { AxiomAnalyticsOptions, AxiomAnalyticsProvider, AxiomIngester } from './types.js'

const definedOnly = (fields: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== ''))

/**
 * Creates an Axiom analytics provider.
 *
 * @param options - Ingest settings and stamped identity fields; unset ingest fields fall back to `AXIOM_*` env vars.
 * @returns The provider. Disabled (a silent no-op) without a token and dataset.
 */
export function createProvider(options: AxiomAnalyticsOptions = {}): AxiomAnalyticsProvider {
  const stamp = definedOnly({
    service: options.service,
    env: options.env ?? process.env.NODE_ENV,
    region: options.region,
    version: options.version,
    ...options.stamp,
  })
  const ingester: AxiomIngester = createAxiomIngester({ ...options, stamp })

  const emit = (kind: string, fields: Record<string, unknown>, at?: Date): void => {
    ingester.ingest(
      definedOnly({
        _time: (at ?? new Date()).toISOString(),
        kind,
        ...fields,
      }),
    )
  }

  return {
    enabled: ingester.enabled,
    dataset: ingester.dataset,
    async identify(user: AnalyticsUserProps): Promise<void> {
      emit('identify', {
        event: 'user.identified',
        userId: user.userId,
        properties: definedOnly({ ...user.traits, email: user.email, name: user.name }),
      })
    },
    async track(event: AnalyticsEvent): Promise<void> {
      emit(
        'track',
        {
          event: event.name,
          userId: event.userId,
          anonymousId: event.anonymousId,
          properties: event.properties,
        },
        event.timestamp,
      )
    },
    async page(pageView: AnalyticsPageView): Promise<void> {
      emit('page', {
        event: 'page.view',
        userId: pageView.userId,
        anonymousId: pageView.anonymousId,
        properties: definedOnly({
          ...pageView.properties,
          name: pageView.name,
          category: pageView.category,
          url: pageView.url,
          path: pageView.path,
          referrer: pageView.referrer,
        }),
      })
    },
    async group(groupId: string, traits?: Record<string, unknown>): Promise<void> {
      emit('group', { event: 'group', groupId, properties: traits })
    },
    flush: () => ingester.flush(),
    shutdown: () => ingester.shutdown(),
    stats: () => ingester.stats(),
  }
}

let defaultProvider: AxiomAnalyticsProvider | null = null
const getDefault = (): AxiomAnalyticsProvider => (defaultProvider ??= createProvider())

/**
 * The default provider, configured from `AXIOM_TOKEN` / `AXIOM_DATASET` /
 * `AXIOM_ORG_ID` / `AXIOM_EDGE_URL`. Created on first use, so env loaded after
 * import still applies. Disabled (a silent no-op) without a token and dataset.
 */
export const provider: AxiomAnalyticsProvider = {
  get enabled(): boolean {
    return getDefault().enabled
  },
  get dataset(): string | null {
    return getDefault().dataset
  },
  identify: (user) => getDefault().identify(user),
  track: (event) => getDefault().track(event),
  page: (pageView) => getDefault().page(pageView),
  group: (groupId, traits) => getDefault().group(groupId, traits),
  flush: () => getDefault().flush(),
  shutdown: () => getDefault().shutdown(),
  stats: () => getDefault().stats(),
}
