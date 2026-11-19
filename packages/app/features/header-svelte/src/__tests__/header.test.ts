// @vitest-environment jsdom
/**
 * Unit tests for `AppHeader`, ported from `@molecule/app-header-react`'s own
 * suite: the same behavioral assertions, rendered with a real mount (jsdom)
 * and the bonded ClassMap — including the resilient default theme toggle's
 * provider probing.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { type ComponentProps, createRawSnippet, flushSync, mount, type Snippet } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { createMemoryRouter } from '@molecule/app-routing'

import type { AppHeaderProps } from '../types.js'
import HeaderHost from './HeaderHost.svelte'
import UserMenuHeaderHost from './UserMenuHeaderHost.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The router every header mount sits inside (React's react-router requirement). */
const router = createMemoryRouter({ initialEntries: ['/'] })

/** Records service calls in the fake theme provider. */
const sink = (): void => undefined

/** The i18n provider a wired app mounts above the header. */
const i18n = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
])

/**
 * Mounts `AppHeader` in the given molecule context.
 *
 * @param props - The header props.
 * @param providers - Which providers are mounted above the header.
 * @returns Whether the default theme toggle rendered.
 */
async function render(
  props: AppHeaderProps,
  providers: { theme?: boolean; i18n?: boolean } = {},
): Promise<{ themeToggle: Element | null }> {
  const config: ComponentProps<typeof HeaderHost>['config'] = { router }
  if (providers.theme) config.theme = createFakeThemeProvider('light', sink)
  if (providers.i18n) config.i18n = i18n
  mount(HeaderHost, { target: document.body, props: { config, props } })
  flushSync()
  return { themeToggle: document.body.querySelector('[data-mol-id="theme-toggle"]') }
}

afterEach(async () => {
  document.body.innerHTML = ''
})

describe('AppHeader', () => {
  it('renders the brand and each declared destination as links in the primary navigation landmark', async () => {
    await render({
      appName: 'Field Notes',
      brandClassName: 'wordmark',
      navigation: {
        label: 'Site',
        className: 'site-navigation',
        listClassName: 'site-links',
        itemClassName: 'site-link-item',
        links: {
          '/': { children: raw('Home') },
          '/notebooks/42': {
            className: 'account-link',
            'aria-current': 'page',
            children: raw('<span><img src="/avatar.png" alt="" />My notebook</span>'),
          },
        },
      },
      extraActions: raw('<button type="button">Preferences</button>'),
    })
    const nav = document.body.querySelector('nav[aria-label="Site"]')
    expect(nav).not.toBeNull()
    expect(nav?.getAttribute('class')).toContain('site-navigation')
    const brand = nav?.querySelector('a[class="wordmark"]')
    expect(brand).not.toBeNull()
    expect(brand?.getAttribute('href')).toBe('/')
    const list = nav?.querySelector('ul')
    expect(list?.getAttribute('class')).toBe('site-links')
    expect(nav?.querySelectorAll('li[class="site-link-item"]')).toHaveLength(2)
    expect(nav?.querySelectorAll('a[href="/notebooks/42"]')).toHaveLength(1)
    const account = nav?.querySelector('a[class="account-link"][aria-current="page"]')
    expect(account).not.toBeNull()
    expect(account?.querySelector('img')?.getAttribute('src')).toBe('/avatar.png')
    expect(account?.textContent).toContain('My notebook')
    expect(nav?.querySelectorAll('a[href="/"]')).toHaveLength(2)
    expect(nav?.textContent).toContain('Preferences')
  })

  it('keeps a brand-and-actions header without a primary navigation landmark', async () => {
    await render({
      appName: 'Field Notes',
      extraActions: raw('<button type="button">Preferences</button>'),
    })
    expect(document.body.textContent).toContain('Field Notes')
    expect(document.body.textContent).toContain('Preferences')
    expect(document.body.querySelector('nav')).toBeNull()
  })

  it('renders the appName and the logo image', async () => {
    await render({ appName: 'Acme' })
    const body = document.body
    expect(body.textContent).toContain('Acme')
    const img = body.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('/logo.svg')
  })

  it('honours a custom logoSrc and logoSize', async () => {
    await render({ appName: 'Acme', logoSrc: '/brand.png', logoSize: 48 })
    const img = document.body.querySelector('img')
    expect(img?.getAttribute('src')).toBe('/brand.png')
    expect(img?.getAttribute('width')).toBe('48')
  })

  it('links the brand to "/" by default and to a custom brandTo', async () => {
    await render({ appName: 'Acme' })
    expect(document.body.querySelector('a[href="/"]')).not.toBeNull()
    document.body.innerHTML = ''
    await render({ appName: 'Acme', brandTo: '/home' })
    expect(document.body.querySelector('a[href="/home"]')).not.toBeNull()
  })

  it('mounts without Theme/I18n providers WITHOUT throwing', async () => {
    const { themeToggle } = await render({ appName: 'Acme' })
    // The header still renders (brand is present) — it just degrades the toggle.
    expect(document.body.textContent).toContain('Acme')
    expect(themeToggle).toBeNull()
  })

  it('omits the default theme toggle when Theme/I18n providers are absent', async () => {
    await render({ appName: 'Acme' })
    expect(document.body.querySelector('[data-mol-id="theme-toggle"]')).toBeNull()
  })

  it('omits the default toggle when only ONE of the two providers is present', async () => {
    const onlyTheme = await render({ appName: 'Acme' }, { theme: true })
    expect(onlyTheme.themeToggle).toBeNull()
    document.body.innerHTML = ''
    const onlyI18n = await render({ appName: 'Acme' }, { i18n: true })
    expect(onlyI18n.themeToggle).toBeNull()
  })

  it('renders the default theme toggle once BOTH providers are mounted', async () => {
    const { themeToggle } = await render({ appName: 'Acme' }, { theme: true, i18n: true })
    expect(themeToggle).not.toBeNull()
  })

  it('hides the toggle when themeToggle is null even with providers, and honours a custom node', async () => {
    const forced = await render({ appName: 'Acme', themeToggle: null }, { theme: true, i18n: true })
    expect(forced.themeToggle).toBeNull()
    document.body.innerHTML = ''
    // A supplied node replaces the default, even without any providers mounted.
    await render({ appName: 'Acme', themeToggle: raw('<span data-custom-toggle>Theme</span>') })
    expect(document.body.querySelector('[data-custom-toggle]')).not.toBeNull()
    expect(document.body.querySelector('[data-mol-id="theme-toggle"]')).toBeNull()
  })

  it('renders the documented UserMenu-as-userMenu composition (children API, no renderPanel)', async () => {
    // The module @example with the real UserMenu: its trigger sits in the
    // header, and its children (the settings panel) open in its drawer.
    mount(UserMenuHeaderHost, {
      target: document.body,
      props: { config: { router, i18n } },
    })
    flushSync()
    const trigger = document.body.querySelector<HTMLElement>('header [data-mol-id="user-menu"]')
    expect(trigger).not.toBeNull()
    expect(document.body.querySelector('[data-settings-panel]')).toBeNull()
    trigger?.click()
    flushSync()
    expect(document.body.querySelector('[data-settings-panel]')?.textContent).toBe('Settings')
  })

  it('renders the userMenu and extraActions slots', async () => {
    await render({
      appName: 'Acme',
      userMenu: raw('<div data-user-menu>Ada</div>'),
      extraActions: raw('<div data-extra>Help</div>'),
    })
    expect(document.body.querySelector('[data-user-menu]')).not.toBeNull()
    expect(document.body.querySelector('[data-extra]')).not.toBeNull()
  })

  it('sets data-mol-id and forwards className', async () => {
    await render({ appName: 'Acme', dataMolId: 'hdr-x', className: 'hdr-cls' })
    const header = document.body.querySelector('header')
    expect(header?.getAttribute('data-mol-id')).toBe('hdr-x')
    expect(header?.getAttribute('class')).toContain('hdr-cls')
  })
})
