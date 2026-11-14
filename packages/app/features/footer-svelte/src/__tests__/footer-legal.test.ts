// @vitest-environment jsdom
/**
 * Unit tests for `AppFooter`'s legal modals, ported from
 * `@molecule/app-footer-react`'s own legal suite: no silently-blank modal
 * (the placeholder), the `{{appName}}` interpolation is HTML-escaped before
 * entering the raw-HTML body, and app-registered content renders as HTML.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'
import { setMoleculeContext } from '@molecule/app-svelte'
import { createWebVersionProvider, setProvider as setVersionProvider } from '@molecule/app-version'

import AppFooter from '../AppFooter.svelte'

// A mutable i18n catalog the tests seed to simulate an app that registered
// real legal HTML — read through the provider at `t()` time (the provider
// keeps the object by reference), the same resolution order React's hoisted
// catalog mock exercised (bond value → inline defaultValue).
const catalog: Record<string, string> = {}

/** The i18n provider the footer mounts inside, with the test catalog as the English bond. */
const i18n = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: catalog },
  { code: 'es', name: 'Español', direction: 'ltr', translations: {} },
])

/** The router the current mount sits inside (React's react-router requirement). */
const router: Router = createMemoryRouter({ initialEntries: ['/'] })

/** The currently mounted instance, unmounted in {@link afterEach}. */
let instance: ReturnType<typeof mount> | null = null

// Like React's `useVersion` mock (`state: { version: '2.0.0' }`): a bonded
// web provider reporting version 2.0.0.
const versionProvider = createWebVersionProvider()
versionProvider.setCurrentVersion({ buildId: '', version: '2.0.0' })
setVersionProvider(versionProvider)

/**
 * Mounts `AppFooter` in a router + i18n context with the given app name.
 *
 * @param appName - The app name interpolated into the legal HTML.
 */
function mountFooter(appName = 'Acme'): void {
  instance = mount(Host, {
    target: document.body,
    props: {
      config: { router, i18n },
      setMoleculeContext,
      component: AppFooter as Component<Record<string, unknown>>,
      props: { appName, aboutHref: '/about' },
    },
  })
  flushSync()
}

/**
 * Opens the Privacy or Terms modal.
 *
 * @param label - The modal's footer button label.
 * @returns The open dialog.
 */
function openLegalModal(label: 'Privacy Policy' | 'Terms of Service'): HTMLElement {
  const button = [...document.body.querySelectorAll<HTMLButtonElement>('footer button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (!button) throw new Error(`no ${label} button in the footer`)
  button.click()
  flushSync()
  const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')
  if (!dialog) throw new Error(`${label} modal did not open`)
  return dialog
}

/**
 * The footer's prose node inside a real Modal: the body is the dialog's last
 * child (the header — title + close button — precedes it) and the prose node
 * is its first element child.
 *
 * @param dialog - The open dialog.
 * @returns The prose `<p>`/`<div>` the footer rendered.
 */
function proseElement(dialog: HTMLElement): Element {
  const body = dialog.lastElementChild
  if (!body?.firstElementChild) throw new Error('modal body is empty')
  return body.firstElementChild
}

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = null
  document.body.innerHTML = ''
  for (const key of Object.keys(catalog)) delete catalog[key]
})

describe('AppFooter legal modals — no silently-blank modal (empty content)', () => {
  it('shows the honest placeholder in the Privacy modal when content is empty', () => {
    mountFooter()
    const dialog = openLegalModal('Privacy Policy')
    // The modal is not blank — it carries the configured-placeholder message.
    expect(dialog.textContent).toContain('This content has not been configured yet')
    expect(dialog.textContent).toContain('app owner must provide it')
    expect((dialog.textContent ?? '').trim().length).toBeGreaterThan(0)
    // Placeholder branch renders the message as plain text in a <p> — NOT an
    // injected-HTML <div> (which would be blank when content is empty).
    expect(proseElement(dialog).tagName).toBe('P')
  })

  it('shows the honest placeholder in the Terms modal when content is empty', () => {
    mountFooter()
    const dialog = openLegalModal('Terms of Service')
    expect(dialog.textContent).toContain('This content has not been configured yet')
    expect(proseElement(dialog).tagName).toBe('P')
  })
})

describe('AppFooter legal modals — {{appName}} is HTML-escaped before entering legal HTML', () => {
  it('a markup-carrying appName renders inert, not as script/img tags', () => {
    catalog['content.privacyPolicy'] = '<p>Privacy Policy for {{appName}}.</p>'
    mountFooter('Acme<img src=x onerror=alert(1)><script>evil()</script>')
    const dialog = openLegalModal('Privacy Policy')
    const html = proseElement(dialog).innerHTML
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img')
    // No live script/img element was created from the appName.
    expect(dialog.querySelector('script')).toBeNull()
    expect(dialog.querySelector('img')).toBeNull()
  })
})

describe('AppFooter legal modals — app-registered content renders as HTML', () => {
  it('renders registered privacy HTML instead of the placeholder', () => {
    catalog['content.privacyPolicy'] = '<h2>Acme Privacy</h2><p>We collect nothing.</p>'
    mountFooter()
    const dialog = openLegalModal('Privacy Policy')
    // Registered content branch renders the raw HTML inside a <div>.
    expect(proseElement(dialog).tagName).toBe('DIV')
    expect(proseElement(dialog).innerHTML).toContain('<h2>Acme Privacy</h2>')
    // The placeholder must NOT appear once real content exists.
    expect(dialog.textContent).not.toContain('has not been configured yet')
  })

  it('interpolates {{appName}} into registered terms HTML', () => {
    catalog['content.termsOfService'] = '<p>These terms govern {{appName}}.</p>'
    mountFooter()
    const dialog = openLegalModal('Terms of Service')
    expect(proseElement(dialog).tagName).toBe('DIV')
    expect(proseElement(dialog).innerHTML).toContain('These terms govern Acme.')
    expect(dialog.textContent).not.toContain('has not been configured yet')
  })
})
