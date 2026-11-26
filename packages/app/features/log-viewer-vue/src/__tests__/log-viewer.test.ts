// @vitest-environment jsdom
/**
 * Unit tests for the Vue `LogViewer` — a port of
 * `@molecule/app-log-viewer-react/src/__tests__/log-viewer.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the markup
 * the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* call was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
        // Expose the tone a tone helper was called with, so the severity
        // mapping is assertable (the proxy otherwise echoes only the name).
        if (prop === 'bgTone') return (tone: unknown) => `${token}-${String(tone)}`
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { LogViewer } from '../LogViewer.js'
import type { LogEntry, LogViewerProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Mounts a {@link LogViewer} and returns the markup it produced. */
const render = (props: LogViewerProps, slots?: Record<string, () => VNodeChild[]>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(LogViewer, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

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
    const markup = render(
      { entries: [] },
      { emptyState: () => [h('p', { 'data-empty': '' }, 'No logs')] },
    )
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('No logs')
  })

  it('exposes a log role and a <details> per entry', () => {
    const markup = render({ entries })
    expect(markup).toContain('role="log"')
    expect(markup.match(/<details/g) ?? []).toHaveLength(2)
  })

  it('renders the timestamp, level, and message in each summary', () => {
    const markup = render({ entries })
    expect(markup).toContain('10:00')
    expect(markup).toContain('info')
    expect(markup).toContain('started up')
    expect(markup).toContain('boom')
  })

  it('colors the level badge by severity', () => {
    const markup = render({ entries })
    expect(markup).toContain('bgTone-success') // info
    expect(markup).toContain('bgTone-error') // error
    expect(markup).toContain('textOnTone')
  })

  it('renders the service label and trace id when present', () => {
    const markup = render({ entries })
    expect(markup).toContain('auth-api')
    expect(markup).toContain('trace-xyz')
  })

  it('renders the structured data panel when an entry has data', () => {
    const markup = render({ entries })
    expect(markup).toContain('<pre')
    expect(markup).toContain('500')
  })

  it('forwards className onto the list wrapper', () => {
    const markup = render({ entries, className: 'lv-cls' })
    expect(markup).toContain('lv-cls')
  })
})
