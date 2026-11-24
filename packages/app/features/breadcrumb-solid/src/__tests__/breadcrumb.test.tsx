// @vitest-environment jsdom
/**
 * Unit tests for the Solid `Breadcrumb` — a port of
 * `@molecule/app-breadcrumb-react/src/__tests__/breadcrumb.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `link`), so tests can assert which cm.* class was applied without a real
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { Breadcrumb } = await import('../Breadcrumb.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders with Solid's browser renderer and disposes after the test. */
const mountView = (view: () => JSX.Element): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const items = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]

describe('Breadcrumb', () => {
  it('renders every crumb label', () => {
    const container = mountView(() => <Breadcrumb items={items} />)
    expect(container.innerHTML).toContain('Home')
    expect(container.innerHTML).toContain('Projects')
    expect(container.innerHTML).toContain('Alpha')
  })

  it('marks the last crumb as the current page', () => {
    const container = mountView(() => <Breadcrumb items={items} />)
    expect(container.innerHTML).toContain('aria-current="page"')
  })

  it('renders linked crumbs as anchors when no onNavigate is supplied', () => {
    const container = mountView(() => <Breadcrumb items={items} />)
    expect(container.innerHTML).toContain('href="/"')
    expect(container.innerHTML).toContain('href="/projects"')
  })

  it('renders linked crumbs as buttons when onNavigate is supplied', () => {
    const container = mountView(() => <Breadcrumb items={items} onNavigate={() => {}} />)
    expect(container.innerHTML).toContain('<button')
    expect(container.innerHTML).not.toContain('href="/projects"')
  })

  it('renders a crumb without `to` as plain text', () => {
    const container = mountView(() => <Breadcrumb items={[{ label: 'Just text' }]} />)
    expect(container.innerHTML).toContain('Just text')
    expect(container.innerHTML).not.toContain('href')
    expect(container.innerHTML).not.toContain('<button')
  })

  it('renders the default "/" separator between crumbs', () => {
    const container = mountView(() => <Breadcrumb items={items} />)
    // two separators for three items
    expect(container.innerHTML.split('aria-hidden="true">/').length - 1).toBe(2)
  })

  it('renders a custom separator node', () => {
    const container = mountView(() => (
      <Breadcrumb items={items} separator={<span data-sep="">›</span>} />
    ))
    expect(container.innerHTML).toContain('data-sep=""')
  })

  it('renders every node of a separator list in each gap, and the default for an empty one', () => {
    // React's `slot(separator) ?? <span aria-hidden>/</span>`: a list renders whole, and an
    // empty list is absent (slot → undefined), so it gets the default separator.
    const pair = mountView(() => (
      <Breadcrumb items={items} separator={[<i data-a="" />, <i data-b="" />]} />
    ))
    expect(pair.querySelectorAll('[data-a]')).toHaveLength(2)
    expect(pair.querySelectorAll('[data-b]')).toHaveLength(2)
    const empty = mountView(() => <Breadcrumb items={items} separator={[]} />)
    expect(empty.innerHTML).toContain('aria-hidden="true">/')
  })

  it('renders crumb icons', () => {
    const container = mountView(() => (
      <Breadcrumb items={[{ label: 'Home', to: '/', icon: <i data-icon="" /> }]} />
    ))
    expect(container.innerHTML).toContain('data-icon=""')
  })

  it('labels the nav region "Breadcrumb", sets data-mol-id, and forwards className', () => {
    const container = mountView(() => (
      <Breadcrumb items={items} dataMolId="bc-x" className="bc-cls" />
    ))
    expect(container.innerHTML).toContain('aria-label="Breadcrumb"')
    expect(container.innerHTML).toContain('data-mol-id="bc-x"')
    expect(container.innerHTML).toContain('bc-cls')
  })
})
