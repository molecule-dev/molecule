// @vitest-environment jsdom
/**
 * Unit tests for the Vue settings-page scaffold — a port of
 * `@molecule/app-settings-container-react/src/__tests__/settings-container.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the components produce.
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

// `Card` is the only `@molecule/app-ui-vue` dependency — stub it to a
// <div data-card> that forwards data-mol-id + className + children, as the
// React suite stubs `@molecule/app-ui-react`'s Card.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Card: defineComponent({
      name: 'Card',
      inheritAttrs: false,
      props: { className: String },
      setup(props, { attrs, slots }) {
        return () =>
          h(
            'div',
            {
              'data-card': '',
              'data-mol-id': attrs['data-mol-id'] as string | undefined,
              class: props.className,
            },
            slots.default?.(),
          )
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { SettingsContent } from '../SettingsContent.js'
import { SettingsLayout } from '../SettingsLayout.js'
import { SettingsSection } from '../SettingsSection.js'
import { SettingsSidebar } from '../SettingsSidebar.js'
import type { SettingsSidebarItem } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders one component and returns the markup it produced.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @param slots - Named slots (default is the main content).
 * @returns The rendered markup.
 */
const render = (
  component: ReturnType<typeof defineComponent>,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('SettingsContent', () => {
  it('renders its children', () => {
    const markup = render(SettingsContent, {}, { default: () => [h('div', { 'data-c': '' })] })
    expect(markup).toContain('data-c=""')
  })

  it('forwards className', () => {
    const markup = render(SettingsContent, { className: 'ct-cls' }, { default: () => ['x'] })
    expect(markup).toContain('ct-cls')
  })
})

describe('SettingsLayout', () => {
  it('renders the sidebar slot', () => {
    const markup = render(
      SettingsLayout,
      {},
      { sidebar: () => [h('div', { 'data-sidebar': '' })], default: () => [] },
    )
    expect(markup).toContain('data-sidebar=""')
  })

  it('renders the content children', () => {
    const markup = render(SettingsLayout, {}, { default: () => [h('div', { 'data-content': '' })] })
    expect(markup).toContain('data-content=""')
  })

  it('renders the header when given and omits it otherwise', () => {
    const withHeader = render(
      SettingsLayout,
      { header: h('div', { 'data-header': '' }) },
      { default: () => [] },
    )
    expect(withHeader).toContain('data-header=""')
    const without = render(SettingsLayout, {}, { default: () => [] })
    expect(without).not.toContain('data-header')
  })

  it('sets data-mol-id and forwards className on the outer wrapper', () => {
    const markup = render(
      SettingsLayout,
      { dataMolId: 'settings-x', className: 'lay-cls' },
      { default: () => [] },
    )
    expect(markup).toContain('data-mol-id="settings-x"')
    expect(markup).toContain('lay-cls')
  })
})

describe('SettingsSection', () => {
  it('renders the title inside an <h2>', () => {
    const markup = render(SettingsSection, { title: 'Profile' })
    expect(markup).toContain('<h2')
    expect(markup).toContain('Profile')
  })

  it('renders the description when present and omits it otherwise', () => {
    const withDesc = render(SettingsSection, { title: 'T', description: 'desc-x' })
    expect(withDesc).toContain('desc-x')
    const without = render(SettingsSection, { title: 'T' })
    expect(without).not.toContain('<p')
  })

  it('renders its children', () => {
    const markup = render(
      SettingsSection,
      { title: 'T' },
      { default: () => [h('div', { 'data-body': '' })] },
    )
    expect(markup).toContain('data-body=""')
  })

  it('renders the footer when present and omits it otherwise', () => {
    const withFooter = render(SettingsSection, {
      title: 'T',
      footer: h('button', { 'data-footer': '' }),
    })
    expect(withFooter).toContain('data-footer=""')
    expect(withFooter).toContain('<footer')
    const without = render(SettingsSection, { title: 'T' })
    expect(without).not.toContain('<footer')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = render(SettingsSection, {
      title: 'T',
      dataMolId: 'sec-x',
      className: 'sec-cls',
    })
    expect(markup).toContain('data-mol-id="sec-x"')
    expect(markup).toContain('sec-cls')
  })
})

describe('SettingsSidebar', () => {
  const items: SettingsSidebarItem[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
  ]

  it('renders every item label', () => {
    const markup = render(SettingsSidebar, { items, activeId: 'profile', onSelect: () => {} })
    expect(markup).toContain('Profile')
    expect(markup).toContain('Billing')
  })

  it('renders item icons', () => {
    const markup = render(SettingsSidebar, {
      items: [{ id: 'a', label: 'A', icon: h('i', { 'data-icon': '' }) }],
      activeId: 'a',
      onSelect: () => {},
    })
    expect(markup).toContain('data-icon=""')
  })

  it('marks only the active item with aria-current="page"', () => {
    const markup = render(SettingsSidebar, { items, activeId: 'billing', onSelect: () => {} })
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the footer when given', () => {
    const markup = render(
      SettingsSidebar,
      { items, activeId: 'profile', onSelect: () => {} },
      { footer: () => [h('div', { 'data-footer': '' })] },
    )
    expect(markup).toContain('data-footer=""')
  })

  it('labels the nav region "Settings" and forwards className', () => {
    const markup = render(SettingsSidebar, {
      items,
      activeId: 'profile',
      onSelect: () => {},
      className: 'sb-cls',
    })
    expect(markup).toContain('aria-label="Settings"')
    expect(markup).toContain('sb-cls')
  })
})
