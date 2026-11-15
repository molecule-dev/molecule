// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ListItemRow` — a port of
 * `@molecule/app-list-item-row-react/src/__tests__/list-item-row.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces. The disabled row's dimmed opacity is set
 * through the CSSOM, so jsdom serializes it with a space (`opacity: 0.5`) —
 * the same live-DOM spelling a mounted React tree produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
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

const { ListItemRow } = await import('../ListItemRow.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and return the mounted container. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** The markup the given props produced. */
const markupOf = (props: Record<string, unknown>): string => {
  const container = mount(() => <ListItemRow {...props} />)
  return container.innerHTML
}

describe('ListItemRow', () => {
  it('renders the title', () => {
    const markup = markupOf({ title: 'Inbox' })
    expect(markup).toContain('Inbox')
  })

  it('renders subtitle and metadata when present and omits them otherwise', () => {
    const full = markupOf({ title: 'T', subtitle: 'sub-x', metadata: 'meta-x' })
    expect(full).toContain('sub-x')
    expect(full).toContain('meta-x')
    const bare = markupOf({ title: 'T' })
    expect(bare).not.toContain('sub-x')
    expect(bare).not.toContain('meta-x')
  })

  it('renders the leading and actions slots', () => {
    const markup = markupOf({
      title: 'T',
      leading: <span data-leading="" />,
      actions: <span data-actions="" />,
    })
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('exposes a button role and clickable cursor only when onClick is supplied', () => {
    const clickable = markupOf({ title: 'T', onClick: () => {} })
    expect(clickable).toContain('role="button"')
    expect(clickable).toContain('cursorPointer')
    const plain = markupOf({ title: 'T' })
    expect(plain).not.toContain('role="button"')
  })

  it('reflects the selected state via aria-selected', () => {
    const markup = markupOf({ title: 'T', selected: true })
    expect(markup).toContain('aria-selected="true"')
  })

  it('reflects the disabled state via aria-disabled and dimmed opacity', () => {
    const markup = markupOf({ title: 'T', disabled: true })
    expect(markup).toContain('aria-disabled="true"')
    expect(markup).toContain('opacity: 0.5')
  })

  it('forwards className', () => {
    const markup = markupOf({ title: 'T', className: 'lir-cls' })
    expect(markup).toContain('lir-cls')
  })
})
