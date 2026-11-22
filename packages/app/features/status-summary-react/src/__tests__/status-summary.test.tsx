import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

afterEach(() => {
  tOverride = undefined
})

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values: unknown, opts?: { defaultValue?: string }) =>
      tOverride ? tOverride(key, values, opts) : (opts?.defaultValue ?? key),
  }),
}))

const { StatusSummary } = await import('../StatusSummary.js')
import type { StatusGroup } from '../StatusSummary.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

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
    const markup = html(createElement(StatusSummary, { groups }))
    expect(markup).toContain('API')
    expect(markup).toContain('REST API')
    expect(markup).toContain('GraphQL')
  })

  it('derives the overall banner from the worst child status', () => {
    const markup = html(createElement(StatusSummary, { groups }))
    // worst of operational + degraded => degraded
    expect(markup).toContain('Degraded performance')
    expect(markup).toContain('bgTone-warning')
    expect(markup).toContain('textOnTone')
  })

  it('honours an explicit overallStatus override', () => {
    const markup = html(createElement(StatusSummary, { groups, overallStatus: 'major-outage' }))
    expect(markup).toContain('Major outage')
    expect(markup).toContain('bgTone-error')
  })

  it('renders a colored badge for each component status', () => {
    const markup = html(createElement(StatusSummary, { groups }))
    expect(markup).toContain('Operational')
    expect(markup).toContain('Degraded performance')
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
    const markup = html(createElement(StatusSummary, { groups: everyStatus }))
    expect(markup).toContain('[status.operational] Operational')
    expect(markup).toContain('[status.degraded] Degraded performance')
    expect(markup).toContain('[status.partial-outage] Partial outage')
    expect(markup).toContain('[status.major-outage] Major outage')
    expect(markup).toContain('[status.maintenance] Under maintenance')
  })

  it('renders the header and footer slots', () => {
    const markup = html(
      createElement(StatusSummary, {
        groups,
        header: createElement('span', { 'data-header': '' }),
        footer: createElement('div', { 'data-footer': '' }),
      }),
    )
    expect(markup).toContain('data-header=""')
    expect(markup).toContain('data-footer=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(StatusSummary, { groups, className: 'sts-cls' }))
    expect(markup).toContain('sts-cls')
  })
})
