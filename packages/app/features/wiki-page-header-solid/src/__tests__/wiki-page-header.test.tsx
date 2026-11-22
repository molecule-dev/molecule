// @vitest-environment jsdom
/**
 * Unit tests for the Solid `WikiPageHeader` — a port of
 * `@molecule/app-wiki-page-header-react/src/__tests__/wiki-page-header.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React package's own tests use.
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element }) => <button data-button="">{props.children}</button>,
}))

const { WikiPageHeader } = await import('../WikiPageHeader.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Render with Solid's browser renderer and return the wrapper element. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('WikiPageHeader', () => {
  it('renders the title inside an <h1>', () => {
    const container = mount(() => <WikiPageHeader title="Getting Started" />)
    expect(container.innerHTML).toContain('<h1')
    expect(container.innerHTML).toContain('Getting Started')
  })

  it('renders the breadcrumb slot', () => {
    const container = mount(() => <WikiPageHeader title="T" breadcrumb={<nav data-crumb="" />} />)
    expect(container.innerHTML).toContain('data-crumb=""')
  })

  it('renders the version, updatedAt, and updatedBy meta', () => {
    const container = mount(() => (
      <WikiPageHeader title="T" version="v23" updatedAt="2 days ago" updatedBy="Jane" />
    ))
    expect(container.innerHTML).toContain('v23')
    expect(container.innerHTML).toContain('Updated')
    expect(container.innerHTML).toContain('2 days ago')
    expect(container.innerHTML).toContain('Jane')
  })

  it('renders the Edit / History buttons only when their handlers are supplied', () => {
    const withActions = mount(() => (
      <WikiPageHeader title="T" onEdit={() => {}} onHistory={() => {}} />
    ))
    expect(withActions.innerHTML).toContain('Edit')
    expect(withActions.innerHTML).toContain('History')
    const without = mount(() => <WikiPageHeader title="T" />)
    expect(without.innerHTML).not.toContain('Edit')
    expect(without.innerHTML).not.toContain('History')
  })

  it('renders the tags and extraActions slots', () => {
    const container = mount(() => (
      <WikiPageHeader
        title="T"
        tags={<span data-tags="" />}
        extraActions={<button data-extra="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-tags=""')
    expect(container.innerHTML).toContain('data-extra=""')
  })

  it('forwards className', () => {
    const container = mount(() => <WikiPageHeader title="T" className="wph-cls" />)
    expect(container.innerHTML).toContain('wph-cls')
  })
})
