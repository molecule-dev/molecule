// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `StatusSummary` — a port of
 * `@molecule/app-status-summary-react/src/__tests__/status-summary.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom) and the
 * bonded ClassMap / i18n providers. The inline colors are applied through the
 * style attribute, which jsdom re-serializes as `rgb(...)`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import StatusSummary from '../StatusSummary.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

interface Mounted {
  instance: ReturnType<typeof mount>
  markup: string
}

/**
 * Mounts `StatusSummary` with the given props and slot markup.
 *
 * @param props - The summary props.
 * @param slots - Markup for the header/footer slots.
 * @returns The mounted instance and the rendered markup.
 */
async function render(
  props: Record<string, unknown> = {},
  slots: { header?: string; footer?: string } = {},
): Promise<Mounted> {
  const targetProps: Record<string, unknown> = { ...props }
  if (slots.header !== undefined) targetProps.header = raw(slots.header)
  if (slots.footer !== undefined) targetProps.footer = raw(slots.footer)
  const instance = mount(Host, {
    target: document.body,
    props: {
      config: {},
      setMoleculeContext,
      component: StatusSummary,
      props: targetProps,
    },
  })
  flushSync()
  return { instance, markup: document.body.innerHTML }
}

const groups = [
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
    expect(markup).toContain('rgb(234, 179, 8)')
    await unmount(instance)
  })

  it('honours an explicit overallStatus override', async () => {
    const { instance, markup } = await render({ groups, overallStatus: 'major-outage' })
    expect(markup).toContain('Major outage')
    expect(markup).toContain('rgb(239, 68, 68)')
    await unmount(instance)
  })

  it('renders a colored badge for each component status', async () => {
    const { instance, markup } = await render({ groups })
    expect(markup).toContain('Operational')
    expect(markup).toContain('Degraded performance')
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
