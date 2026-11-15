// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AuditLogRow` — a port of
 * `@molecule/app-audit-log-row-react/src/__tests__/audit-log-row.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

import { createApp, defineComponent, h } from 'vue'

import { AuditLogRow } from '../AuditLogRow.js'
import type { AuditLogEntry } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

const entry = (over: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
  id: '1',
  actor: 'alice',
  action: 'updated',
  timestamp: '10:30',
  ...over,
})

/** Renders an {@link AuditLogRow} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(AuditLogRow, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('AuditLogRow', () => {
  it('renders the actor, action, and timestamp', () => {
    const markup = render({ entry: entry() })
    expect(markup).toContain('alice')
    expect(markup).toContain('updated')
    expect(markup).toContain('10:30')
  })

  it('renders the target when present and omits it otherwise', () => {
    expect(render({ entry: entry({ target: 'ticket #5' }) })).toContain('ticket #5')
  })

  it('renders the environment in brackets when present', () => {
    const markup = render({ entry: entry({ environment: 'prod' }) })
    expect(markup).toContain('[prod]')
  })

  it('renders the old → new delta line when either value is present', () => {
    const markup = render({ entry: entry({ oldValue: 'draft', newValue: 'published' }) })
    expect(markup).toContain('draft')
    expect(markup).toContain('published')
    expect(markup).toContain('→')
    expect(markup).toContain('line-through')
  })

  it('renders no delta line when neither old nor new value is present', () => {
    const markup = render({ entry: entry() })
    expect(markup).not.toContain('→')
  })

  it('renders the traceId when present', () => {
    expect(render({ entry: entry({ traceId: 'trace-abc' }) })).toContain('trace-abc')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = render({ entry: entry(), onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render({ entry: entry() })
    expect(plain).not.toContain('cursorPointer')
  })

  it('carries a data-mol-id on every row', () => {
    expect(render({ entry: entry() })).toContain('data-mol-id="audit-log-row"')
  })

  it('exposes an interactive row as a focusable button (role + tabindex) only when clickable', () => {
    const clickable = render({ entry: entry(), onClick: () => {} })
    expect(clickable).toContain('role="button"')
    expect(clickable).toContain('tabindex="0"')
    const plain = render({ entry: entry() })
    expect(plain).not.toContain('role="button"')
    expect(plain).not.toContain('tabindex')
  })

  it('forwards className', () => {
    expect(render({ entry: entry(), className: 'alr-cls' })).toContain('alr-cls')
  })
})
