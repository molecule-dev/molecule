// @vitest-environment jsdom
/**
 * Unit tests for the Solid `LogViewer` — a port of
 * `@molecule/app-log-viewer-react/src/__tests__/log-viewer.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* call was applied without a real
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
        // Expose the tone a tone helper was called with, so the severity
        // mapping is assertable (the proxy otherwise echoes only the name).
        if (prop === 'bgTone') return (tone: unknown) => `${token}-${String(tone)}`
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { LogViewer } = await import('../LogViewer.jsx')
import type { LogEntry } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
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
    const element = mount(() => (
      <LogViewer entries={[]} emptyState={<p data-empty="">No logs</p>} />
    ))
    expect(element.innerHTML).toContain('data-empty=""')
    expect(element.innerHTML).toContain('No logs')
  })

  it('exposes a log role and a <details> per entry', () => {
    const element = mount(() => <LogViewer entries={entries} />)
    expect(element.innerHTML).toContain('role="log"')
    expect(element.innerHTML.match(/<details/g) ?? []).toHaveLength(2)
  })

  it('renders the timestamp, level, and message in each summary', () => {
    const element = mount(() => <LogViewer entries={entries} />)
    expect(element.innerHTML).toContain('10:00')
    expect(element.innerHTML).toContain('info')
    expect(element.innerHTML).toContain('started up')
    expect(element.innerHTML).toContain('boom')
  })

  it('colors the level badge by severity', () => {
    const element = mount(() => <LogViewer entries={entries} />)
    expect(element.innerHTML).toContain('bgTone-success') // info
    expect(element.innerHTML).toContain('bgTone-error') // error
    expect(element.innerHTML).toContain('textOnTone')
  })

  it('renders the service label and trace id when present', () => {
    const element = mount(() => <LogViewer entries={entries} />)
    expect(element.innerHTML).toContain('auth-api')
    expect(element.innerHTML).toContain('trace-xyz')
  })

  it('renders the structured data panel when an entry has data', () => {
    const element = mount(() => <LogViewer entries={entries} />)
    expect(element.innerHTML).toContain('<pre')
    expect(element.innerHTML).toContain('500')
  })

  it('forwards className onto the list wrapper', () => {
    const element = mount(() => <LogViewer entries={entries} className="lv-cls" />)
    expect(element.innerHTML).toContain('lv-cls')
  })
})
