// @vitest-environment jsdom
/**
 * Unit tests for the Solid `TabFilter` — a port of
 * `@molecule/app-tab-filter-react/src/__tests__/tab-filter.test.tsx`: the same
 * test names and the same behavioral assertions, rendered with Solid in jsdom
 * and asserted on the markup the component produces.
 *
 * React's suite stubs the wired classmap; this port stubs the same classmap
 * (each accessed member echoes its token) and mounts the real component.
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TabFilterProps } from '../types.js'

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

const { TabFilter } = await import('../TabFilter.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a {@link TabFilter} and returns the element it produced.
 *
 * @param props - The component props.
 * @returns The mounted container.
 */
const mountFilter = (props: TabFilterProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(() => <TabFilter {...props} />, host))
  return host
}

/** Renders a {@link TabFilter} and returns the markup it produced. */
const html = (props: TabFilterProps): string => mountFilter(props).innerHTML

const tabs = [
  { id: 'all', label: 'All', count: 42 },
  { id: 'open', label: 'Open', count: 8 },
  { id: 'closed', label: 'Closed', disabled: true },
]

describe('TabFilter', () => {
  it('renders a tablist with one tab per entry', () => {
    const markup = html({ tabs, activeId: 'all', onChange: () => {} })
    expect(markup).toContain('role="tablist"')
    expect(markup.match(/role="tab"/g) ?? []).toHaveLength(3)
    expect(markup).toContain('All')
    expect(markup).toContain('Open')
    expect(markup).toContain('Closed')
  })

  it('marks the active tab with aria-selected="true"', () => {
    const markup = html({ tabs, activeId: 'open', onChange: () => {} })
    expect(markup.match(/aria-selected="true"/g) ?? []).toHaveLength(1)
  })

  it('renders the count badge when a tab has a count', () => {
    const markup = html({ tabs, activeId: 'all', onChange: () => {} })
    expect(markup).toContain('(42)')
    expect(markup).toContain('(8)')
  })

  it('disables a tab flagged disabled', () => {
    const markup = html({ tabs, activeId: 'all', onChange: () => {} })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the tab icon', () => {
    const markup = html({
      tabs: [{ id: 'a', label: 'A', icon: <i data-icon="" /> }],
      activeId: 'a',
      onChange: () => {},
    })
    expect(markup).toContain('data-icon=""')
  })

  it('forwards className', () => {
    const markup = html({ tabs, activeId: 'all', onChange: () => {}, className: 'tf-cls' })
    expect(markup).toContain('tf-cls')
  })
})

it.each(['notes', 'drafts'])(
  'keeps the collection default reachable from selected %s tabs',
  (activeId) => {
    const onChange = vi.fn()
    const props = {
      tabs: [{ id: activeId, label: activeId }],
      defaultTab: { id: 'all', label: 'All documents' },
      activeId,
      onChange,
    }
    const markup = html(props)
    expect(markup).toContain('All documents')
    expect(markup.match(/role="tab"/g)).toHaveLength(2)
    const host = mountFilter(props)
    host.querySelectorAll('button')[0]!.click()
    expect(onChange).toHaveBeenCalledWith('all')
  },
)

it('keeps one default tab when the supplied tabs already contain it', () => {
  const markup = html({
    tabs,
    defaultTab: { id: 'all', label: 'All documents' },
    activeId: 'all',
    onChange: () => {},
  })
  expect(markup.match(/data-mol-id="tab-filter-all"/g)).toHaveLength(1)
  expect(markup).toContain('All documents')
})
