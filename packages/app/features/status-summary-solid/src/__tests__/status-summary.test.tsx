// @vitest-environment jsdom
/**
 * Unit tests for the Solid `StatusSummary` — a port of
 * `@molecule/app-status-summary-react/src/__tests__/status-summary.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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
        // Tone resolvers echo their argument, so assertions can tell which
        // semantic tone (`bgTone-warning`) the summary picked.
        return (...args: unknown[]) => (args.length > 0 ? `${token}-${String(args[0])}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

/** When set, `t` delegates here — the marker test swaps it in per test. */
let tOverride:
  ((key: string, values: unknown, opts?: { defaultValue?: string }) => string) | undefined

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values: unknown, opts?: { defaultValue?: string }) =>
      tOverride ? tOverride(key, values, opts) : (opts?.defaultValue ?? key),
  }),
}))

const { StatusSummary } = await import('../StatusSummary.jsx')
import type { StatusGroup } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  tOverride = undefined
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
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
    const container = mount(() => <StatusSummary groups={groups} />)
    expect(container.innerHTML).toContain('API')
    expect(container.innerHTML).toContain('REST API')
    expect(container.innerHTML).toContain('GraphQL')
  })

  it('derives the overall banner from the worst child status', () => {
    const container = mount(() => <StatusSummary groups={groups} />)
    // worst of operational + degraded => degraded
    expect(container.innerHTML).toContain('Degraded performance')
    expect(container.innerHTML).toContain('bgTone-warning')
    expect(container.innerHTML).toContain('textOnTone')
  })

  it('honours an explicit overallStatus override', () => {
    const container = mount(() => <StatusSummary groups={groups} overallStatus="major-outage" />)
    expect(container.innerHTML).toContain('Major outage')
    expect(container.innerHTML).toContain('bgTone-error')
  })

  it('renders a colored badge for each component status', () => {
    const container = mount(() => <StatusSummary groups={groups} />)
    expect(container.innerHTML).toContain('Operational')
    expect(container.innerHTML).toContain('Degraded performance')
  })

  it('translates every status through its literal i18n key', () => {
    // A provider whose `t` returns a marker: the key must be the literal the
    // component names, so a locale bond can resolve every status.
    tOverride = (key, _values, opts) => `[${key}] ${opts?.defaultValue ?? ''}`
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
    const container = mount(() => <StatusSummary groups={everyStatus} />)
    expect(container.innerHTML).toContain('[status.operational] Operational')
    expect(container.innerHTML).toContain('[status.degraded] Degraded performance')
    expect(container.innerHTML).toContain('[status.partial-outage] Partial outage')
    expect(container.innerHTML).toContain('[status.major-outage] Major outage')
    expect(container.innerHTML).toContain('[status.maintenance] Under maintenance')
  })

  it('renders the header and footer slots', () => {
    const container = mount(() => (
      <StatusSummary
        groups={groups}
        header={<span data-header="" />}
        footer={<div data-footer="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-header=""')
    expect(container.innerHTML).toContain('data-footer=""')
  })

  it('forwards className', () => {
    const container = mount(() => <StatusSummary groups={groups} className="sts-cls" />)
    expect(container.innerHTML).toContain('sts-cls')
  })
})
