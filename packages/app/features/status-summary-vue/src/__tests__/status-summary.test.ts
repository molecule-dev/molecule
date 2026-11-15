// @vitest-environment jsdom
/**
 * Unit tests for the Vue `StatusSummary` — a port of
 * `@molecule/app-status-summary-react/src/__tests__/status-summary.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces. Inline colors are set through the CSSOM,
 * so jsdom serializes them as `rgb(...)` (the same values React's runtime
 * mount produces).
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { StatusSummary } from '../StatusSummary.js'
import type { StatusGroup } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link StatusSummary} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(StatusSummary, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
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

describe('StatusSummary', () => {
  it('renders the group and component names', () => {
    const markup = render({ groups })
    expect(markup).toContain('API')
    expect(markup).toContain('REST API')
    expect(markup).toContain('GraphQL')
  })

  it('derives the overall banner from the worst child status', () => {
    const markup = render({ groups })
    // worst of operational + degraded => degraded
    expect(markup).toContain('Degraded performance')
    expect(markup).toContain('rgb(234, 179, 8)')
  })

  it('honours an explicit overallStatus override', () => {
    const markup = render({ groups, overallStatus: 'major-outage' })
    expect(markup).toContain('Major outage')
    expect(markup).toContain('rgb(239, 68, 68)')
  })

  it('renders a colored badge for each component status', () => {
    const markup = render({ groups })
    expect(markup).toContain('Operational')
    expect(markup).toContain('Degraded performance')
  })

  it('renders the header and footer slots', () => {
    const markup = render(
      { groups },
      {
        header: () => [h('span', { 'data-header': '' })],
        footer: () => [h('div', { 'data-footer': '' })],
      },
    )
    expect(markup).toContain('data-header=""')
    expect(markup).toContain('data-footer=""')
  })

  it('forwards className', () => {
    const markup = render({ groups, className: 'sts-cls' })
    expect(markup).toContain('sts-cls')
  })
})
