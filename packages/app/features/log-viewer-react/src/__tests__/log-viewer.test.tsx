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

const { LogViewer } = await import('../LogViewer.js')
import type { LogEntry } from '../LogViewer.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const entries: LogEntry[] = [
  { id: '1', timestamp: '10:00', level: 'info', message: 'started up', service: 'auth-api' },
  {
    id: '2',
    timestamp: '10:01',
    level: 'error',
    message: 'boom',
    traceId: 'trace-xyz',
    data: { code: 500 },
  },
]

describe('LogViewer', () => {
  it('renders the emptyState when there are no entries', () => {
    const markup = html(
      createElement(LogViewer, {
        entries: [],
        emptyState: createElement('p', { 'data-empty': '' }, 'No logs'),
      }),
    )
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('No logs')
  })

  it('exposes a log role and a <details> per entry', () => {
    const markup = html(createElement(LogViewer, { entries }))
    expect(markup).toContain('role="log"')
    expect(markup.match(/<details/g) ?? []).toHaveLength(2)
  })

  it('renders the timestamp, level, and message in each summary', () => {
    const markup = html(createElement(LogViewer, { entries }))
    expect(markup).toContain('10:00')
    expect(markup).toContain('info')
    expect(markup).toContain('started up')
    expect(markup).toContain('boom')
  })

  it('colors the level badge by severity', () => {
    const markup = html(createElement(LogViewer, { entries }))
    expect(markup).toContain('#22c55e') // info
    expect(markup).toContain('#ef4444') // error
  })

  it('renders the service label and trace id when present', () => {
    const markup = html(createElement(LogViewer, { entries }))
    expect(markup).toContain('auth-api')
    expect(markup).toContain('trace-xyz')
  })

  it('renders the structured data panel when an entry has data', () => {
    const markup = html(createElement(LogViewer, { entries }))
    expect(markup).toContain('<pre')
    expect(markup).toContain('500')
  })

  it('forwards className onto the list wrapper', () => {
    const markup = html(createElement(LogViewer, { entries, className: 'lv-cls' }))
    expect(markup).toContain('lv-cls')
  })
})
