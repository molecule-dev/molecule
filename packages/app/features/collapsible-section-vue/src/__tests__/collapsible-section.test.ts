// @vitest-environment jsdom
/**
 * Unit tests for the Vue `CollapsibleSection` and `ShowMore` — a port of
 * `@molecule/app-collapsible-section-react/src/__tests__/collapsible-section.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { CollapsibleSection, ShowMore } from '../CollapsibleSection.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a component and returns the markup it produced. */
const render = (
  component: unknown,
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component as never, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

/** The body marker the React tests render as a `<p data-body>` child. */
const body = (): VNodeChild[] => [h('p', { 'data-body': '' }, 'hidden body')]

/** `initialCount` items, each marked with its index — the React tests' `<div data-item>`. */
const items = (count: number): VNodeChild[] =>
  Array.from({ length: count }, (_value, index) =>
    h('div', { 'data-item': String(index) }, `item-${index}`),
  )

describe('CollapsibleSection', () => {
  it('renders the title and starts collapsed', () => {
    const markup = render(CollapsibleSection, { title: 'Key concepts' }, { default: body })
    expect(markup).toContain('Key concepts')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).not.toContain('data-body=""')
  })

  it('renders the body when defaultExpanded is true', () => {
    const markup = render(
      CollapsibleSection,
      { title: 'T', defaultExpanded: true },
      { default: body },
    )
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('data-body=""')
  })

  it('respects the controlled expanded prop', () => {
    const markup = render(CollapsibleSection, { title: 'T', expanded: true }, { default: body })
    expect(markup).toContain('data-body=""')
  })

  it('renders the badge and actions slots', () => {
    const markup = render(
      CollapsibleSection,
      { title: 'T' },
      {
        badge: () => [h('span', { 'data-badge': '' })],
        actions: () => [h('span', { 'data-actions': '' })],
      },
    )
    expect(markup).toContain('data-badge=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the heading at the requested level', () => {
    const markup = render(CollapsibleSection, { title: 'T', level: 2 })
    expect(markup).toContain('<h2')
  })

  it('forwards className', () => {
    const markup = render(CollapsibleSection, { title: 'T', className: 'cs-cls' })
    expect(markup).toContain('cs-cls')
  })
})

describe('ShowMore', () => {
  it('renders only the initialCount items by default', () => {
    const markup = render(ShowMore, { initialCount: 3 }, { default: () => items(5) })
    expect(markup).toContain('item-0')
    expect(markup).toContain('item-2')
    expect(markup).not.toContain('item-3')
  })

  it('renders a "Show N more" toggle when there are extra items', () => {
    const markup = render(ShowMore, { initialCount: 3 }, { default: () => items(5) })
    expect(markup).toContain('Show 2 more')
  })

  it('renders no toggle when all items fit within initialCount', () => {
    const markup = render(ShowMore, { initialCount: 3 }, { default: () => items(2) })
    expect(markup).not.toContain('Show')
  })

  it('forwards className', () => {
    const markup = render(ShowMore, { className: 'sm-cls' }, { default: () => items(2) })
    expect(markup).toContain('sm-cls')
  })
})
