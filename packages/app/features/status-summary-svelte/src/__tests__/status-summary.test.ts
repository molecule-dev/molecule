// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `StatusSummary` — a port of
 * `@molecule/app-status-summary-react/src/__tests__/status-summary.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom) and the
 * bonded ClassMap / i18n providers. Status colours are ClassMap classes
 * (`bg-warning`, …), asserted through the class attribute.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, type I18nProvider } from '@molecule/app-i18n'
import type { MoleculeConfig } from '@molecule/app-svelte'

import StatusSummary from '../StatusSummary.svelte'
import type { StatusGroup, StatusSummaryProps } from '../types.js'
import Host from './Host.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

interface Mounted {
  instance: ReturnType<typeof mount>
  markup: string
}

/**
 * An i18n provider whose `t` returns a marker (`[key] English`): a test gives
 * it to the context to prove the component translates through the literal key
 * it names, so a locale bond can resolve every value.
 */
const markerI18n: I18nProvider = {
  ...createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ]),
  t: (key, _values, options) => `[${key}] ${options?.defaultValue ?? ''}`,
}

/**
 * Mounts `StatusSummary` with the given props and slot markup.
 *
 * @param props - The summary props.
 * @param slots - Markup for the header/footer slots.
 * @param config - Extra Molecule context (e.g. a test's own i18n provider).
 * @returns The mounted instance and the rendered markup.
 */
async function render(
  props: StatusSummaryProps,
  slots: { header?: string; footer?: string } = {},
  config: MoleculeConfig = {},
): Promise<Mounted> {
  const targetProps: StatusSummaryProps = { ...props }
  if (slots.header !== undefined) targetProps.header = raw(slots.header)
  if (slots.footer !== undefined) targetProps.footer = raw(slots.footer)
  const instance = mount(Host<StatusSummaryProps>, {
    target: document.body,
    props: {
      config,
      component: StatusSummary,
      props: targetProps,
    },
  })
  flushSync()
  return { instance, markup: document.body.innerHTML }
}

const groups: StatusGroup[] = [
  {
    id: 'api',
    name: 'API',
    components: [
      { id: 'rest', name: 'REST API', status: 'operational' },
      { id: 'gql', name: 'GraphQL', status: 'degraded' },
    ],
  },
]

afterEach(async () => {
  document.body.innerHTML = ''
})

describe('StatusSummary', () => {
  it('renders the group and component names', async () => {
    const { instance, markup } = await render({ groups })
    expect(markup).toContain('API')
    expect(markup).toContain('REST API')
    expect(markup).toContain('GraphQL')
    await unmount(instance)
  })

  it('derives the overall banner from the worst child status', async () => {
    const { instance, markup } = await render({ groups })
    // worst of operational + degraded => degraded
    expect(markup).toContain('Degraded performance')
    expect(markup).toContain('bg-warning')
    expect(markup).toContain('text-foreground-inverse')
    await unmount(instance)
  })

  it('honours an explicit overallStatus override', async () => {
    const { instance, markup } = await render({ groups, overallStatus: 'major-outage' })
    expect(markup).toContain('Major outage')
    expect(markup).toContain('bg-error')
    await unmount(instance)
  })

  it('renders a colored badge for each component status', async () => {
    const { instance, markup } = await render({ groups })
    expect(markup).toContain('Operational')
    expect(markup).toContain('Degraded performance')
    await unmount(instance)
  })

  it('translates every status through its literal i18n key', async () => {
    const everyStatus: StatusGroup[] = [
      {
        id: 'all',
        name: 'Everything',
        components: [
          { id: 'a', name: 'Alpha', status: 'operational' },
          { id: 'b', name: 'Beta', status: 'degraded' },
          { id: 'c', name: 'Gamma', status: 'partial-outage' },
          { id: 'd', name: 'Delta', status: 'major-outage' },
          { id: 'e', name: 'Epsilon', status: 'maintenance' },
        ],
      },
    ]
    const { instance, markup } = await render({ groups: everyStatus }, {}, { i18n: markerI18n })
    expect(markup).toContain('[status.operational] Operational')
    expect(markup).toContain('[status.degraded] Degraded performance')
    expect(markup).toContain('[status.partial-outage] Partial outage')
    expect(markup).toContain('[status.major-outage] Major outage')
    expect(markup).toContain('[status.maintenance] Under maintenance')
    await unmount(instance)
  })

  it('renders the header and footer slots', async () => {
    const { instance, markup } = await render(
      { groups },
      { header: '<span data-header></span>', footer: '<div data-footer></div>' },
    )
    expect(markup).toContain('data-header=""')
    expect(markup).toContain('data-footer=""')
    await unmount(instance)
  })

  it('forwards className', async () => {
    const { instance, markup } = await render({ groups, className: 'sts-cls' })
    expect(markup).toContain('sts-cls')
    await unmount(instance)
  })
})
