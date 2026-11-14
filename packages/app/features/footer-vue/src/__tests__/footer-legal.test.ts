// @vitest-environment jsdom
/**
 * Legal-modal tests for the Vue `AppFooter` — a port of
 * `@molecule/app-footer-react/src/__tests__/footer-legal.test.tsx`: no
 * silently-blank modal (the honest placeholder), `{{appName}}` HTML-escaped
 * before entering legal HTML, and app-registered content rendered as HTML.
 * Rendered with Vue in jsdom against the REAL `Modal` (teleported to
 * `<body>`), a seeded i18n catalog, a bonded version provider and a real
 * memory router.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `prose`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
// bonded version provider (any fixed state will do here).
setIconSet(iconSet)
setVersionProvider(versionProvider())

/** The bonded fake version provider (all state fixed). */
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

// A mutable i18n catalog the tests can seed to simulate an app that registered
// real legal HTML. The provider holds the object by reference and reads it on
// every `t()` call, so seeding between tests behaves like the React tests'
// hoisted catalog mock.
const catalog: Record<string, string> = {}

/** The i18n provider the test mounts with (English carries the mutable catalog). */
const i18n: I18nProvider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: catalog },
])

afterEach(() => {
  document.body.innerHTML = ''
  for (const k of Object.keys(catalog)) delete catalog[k]
})

/**
 * Mounts an {@link AppFooter}, clicks the Privacy Policy or Terms of Service
 * button, and returns the opened modal's dialog element (the real Modal
 * teleports to `<body>`).
 *
 * @param label - Which legal button to click.
 * @param props - Extra footer props.
 * @returns The opened `[role="dialog"]` element.
 */
async function openLegalModal(
  label: 'Privacy Policy' | 'Terms of Service',
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: () => h(AppFooter, { appName: 'Acme', aboutHref: '/about', ...props }),
    }),
  )
  app.use(createI18nPlugin(i18n))
  app.use(createRouterPlugin(createMemoryRouter({ initialEntries: ['/'] })))
  app.mount(host)
  const button = Array.from(host.querySelectorAll('footer button')).find((b) =>
    b.textContent?.includes(label),
  )
  if (!button) throw new Error(`${label} button not found`)
  button.click()
  await new Promise((resolve) => setTimeout(resolve))
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!dialog) throw new Error(`${label} modal did not open`)
  return dialog
}

/** The modal's body region (everything below the title row). */
const dialogBody = (dialog: Element): Element => {
  const body = dialog.querySelector('.dialogBody')
  if (!body) throw new Error('modal body not found')
  return body
}

describe('AppFooter legal modals — no silently-blank modal (empty content)', () => {
  it('shows the honest placeholder in the Privacy modal when content is empty', async () => {
    const dialog = await openLegalModal('Privacy Policy')
    // The modal is not blank — it carries the configured-placeholder message.
    expect(dialog.textContent).toContain('This content has not been configured yet')
    expect(dialog.textContent).toContain('app owner must provide it')
    expect((dialog.textContent ?? '').trim().length).toBeGreaterThan(0)
    // Placeholder branch renders the message as plain text in a <p> — NOT an
    // injected-HTML <div> (which would be blank when content is empty).
    expect(dialogBody(dialog).firstElementChild?.tagName).toBe('P')
  })

  it('shows the honest placeholder in the Terms modal when content is empty', async () => {
    const dialog = await openLegalModal('Terms of Service')
    expect(dialog.textContent).toContain('This content has not been configured yet')
    expect(dialogBody(dialog).firstElementChild?.tagName).toBe('P')
  })
})

describe('AppFooter legal modals — {{appName}} is HTML-escaped before entering legal HTML', () => {
  it('a markup-carrying appName renders inert, not as script/img tags', async () => {
    catalog['content.privacyPolicy'] = '<p>Privacy Policy for {{appName}}.</p>'
    const dialog = await openLegalModal('Privacy Policy', {
      appName: 'Acme<img src=x onerror=alert(1)><script>evil()</script>',
    })
    const body = dialogBody(dialog)
    const html = body.innerHTML
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img')
    // No live script/img element was created from the appName.
    expect(dialog.querySelector('script')).toBeNull()
    expect(dialog.querySelector('img')).toBeNull()
  })
})

describe('AppFooter legal modals — app-registered content renders as HTML', () => {
  it('renders registered privacy HTML instead of the placeholder', async () => {
    catalog['content.privacyPolicy'] = '<h2>Acme Privacy</h2><p>We collect nothing.</p>'
    const dialog = await openLegalModal('Privacy Policy')
    const body = dialogBody(dialog)
    // Registered content branch renders the raw HTML inside a <div>.
    expect(body.firstElementChild?.tagName).toBe('DIV')
    expect(body.firstElementChild?.innerHTML).toContain('<h2>Acme Privacy</h2>')
    // The placeholder must NOT appear once real content exists.
    expect(dialog.textContent).not.toContain('has not been configured yet')
  })

  it('interpolates {{appName}} into registered terms HTML', async () => {
    catalog['content.termsOfService'] = '<p>These terms govern {{appName}}.</p>'
    const dialog = await openLegalModal('Terms of Service')
    const body = dialogBody(dialog)
    expect(body.firstElementChild?.tagName).toBe('DIV')
    expect(body.firstElementChild?.innerHTML).toContain('These terms govern Acme.')
    expect(dialog.textContent).not.toContain('has not been configured yet')
  })
})
