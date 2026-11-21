// @vitest-environment jsdom
/**
 * Unit tests for the Svelte settings-page scaffold — a port of
 * `@molecule/app-settings-container-react/src/__tests__/settings-container.test.tsx`:
 * the same behavioral assertions, mounted with Svelte 5 in jsdom and asserted
 * on the DOM the components produce.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import SettingsContent from '../SettingsContent.svelte'
import SettingsLayout from '../SettingsLayout.svelte'
import SettingsSection from '../SettingsSection.svelte'
import SettingsSidebar from '../SettingsSidebar.svelte'
import type { SettingsSidebarItem } from '../types.js'
import Host from './Host.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const mounted: Array<ReturnType<typeof mount>> = []

/**
 * Mounts one component with the given props through the test host, so the
 * props are checked against the props the component really accepts.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The container holding the rendered DOM.
 */
function render<Props extends object>(
  component: Component<Props>,
  props: NoInfer<Props>,
): HTMLElement {
  const instance = mount(Host<Props>, {
    target: document.body,
    props: { config: {}, component, props },
  })
  mounted.push(instance)
  flushSync()
  return document.body
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('SettingsContent', () => {
  it('renders its children', () => {
    const body = render(SettingsContent, { children: raw('<div data-c></div>') })
    expect(body.innerHTML).toContain('data-c')
  })

  it('forwards className', () => {
    const body = render(SettingsContent, { className: 'ct-cls', children: raw('x') })
    expect(body.innerHTML).toContain('ct-cls')
  })
})

describe('SettingsLayout', () => {
  it('renders the sidebar slot', () => {
    const body = render(SettingsLayout, { sidebar: raw('<div data-sidebar></div>') })
    expect(body.innerHTML).toContain('data-sidebar')
  })

  it('renders the content children', () => {
    const body = render(SettingsLayout, { children: raw('<div data-content></div>') })
    expect(body.innerHTML).toContain('data-content')
  })

  it('renders the header when given and omits it otherwise', () => {
    const withHeader = render(SettingsLayout, { header: raw('<div data-header></div>') })
    expect(withHeader.innerHTML).toContain('data-header')
    document.body.innerHTML = ''
    const without = render(SettingsLayout, {})
    expect(without.innerHTML).not.toContain('data-header')
  })

  it('sets data-mol-id and forwards className on the outer wrapper', () => {
    const body = render(SettingsLayout, { dataMolId: 'settings-x', className: 'lay-cls' })
    const wrapper = body.querySelector('[data-mol-id="settings-x"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.getAttribute('class')).toContain('lay-cls')
  })
})

describe('SettingsSection', () => {
  it('renders the title inside an <h2>', () => {
    const body = render(SettingsSection, { title: 'Profile' })
    const heading = body.querySelector('h2')
    expect(heading).not.toBeNull()
    expect(heading?.textContent).toContain('Profile')
  })

  it('renders the description when present and omits it otherwise', () => {
    const withDesc = render(SettingsSection, { title: 'T', description: 'desc-x' })
    expect(withDesc.innerHTML).toContain('desc-x')
    document.body.innerHTML = ''
    const without = render(SettingsSection, { title: 'T' })
    expect(without.querySelector('p')).toBeNull()
  })

  it('renders its children', () => {
    const body = render(SettingsSection, { title: 'T', children: raw('<div data-body></div>') })
    expect(body.innerHTML).toContain('data-body')
  })

  it('renders the footer when present and omits it otherwise', () => {
    const withFooter = render(SettingsSection, {
      title: 'T',
      footer: raw('<button data-footer></button>'),
    })
    expect(withFooter.innerHTML).toContain('data-footer')
    expect(withFooter.querySelector('footer')).not.toBeNull()
    document.body.innerHTML = ''
    const without = render(SettingsSection, { title: 'T' })
    expect(without.querySelector('footer')).toBeNull()
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const body = render(SettingsSection, { title: 'T', dataMolId: 'sec-x', className: 'sec-cls' })
    const card = body.querySelector('[data-mol-id="sec-x"]')
    expect(card).not.toBeNull()
    expect(card?.getAttribute('class')).toContain('sec-cls')
  })
})

describe('SettingsSidebar', () => {
  const items: SettingsSidebarItem[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
  ]

  it('renders every item label', () => {
    const body = render(SettingsSidebar, { items, activeId: 'profile', onSelect: () => {} })
    expect(body.innerHTML).toContain('Profile')
    expect(body.innerHTML).toContain('Billing')
  })

  it('renders item icons', () => {
    const body = render(SettingsSidebar, {
      items: [{ id: 'a', label: 'A', icon: raw('<i data-icon></i>') }],
      activeId: 'a',
      onSelect: () => {},
    })
    expect(body.innerHTML).toContain('data-icon')
  })

  it('marks only the active item with aria-current="page"', () => {
    const body = render(SettingsSidebar, { items, activeId: 'billing', onSelect: () => {} })
    expect(body.innerHTML.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the footer when given', () => {
    const body = render(SettingsSidebar, {
      items,
      activeId: 'profile',
      onSelect: () => {},
      footer: raw('<div data-footer></div>'),
    })
    expect(body.innerHTML).toContain('data-footer')
  })

  it('labels the nav region "Settings" and forwards className', () => {
    const body = render(SettingsSidebar, {
      items,
      activeId: 'profile',
      onSelect: () => {},
      className: 'sb-cls',
    })
    const nav = body.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Settings')
    expect(nav?.getAttribute('class')).toContain('sb-cls')
  })
})
