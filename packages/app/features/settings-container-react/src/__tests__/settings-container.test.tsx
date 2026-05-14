import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.stack(6)`) and also usable bare (`cm.flex1`).
// `cn(...)` joins tokens, calling any function-valued args first.
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

// `Card` is the only `@molecule/app-ui-react` dependency — stub it to a
// <div data-card> that forwards data-mol-id + className + children.
vi.mock('@molecule/app-ui-react', () => ({
  Card: ({
    children,
    className,
    ['data-mol-id']: molId,
  }: {
    children?: ReactNode
    className?: string
    'data-mol-id'?: string
  }) => createElement('div', { 'data-card': '', 'data-mol-id': molId, className }, children),
}))

const { SettingsContent } = await import('../SettingsContent.js')
const { SettingsLayout } = await import('../SettingsLayout.js')
const { SettingsSection } = await import('../SettingsSection.js')
const { SettingsSidebar } = await import('../SettingsSidebar.js')
import type { SettingsSidebarItem } from '../SettingsSidebar.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('SettingsContent', () => {
  it('renders its children', () => {
    const markup = html(
      createElement(SettingsContent, { children: createElement('div', { 'data-c': '' }) }),
    )
    expect(markup).toContain('data-c=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(SettingsContent, { children: 'x', className: 'ct-cls' }))
    expect(markup).toContain('ct-cls')
  })
})

describe('SettingsLayout', () => {
  it('renders the sidebar slot', () => {
    const markup = html(
      createElement(SettingsLayout, {
        sidebar: createElement('div', { 'data-sidebar': '' }),
        children: null,
      }),
    )
    expect(markup).toContain('data-sidebar=""')
  })

  it('renders the content children', () => {
    const markup = html(
      createElement(SettingsLayout, {
        sidebar: null,
        children: createElement('div', { 'data-content': '' }),
      }),
    )
    expect(markup).toContain('data-content=""')
  })

  it('renders the header when given and omits it otherwise', () => {
    const withHeader = html(
      createElement(SettingsLayout, {
        sidebar: null,
        children: null,
        header: createElement('div', { 'data-header': '' }),
      }),
    )
    expect(withHeader).toContain('data-header=""')
    const without = html(createElement(SettingsLayout, { sidebar: null, children: null }))
    expect(without).not.toContain('data-header')
  })

  it('sets data-mol-id and forwards className on the outer wrapper', () => {
    const markup = html(
      createElement(SettingsLayout, {
        sidebar: null,
        children: null,
        dataMolId: 'settings-x',
        className: 'lay-cls',
      }),
    )
    expect(markup).toContain('data-mol-id="settings-x"')
    expect(markup).toContain('lay-cls')
  })
})

describe('SettingsSection', () => {
  it('renders the title inside an <h2>', () => {
    const markup = html(createElement(SettingsSection, { title: 'Profile', children: null }))
    expect(markup).toContain('<h2')
    expect(markup).toContain('Profile')
  })

  it('renders the description when present and omits it otherwise', () => {
    const withDesc = html(
      createElement(SettingsSection, { title: 'T', description: 'desc-x', children: null }),
    )
    expect(withDesc).toContain('desc-x')
    const without = html(createElement(SettingsSection, { title: 'T', children: null }))
    expect(without).not.toContain('<p')
  })

  it('renders its children', () => {
    const markup = html(
      createElement(SettingsSection, {
        title: 'T',
        children: createElement('div', { 'data-body': '' }),
      }),
    )
    expect(markup).toContain('data-body=""')
  })

  it('renders the footer when present and omits it otherwise', () => {
    const withFooter = html(
      createElement(SettingsSection, {
        title: 'T',
        children: null,
        footer: createElement('button', { 'data-footer': '' }),
      }),
    )
    expect(withFooter).toContain('data-footer=""')
    expect(withFooter).toContain('<footer')
    const without = html(createElement(SettingsSection, { title: 'T', children: null }))
    expect(without).not.toContain('<footer')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = html(
      createElement(SettingsSection, {
        title: 'T',
        children: null,
        dataMolId: 'sec-x',
        className: 'sec-cls',
      }),
    )
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
    const markup = html(
      createElement(SettingsSidebar, { items, activeId: 'profile', onSelect: () => {} }),
    )
    expect(markup).toContain('Profile')
    expect(markup).toContain('Billing')
  })

  it('renders item icons', () => {
    const markup = html(
      createElement(SettingsSidebar, {
        items: [{ id: 'a', label: 'A', icon: createElement('i', { 'data-icon': '' }) }],
        activeId: 'a',
        onSelect: () => {},
      }),
    )
    expect(markup).toContain('data-icon=""')
  })

  it('marks only the active item with aria-current="page"', () => {
    const markup = html(
      createElement(SettingsSidebar, { items, activeId: 'billing', onSelect: () => {} }),
    )
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the footer when given', () => {
    const markup = html(
      createElement(SettingsSidebar, {
        items,
        activeId: 'profile',
        onSelect: () => {},
        footer: createElement('div', { 'data-footer': '' }),
      }),
    )
    expect(markup).toContain('data-footer=""')
  })

  it('labels the nav region "Settings" and forwards className', () => {
    const markup = html(
      createElement(SettingsSidebar, {
        items,
        activeId: 'profile',
        onSelect: () => {},
        className: 'sb-cls',
      }),
    )
    expect(markup).toContain('aria-label="Settings"')
    expect(markup).toContain('sb-cls')
  })
})
