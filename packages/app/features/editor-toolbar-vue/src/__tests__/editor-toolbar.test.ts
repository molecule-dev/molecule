// @vitest-environment jsdom
/**
 * Unit tests for the Vue `EditorToolbar` — a port of
 * `@molecule/app-editor-toolbar-react/src/__tests__/editor-toolbar.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * React's suite stubs the wired ClassMap and the UI `Button`; this port stubs
 * the ClassMap the same way and renders the real Vue `Button` over it. The
 * sticky assertion reads the serialized class-driven style attribute
 * (`position: sticky`), the form the DOM keeps for every framework.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createApp, defineComponent, h } from 'vue'

import { EditorToolbar } from '../EditorToolbar.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders an {@link EditorToolbar} and returns the markup it produced.
 *
 * @param props - The toolbar props.
 * @returns The rendered markup.
 */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(EditorToolbar, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('EditorToolbar', () => {
  it('renders the title inside an <h1>', () => {
    const markup = render({ title: 'My Post' })
    expect(markup).toContain('<h1')
    expect(markup).toContain('My Post')
  })

  it('renders the badge and leading slots', () => {
    const markup = render({
      title: 'T',
      badge: h('span', { 'data-badge': '' }),
      leading: h('span', { 'data-leading': '' }),
    })
    expect(markup).toContain('data-badge=""')
    expect(markup).toContain('data-leading=""')
  })

  it('renders primary and secondary action buttons', () => {
    const markup = render({
      title: 'T',
      primaryActions: [{ id: 'save', label: 'Save', onClick: () => {} }],
      secondaryActions: [{ id: 'help', label: 'Help', onClick: () => {} }],
    })
    expect(markup).toContain('Save')
    expect(markup).toContain('Help')
  })

  it('renders an action as an anchor when it has an href', () => {
    const markup = render({
      title: 'T',
      primaryActions: [{ id: 'view', label: 'View', href: '/preview' }],
    })
    expect(markup).toContain('href="/preview"')
  })

  it('disables an action flagged disabled', () => {
    const markup = render({
      title: 'T',
      primaryActions: [{ id: 'save', label: 'Save', onClick: () => {}, disabled: true }],
    })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('applies the sticky inline style by default and drops it when sticky is false', () => {
    expect(render({ title: 'T' })).toContain('position: sticky')
    expect(render({ title: 'T', sticky: false })).not.toContain('position: sticky')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render({ title: 'T', dataMolId: 'et-x', className: 'et-cls' })
    expect(markup).toContain('data-mol-id="et-x"')
    expect(markup).toContain('et-cls')
  })
})
