// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AppHeader` — a port of
 * `@molecule/app-header-react/src/__tests__/header.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `headerBar`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

// The UI-component markers the React tests mock `@molecule/app-ui-react`
// with: Flex renders its default slot inside `data-flex`; ThemeToggle renders
// `data-theme-toggle` (the marker every toggle-presence assertion reads);
// UserMenu takes its settings panel as its DEFAULT SLOT (the real API) —
// render it, so the documented @example composition can be exercised through
// AppHeader.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Flex: defineComponent({
      name: 'Flex',
      props: {
        direction: String,
        justify: String,
        align: String,
        wrap: String,
        gap: [String, Number],
        className: String,
      },
      setup(_props, { slots }) {
        return () => h('div', { 'data-flex': '' }, slots.default?.())
      },
    }),
    ThemeToggle: defineComponent({
      name: 'ThemeToggle',
      setup() {
        return () => h('button', { 'data-theme-toggle': '', type: 'button' })
      },
    }),
    UserMenu: defineComponent({
      name: 'UserMenu',
      setup(_props, { slots }) {
        return () => h('div', { 'data-user-menu': '' }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, type I18nProvider } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'
import type { ThemeProvider } from '@molecule/app-theme'
import { UserMenu } from '@molecule/app-ui-vue'
import { createRouterPlugin, I18nKey, ThemeKey } from '@molecule/app-vue'

import { AppHeader } from '../AppHeader.js'
import type { AppHeaderProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/** The real i18n provider the "providers present" mounts install. */
const i18nProvider: I18nProvider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
])

/** The real theme provider the "providers present" mounts install. */
const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)

/** The real router the brand-link mounts install (starts at `/settings`). */
const router = ((): Router => createMemoryRouter({ initialEntries: ['/settings'] }))()

/**
 * Mounts an {@link AppHeader} with the given props and providers and returns
 * the markup it produced.
 *
 * The router plugin is installed by default: the brand link is a router link
 * and the header must render inside the binding's router (the React docs
 * state the same requirement). Theme/i18n are mounted only when asked — the
 * header must degrade without them.
 *
 * @param props - The header's props.
 * @param slots - Same-named slots, when the test mounts with slots.
 * @param providers - Which providers are installed above the header.
 * @returns The markup.
 */
const render = (
  props: AppHeaderProps,
  slots?: Record<string, () => VNodeChild[]>,
  providers: { theme?: boolean; i18n?: boolean; router?: boolean } = {},
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(AppHeader, props, slots) }))
  if (providers.theme) app.provide(ThemeKey, themeProvider)
  if (providers.i18n) app.provide(I18nKey, i18nProvider)
  if (providers.router !== false) app.use(createRouterPlugin(router))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('AppHeader', () => {
  it('renders the appName and the logo image', () => {
    const markup = render({ appName: 'Acme' })
    expect(markup).toContain('Acme')
    expect(markup).toContain('<img')
    expect(markup).toContain('src="/logo.svg"')
  })

  it('honours a custom logoSrc and logoSize', () => {
    const markup = render({ appName: 'Acme', logoSrc: '/brand.png', logoSize: 48 })
    expect(markup).toContain('src="/brand.png"')
    expect(markup).toContain('width="48"')
  })

  it('links the brand to "/" by default and to a custom brandTo', () => {
    expect(render({ appName: 'Acme' })).toContain('href="/"')
    expect(render({ appName: 'Acme', brandTo: '/home' })).toContain('href="/home"')
  })

  it('mounts without Theme/I18n providers WITHOUT throwing', () => {
    expect(() => render({ appName: 'Acme' })).not.toThrow()
    // The header still renders (brand is present) — it just degrades the toggle.
    expect(render({ appName: 'Acme' })).toContain('Acme')
  })

  it('omits the default theme toggle when Theme/I18n providers are absent', () => {
    expect(render({ appName: 'Acme' })).not.toContain('data-theme-toggle')
  })

  it('omits the default toggle when only ONE of the two providers is present', () => {
    const onlyTheme = render({ appName: 'Acme' }, undefined, { theme: true })
    expect(onlyTheme).not.toContain('data-theme-toggle')
    const onlyI18n = render({ appName: 'Acme' }, undefined, { i18n: true })
    expect(onlyI18n).not.toContain('data-theme-toggle')
  })

  it('renders the default theme toggle once BOTH providers are mounted', () => {
    const markup = render({ appName: 'Acme' }, undefined, { theme: true, i18n: true })
    expect(markup).toContain('data-theme-toggle=""')
  })

  it('hides the toggle when themeToggle is null even with providers, and honours a custom node', () => {
    expect(
      render({ appName: 'Acme', themeToggle: null }, undefined, { theme: true, i18n: true }),
    ).not.toContain('data-theme-toggle')
    // React passes the custom node WITHOUT providers: the prop form renders it
    // as-is (and the header still does not throw without theme/i18n).
    expect(
      render({ appName: 'Acme', themeToggle: h('span', { 'data-custom-toggle': '' }) }),
    ).toContain('data-custom-toggle=""')
  })

  it('honours a custom toggle node as a same-named slot', () => {
    const asSlot = render(
      { appName: 'Acme' },
      {
        themeToggle: () => [h('span', { 'data-custom-toggle': '' })],
      },
    )
    expect(asSlot).toContain('data-custom-toggle=""')
  })

  it('renders the documented UserMenu-as-userMenu composition (children API, no renderPanel)', () => {
    // Mirrors the module @example: UserMenu receives its settings panel as
    // its DEFAULT SLOT (the Vue counterpart of React's children API) —
    // proving the documented prop shape is the real one.
    const markup = render(
      {
        appName: 'Bearing',
        userMenu: h(UserMenu, () => [h('div', { 'data-settings-panel': '' }, 'Settings')]),
      },
      undefined,
      { router: true },
    )
    expect(markup).toContain('data-user-menu=""')
    expect(markup).toContain('data-settings-panel=""')
  })

  it('renders the userMenu and extraActions slots', () => {
    const markup = render(
      {
        appName: 'Acme',
        userMenu: h('div', { 'data-user-menu': '' }),
        extraActions: h('div', { 'data-extra': '' }),
      },
      undefined,
      { router: true },
    )
    expect(markup).toContain('data-user-menu=""')
    expect(markup).toContain('data-extra=""')
  })

  it('renders the userMenu and extraActions as same-named slots', () => {
    const markup = render(
      { appName: 'Acme' },
      {
        userMenu: () => [h('div', { 'data-user-menu': '' })],
        extraActions: () => [h('div', { 'data-extra': '' })],
      },
      { router: true },
    )
    expect(markup).toContain('data-user-menu=""')
    expect(markup).toContain('data-extra=""')
  })

  it('applies the headerBar + headerFixed tokens, and drops headerFixed when fixed is false', () => {
    expect(render({ appName: 'Acme' })).toContain('class="headerBar headerFixed"')
    expect(render({ appName: 'Acme', fixed: false })).toContain('class="headerBar"')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render({ appName: 'Acme', dataMolId: 'hdr-x', className: 'hdr-cls' })
    expect(markup).toContain('data-mol-id="hdr-x"')
    expect(markup).toContain('hdr-cls')
  })

  it('throws outside the router plugin (the brand link is a router link)', () => {
    expect(() => render({ appName: 'Acme' }, undefined, { router: false })).toThrow(
      /useRouterInstance/,
    )
  })

  it('navigates in-app on a plain primary click of the brand link', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(defineComponent({ render: () => h(AppHeader, { appName: 'Acme' }) }))
    app.use(createRouterPlugin(router))
    app.mount(host)
    const brand = host.querySelector('a')
    expect(brand?.getAttribute('href')).toBe('/')
    brand?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(router.getLocation().pathname).toBe('/')
    app.unmount()
    host.remove()
  })
})
