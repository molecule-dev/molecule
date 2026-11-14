// @vitest-environment jsdom
/**
 * Unit tests for `AppFooter`, ported from `@molecule/app-footer-react`'s own
 * suite: the same behavioral assertions, rendered with a real mount (jsdom)
 * and the bonded ClassMap. React's `data-link` marker assertion becomes the
 * behavioral contract it stands for — an internal About link navigates
 * in-app through the router on an unmodified primary click.
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

/** The i18n provider every footer mount sits inside (React's I18nProvider requirement). */
const i18n = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  { code: 'es', name: 'Español', direction: 'ltr', translations: {} },
])

/** The router the current mount sits inside; recreated per test so each starts at `/`. */
let router: Router = createMemoryRouter({ initialEntries: ['/'] })

/** The currently mounted instance, unmounted in {@link afterEach}. */
let instance: ReturnType<typeof mount> | null = null

// Like React's `useVersion` mock (`state: { version: '2.0.0' }`): a bonded
// web provider reporting version 2.0.0.
const versionProvider = createWebVersionProvider()
versionProvider.setCurrentVersion({ buildId: '', version: '2.0.0' })
setVersionProvider(versionProvider)

/**
 * Mounts `AppFooter` in a router + i18n context, the way an app wires it.
 *
 * @param props - The footer props.
 * @returns The rendered `<footer>` and the router backing the mount.
 */
function render(props: Record<string, unknown> = {}): {
  footer: HTMLElement | null
  router: Router
} {
  router = createMemoryRouter({ initialEntries: ['/'] })
  instance = mount(Host, {
    target: document.body,
    props: {
      config: { router, i18n },
      setMoleculeContext,
      component: AppFooter as Component<Record<string, unknown>>,
      props,
    },
  })
  flushSync()
  return { footer: document.body.querySelector('footer'), router }
}

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = null
  document.body.innerHTML = ''
})

describe('AppFooter', () => {
  it('renders the About link with the interpolated app name', async () => {
    const { footer } = render({ appName: 'Acme', aboutHref: '/about' })
    expect(footer?.textContent).toContain('About Acme')
  })

  it('renders an external About href as a target=_blank anchor', async () => {
    const { footer } = render({ appName: 'Acme', aboutHref: 'https://acme.com' })
    const anchor = footer?.querySelector('a[href="https://acme.com"]')
    expect(anchor).not.toBeNull()
    expect(anchor?.getAttribute('target')).toBe('_blank')
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders an internal About href as a router Link', async () => {
    const { footer, router: mountedRouter } = render({ appName: 'Acme', aboutHref: '/about' })
    const anchor = footer?.querySelector<HTMLAnchorElement>('a[href="/about"]')
    expect(anchor).not.toBeNull()
    // React asserts its react-router mock's `data-link` marker; the Svelte
    // binding's `Link` renders a plain `<a href>` with the router's click
    // handler and no marker attribute, so the same contract is asserted
    // behaviorally: an unmodified primary click is react-router's in-app
    // navigation case — the default is prevented and the router moves to
    // the href.
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    anchor?.dispatchEvent(event)
    flushSync()
    expect(event.defaultPrevented).toBe(true)
    const location = mountedRouter.getLocation()
    expect(`${location.pathname}${location.search}`).toBe('/about')
  })

  it('renders Privacy/Terms as buttons in modal mode', async () => {
    const { footer } = render({ appName: 'Acme', aboutHref: '/about' })
    const labels = [...(footer?.querySelectorAll('button') ?? [])].map((button) =>
      button.textContent?.trim(),
    )
    expect(labels).toContain('Privacy Policy')
    expect(labels).toContain('Terms of Service')
  })

  it('renders Privacy/Terms as router Links in route mode', async () => {
    const { footer } = render({ appName: 'Acme', aboutHref: '/about', legalMode: 'route' })
    expect(footer?.querySelector('a[href="/privacy"]')).not.toBeNull()
    expect(footer?.querySelector('a[href="/terms"]')).not.toBeNull()
  })

  it('renders the language button and the version string', async () => {
    const { footer } = render({ appName: 'Acme', aboutHref: '/about' })
    const languageButton = footer?.querySelector('button[aria-label="Language"]')
    expect(languageButton).not.toBeNull()
    // The globe icon renders as the bonded SVG glyph.
    expect(languageButton?.querySelector('svg')).not.toBeNull()
    expect(languageButton?.textContent).toContain('English')
    expect(footer?.textContent).toContain('v2.0.0')
  })

  it('keeps the privacy/terms modals closed initially', async () => {
    render({ appName: 'Acme', aboutHref: '/about' })
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('sets data-mol-id and forwards className', async () => {
    const { footer } = render({
      appName: 'Acme',
      aboutHref: '/about',
      dataMolId: 'footer-x',
      className: 'ft-cls',
    })
    expect(footer?.getAttribute('data-mol-id')).toBe('footer-x')
    expect(footer?.getAttribute('class')).toContain('ft-cls')
  })
})
