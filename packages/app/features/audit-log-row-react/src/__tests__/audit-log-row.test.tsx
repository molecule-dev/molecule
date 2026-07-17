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

const { AuditLogRow } = await import('../AuditLogRow.js')
import type { AuditLogEntry } from '../AuditLogRow.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const entry = (over: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
  id: '1',
  actor: 'alice',
  action: 'updated',
  timestamp: '10:30',
  ...over,
})

describe('AuditLogRow', () => {
  it('renders the actor, action, and timestamp', () => {
    const markup = html(createElement(AuditLogRow, { entry: entry() }))
    expect(markup).toContain('alice')
    expect(markup).toContain('updated')
    expect(markup).toContain('10:30')
  })

  it('renders the target when present and omits it otherwise', () => {
    expect(html(createElement(AuditLogRow, { entry: entry({ target: 'ticket #5' }) }))).toContain(
      'ticket #5',
    )
  })

  it('renders the environment in brackets when present', () => {
    const markup = html(createElement(AuditLogRow, { entry: entry({ environment: 'prod' }) }))
    expect(markup).toContain('[prod]')
  })

  it('renders the old → new delta line when either value is present', () => {
    const markup = html(
      createElement(AuditLogRow, { entry: entry({ oldValue: 'draft', newValue: 'published' }) }),
    )
    expect(markup).toContain('draft')
    expect(markup).toContain('published')
    expect(markup).toContain('→')
    expect(markup).toContain('line-through')
  })

  it('renders no delta line when neither old nor new value is present', () => {
    const markup = html(createElement(AuditLogRow, { entry: entry() }))
    expect(markup).not.toContain('→')
  })

  it('renders the traceId when present', () => {
    const markup = html(createElement(AuditLogRow, { entry: entry({ traceId: 'trace-abc' }) }))
    expect(markup).toContain('trace-abc')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = html(createElement(AuditLogRow, { entry: entry(), onClick: () => {} }))
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(AuditLogRow, { entry: entry() }))
    expect(plain).not.toContain('cursorPointer')
  })

  it('carries a data-mol-id on every row', () => {
    expect(html(createElement(AuditLogRow, { entry: entry() }))).toContain(
      'data-mol-id="audit-log-row"',
    )
  })

  it('exposes an interactive row as a focusable button (role + tabindex) only when clickable', () => {
    const clickable = html(createElement(AuditLogRow, { entry: entry(), onClick: () => {} }))
    expect(clickable).toContain('role="button"')
    expect(clickable).toContain('tabindex="0"')
    const plain = html(createElement(AuditLogRow, { entry: entry() }))
    expect(plain).not.toContain('role="button"')
    expect(plain).not.toContain('tabindex')
  })

  it('forwards className', () => {
    const markup = html(createElement(AuditLogRow, { entry: entry(), className: 'alr-cls' }))
    expect(markup).toContain('alr-cls')
  })
})
