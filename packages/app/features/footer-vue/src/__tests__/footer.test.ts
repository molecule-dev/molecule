// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AppFooter` — a port of
 * `@molecule/app-footer-react/src/__tests__/footer.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the real
 * markup (real `Icon` and `Modal` from `@molecule/app-ui-vue`, the real
 * binding composables over a seeded i18n catalog, a bonded version provider
 * and a real memory router).
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `footerBar`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // Resolver members are called with options and echo their token; every
    // other member IS a token string. The real ClassMap has exactly this
    // shape, so the real @molecule/app-ui-vue components (Icon, Modal)
    // resolve correct classes in these tests.
    const resolvers = new Set([
      'cn',
      'button',
      'input',
      'textarea',
      'select',
      'checkbox',
      'radio',
      'switchBase',
      'switchThumb',
      'label',
      'card',
      'badge',
      'alert',
      'avatar',
      'modal',
      'spinner',
      'toast',
      'separator',
      'accordion',
      'pagination',
      'tabsList',
      'tabsTrigger',
      'tabsContent',
      'tooltip',
      'progress',
      'progressBar',
      'skeleton',
      'container',
      'flex',
      'grid',
      'cardPadding',
      'progressHeight',
      'progressColor',
      'toastContainer',
      'radioGroupLayout',
      'spacer',
      'alertLeftAccent',
      'accentCard',
      'accentCardLabel',
      'stack',
      'textSize',
      'fontWeight',
      'w',
      'h',
      'minH',
      'minW',
      'sp',
    ])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        const token = String(prop)
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (resolvers.has(token)) return () => token
        return token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createApp, defineComponent, h } from 'vue'

import { createSimpleI18nProvider, type I18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { createMemoryRouter } from '@molecule/app-routing'
import { setProvider as setVersionProvider, type VersionProvider } from '@molecule/app-version'
import { createI18nPlugin, createRouterPlugin } from '@molecule/app-vue'

import { AppFooter } from '../AppFooter.js'

// The real Icon needs the bonded icon set; the version composable reads the
// bonded version provider, which the test bonds at 2.0.0 the way the React
// tests mock `useVersion` to 2.0.0.
setIconSet(iconSet)
setVersionProvider(versionProvider())

/** The bonded fake version provider (all state fixed, version 2.0.0). */
function versionProvider(): VersionProvider {
  const state = {
    buildId: 'test',
    version: '2.0.0',
    isUpdateAvailable: false,
    isChecking: false,
    isServiceWorkerWaiting: false,
    newVersion: undefined,
  }
  return {
    getState: () => ({ ...state }),
    setCurrentVersion: () => {},
    checkForUpdates: async () => false,
    startPeriodicChecks: () => {},
    stopPeriodicChecks: () => {},
    getServiceWorker: () => {
      throw new Error('not implemented')
    },
    applyUpdate: () => {},
    dismissUpdate: () => {},
    on: () => () => {},
    off: () => {},
    destroy: () => {},
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

/** The i18n provider the test mounts with (English + Español, no catalog entries). */
const i18n: I18nProvider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  { code: 'es', name: 'Español', direction: 'ltr', translations: {} },
])

/**
 * Mounts an {@link AppFooter} (with the binding's i18n + router plugins) and
 * returns the markup of the footer element itself — the modals teleported to
 * `<body>` stay out of it and are asserted separately.
 *
 * @param props - The footer's props.
 * @returns The markup.
 */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(AppFooter, props) }))
  app.use(createI18nPlugin(i18n))
  app.use(createRouterPlugin(createMemoryRouter({ initialEntries: ['/'] })))
  app.mount(host)
  const markup = host.querySelector('footer')?.outerHTML ?? ''
  app.unmount()
  host.remove()
  return markup
}

describe('AppFooter', () => {
  it('renders the About link with the interpolated app name', () => {
    const markup = render({ appName: 'Acme', aboutHref: '/about' })
    expect(markup).toContain('About Acme')
  })

  it('renders an external About href as a target=_blank anchor', () => {
    const markup = render({ appName: 'Acme', aboutHref: 'https://acme.com' })
    expect(markup).toContain('href="https://acme.com"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('rel="noopener noreferrer"')
  })

  it('renders an internal About href as a router Link', () => {
    const markup = render({ appName: 'Acme', aboutHref: '/about' })
    // React asserts its mocked react-router Link's `data-link=""` marker; the
    // real binding Link renders a plain anchor with no marker attribute, so
    // the internal href plus the ABSENCE of the external branch's
    // `target="_blank"` is the same evidence here.
    expect(markup).toContain('href="/about"')
    expect(markup).not.toContain('target="_blank"')
  })

  it('renders Privacy/Terms as buttons in modal mode', () => {
    const markup = render({ appName: 'Acme', aboutHref: '/about' })
    expect(markup).toContain('Privacy Policy')
    expect(markup).toContain('Terms of Service')
    expect(markup).toMatch(/<button[^>]*>Privacy Policy/)
  })

  it('renders Privacy/Terms as router Links in route mode', () => {
    const markup = render({ appName: 'Acme', aboutHref: '/about', legalMode: 'route' })
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('href="/terms"')
    expect(markup).not.toMatch(/<button[^>]*>Privacy Policy/)
  })

  it('renders the language button and the version string', () => {
    const markup = render({ appName: 'Acme', aboutHref: '/about' })
    expect(markup).toContain('aria-label="Language"')
    // React's mocked Icon asserts `data-icon="globe"`; the real Icon renders
    // the bonded globe glyph, whose unique path data is the same evidence.
    expect(markup).toContain('<svg')
    expect(markup).toContain('M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Z')
    expect(markup).toContain('English')
    expect(markup).toContain('v2.0.0')
  })

  it('keeps the privacy/terms modals closed initially', () => {
    render({ appName: 'Acme', aboutHref: '/about' })
    // React asserts its mocked Modal's `data-modal=""` marker is absent; the
    // real Vue Modal teleports an OPEN dialog to <body> with role="dialog",
    // so this one absent selector covers the privacy, terms AND language
    // modals.
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('opens the privacy modal with the honest placeholder when no content is registered', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({ render: () => h(AppFooter, { appName: 'Acme', aboutHref: '/about' }) }),
    )
    app.use(createI18nPlugin(i18n))
    app.use(createRouterPlugin(createMemoryRouter({ initialEntries: ['/'] })))
    app.mount(host)
    const privacy = Array.from(host.querySelectorAll('footer button')).find((b) =>
      b.textContent?.includes('Privacy Policy'),
    )
    privacy?.click()
    await new Promise((resolve) => setTimeout(resolve))
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('This content has not been configured yet')
    expect(dialog?.textContent).toContain('app owner must provide it')
    // Placeholder branch renders the message as plain text in a <p> — NOT an
    // injected-HTML <div> (which would be blank when content is empty).
    const body = dialog?.querySelector('.dialogBody')
    expect(body?.firstElementChild?.tagName).toBe('P')
    app.unmount()
    host.remove()
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render({
      appName: 'Acme',
      aboutHref: '/about',
      dataMolId: 'footer-x',
      className: 'ft-cls',
    })
    expect(markup).toContain('data-mol-id="footer-x"')
    expect(markup).toContain('ft-cls')
  })
})
