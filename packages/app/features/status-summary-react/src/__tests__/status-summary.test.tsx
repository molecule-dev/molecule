import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
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
    expect(markup).toContain('#eab308')
  })

  it('honours an explicit overallStatus override', () => {
    const markup = html(createElement(StatusSummary, { groups, overallStatus: 'major-outage' }))
    expect(markup).toContain('Major outage')
    expect(markup).toContain('#ef4444')
  })

  it('renders a colored badge for each component status', () => {
    const markup = html(createElement(StatusSummary, { groups }))
    expect(markup).toContain('Operational')
    expect(markup).toContain('Degraded performance')
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
