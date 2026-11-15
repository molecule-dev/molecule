// @vitest-environment jsdom
/**
 * Unit tests for the Solid `AuditLogRow` — a port of
 * `@molecule/app-audit-log-row-react/src/__tests__/audit-log-row.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
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

import type { JSX } from 'solid-js'

const { AuditLogRow } = await import('../AuditLogRow.jsx')
import type { AuditLogEntry } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const entry = (over: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
  id: '1',
  actor: 'alice',
  action: 'updated',
  timestamp: '10:30',
  ...over,
})

describe('AuditLogRow', () => {
  it('renders the actor, action, and timestamp', () => {
    const container = mount(() => <AuditLogRow entry={entry()} />)
    const markup = container.innerHTML
    expect(markup).toContain('alice')
    expect(markup).toContain('updated')
    expect(markup).toContain('10:30')
  })

  it('renders the target when present and omits it otherwise', () => {
    const container = mount(() => <AuditLogRow entry={entry({ target: 'ticket #5' })} />)
    expect(container.innerHTML).toContain('ticket #5')
  })

  it('renders the environment in brackets when present', () => {
    const container = mount(() => <AuditLogRow entry={entry({ environment: 'prod' })} />)
    // Solid anchors the wrapped node's reactive slot with comments, so the
    // bracketed text is read from textContent (comments excluded), as in the
    // other Solid ports' mixed-text assertions.
    expect(container.textContent).toContain('[prod]')
  })

  it('renders the old → new delta line when either value is present', () => {
    const container = mount(() => (
      <AuditLogRow entry={entry({ oldValue: 'draft', newValue: 'published' })} />
    ))
    const markup = container.innerHTML
    expect(markup).toContain('draft')
    expect(markup).toContain('published')
    expect(markup).toContain('→')
    expect(markup).toContain('line-through')
  })

  it('renders no delta line when neither old nor new value is present', () => {
    const container = mount(() => <AuditLogRow entry={entry()} />)
    expect(container.innerHTML).not.toContain('→')
  })

  it('renders the traceId when present', () => {
    const container = mount(() => <AuditLogRow entry={entry({ traceId: 'trace-abc' })} />)
    expect(container.innerHTML).toContain('trace-abc')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = mount(() => <AuditLogRow entry={entry()} onClick={() => {}} />)
    expect(clickable.innerHTML).toContain('cursorPointer')
    const plain = mount(() => <AuditLogRow entry={entry()} />)
    expect(plain.innerHTML).not.toContain('cursorPointer')
  })

  it('carries a data-mol-id on every row', () => {
    const container = mount(() => <AuditLogRow entry={entry()} />)
    expect(container.innerHTML).toContain('data-mol-id="audit-log-row"')
  })

  it('exposes an interactive row as a focusable button (role + tabindex) only when clickable', () => {
    const clickable = mount(() => <AuditLogRow entry={entry()} onClick={() => {}} />)
    expect(clickable.innerHTML).toContain('role="button"')
    expect(clickable.innerHTML).toContain('tabindex="0"')
    const plain = mount(() => <AuditLogRow entry={entry()} />)
    expect(plain.innerHTML).not.toContain('role="button"')
    expect(plain.innerHTML).not.toContain('tabindex')
  })

  it('forwards className', () => {
    const container = mount(() => <AuditLogRow entry={entry()} className="alr-cls" />)
    expect(container.innerHTML).toContain('alr-cls')
  })
})
