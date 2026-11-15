// @vitest-environment jsdom
/**
 * Unit tests for the Vue `WikiPageHeader` — a port of
 * `@molecule/app-wiki-page-header-react/src/__tests__/wiki-page-header.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      props: { variant: String, size: String, onClick: Function },
      setup(_props, { slots }) {
        return () => h('button', { 'data-button': '' }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { WikiPageHeader } from '../WikiPageHeader.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link WikiPageHeader} with the given props and returns the markup
 * it produced.
 *
 * @param props - The header's props.
 * @param slots - Same-named slots, when the test mounts with slots.
 * @returns The markup.
 */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(WikiPageHeader, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('WikiPageHeader', () => {
  it('renders the title inside an <h1>', () => {
    const markup = render({ title: 'Getting Started' })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Getting Started')
  })

  it('renders the breadcrumb slot', () => {
    const markup = render({ title: 'T', breadcrumb: h('nav', { 'data-crumb': '' }) })
    expect(markup).toContain('data-crumb=""')
    const asSlot = render({ title: 'T' }, { breadcrumb: () => [h('nav', { 'data-crumb': '' })] })
    expect(asSlot).toContain('data-crumb=""')
  })

  it('renders the version, updatedAt, and updatedBy meta', () => {
    const markup = render({
      title: 'T',
      version: 'v23',
      updatedAt: '2 days ago',
      updatedBy: 'Jane',
    })
    expect(markup).toContain('v23')
    expect(markup).toContain('Updated')
    expect(markup).toContain('2 days ago')
    expect(markup).toContain('Jane')
  })

  it('renders the Edit / History buttons only when their handlers are supplied', () => {
    const withActions = render({ title: 'T', onEdit: () => {}, onHistory: () => {} })
    expect(withActions).toContain('Edit')
    expect(withActions).toContain('History')
    const without = render({ title: 'T' })
    expect(without).not.toContain('Edit')
    expect(without).not.toContain('History')
  })

  it('renders the tags and extraActions slots', () => {
    const markup = render({
      title: 'T',
      tags: h('span', { 'data-tags': '' }),
      extraActions: h('button', { 'data-extra': '' }),
    })
    expect(markup).toContain('data-tags=""')
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className', () => {
    const markup = render({ title: 'T', className: 'wph-cls' })
    expect(markup).toContain('wph-cls')
  })
})
