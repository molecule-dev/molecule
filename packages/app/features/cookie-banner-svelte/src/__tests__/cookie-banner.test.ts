// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `CookieBanner` — a port of
 * `@molecule/app-cookie-banner-react/src/__tests__/cookie-banner.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `link`),
// so tests can assert which cm.* call was applied without a real bond — the
// same mock the React package's own tests use.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-button` / `data-switch` markers the React tests mock
// `@molecule/app-ui-react` with: a button carrying its children and a
// checkbox carrying the `checked` state it received.
vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Button } = await import('./stubs/ButtonStub.svelte')
  const { default: Switch } = await import('./stubs/SwitchStub.svelte')
  return { Button, Switch }
})

import { flushSync, mount, unmount } from 'svelte'

import { CookieBanner } from '../components.js'

/** The granular categories: one required, one described, one without a description. */
const categories = [
  {
    id: 'essential',
    label: 'Essential',
    description: 'Required for the site to work.',
    required: true,
  },
  { id: 'analytics', label: 'Analytics', description: 'Helps us improve.' },
  { id: 'marketing', label: 'Marketing' },
]

/** Mounted components, unmounted after each test. */
const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const component of mounted.splice(0)) void unmount(component)
  document.body.innerHTML = ''
})

/** Renders a {@link CookieBanner} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(CookieBanner, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(component)
  target.remove()
  return markup
}

/**
 * Mounts a {@link CookieBanner} and returns its target element (click tests
 * read the live DOM through it).
 */
const mountBanner = (props: Record<string, unknown>): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(CookieBanner, { target, props })
  flushSync()
  mounted.push(component)
  return target
}

/**
 * Mounts the banner with the granular categories and opens the details
 * (flushed synchronously), returning the target element.
 */
const renderOpen = (props: Record<string, unknown> = {}): HTMLElement => {
  const target = mountBanner({ categories, ...props })
  target.querySelector('button')!.click()
  flushSync()
  return target
}

describe('CookieBanner', () => {
  it('renders nothing when visible is false', () => {
    expect(render({ visible: false }).replace(/<!--.*?-->/g, '')).toBe('')
  })

  it('renders the default title and description', () => {
    const markup = render({})
    expect(markup).toContain('Cookie preferences')
    expect(markup).toContain('improve your experience')
  })

  it('honours a custom title and description', () => {
    const markup = render({ title: 'Cookies?', description: 'our own copy' })
    expect(markup).toContain('Cookies?')
    expect(markup).toContain('our own copy')
  })

  it('renders a "Learn more" policy link when policyHref is supplied', () => {
    const markup = render({ policyHref: '/privacy' })
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('Learn more')
  })

  it('always renders the accept and reject buttons', () => {
    const markup = render({})
    expect(markup).toContain('Accept all')
    expect(markup).toContain('Reject all')
  })

  it('renders the customize button only when categories are supplied', () => {
    const withCats = render({ categories: [{ id: 'analytics', label: 'Analytics' }] })
    expect(withCats).toContain('Customize')
    const without = render({})
    expect(without).not.toContain('Customize')
  })

  it('exposes a labelled dialog role and forwards className', () => {
    const markup = render({ className: 'cbn-cls' })
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('cbn-cls')
  })

  it('each category switch is named by its category label', () => {
    const target = renderOpen()
    const switches = [...target.querySelectorAll('input[data-switch]')]
    expect(switches).toHaveLength(3)
    const labels = ['Essential', 'Analytics', 'Marketing']
    for (const [index, label] of labels.entries()) {
      const namedBy = switches[index]!.getAttribute('aria-labelledby')
      expect(namedBy).toBeTruthy()
      expect(document.getElementById(namedBy!)?.textContent).toBe(label)
    }
  })

  it('each category switch is described by its category description', () => {
    const target = renderOpen()
    const switches = [...target.querySelectorAll('input[data-switch]')]
    expect(
      document.getElementById(switches[0]!.getAttribute('aria-describedby')!)?.textContent,
    ).toBe('Required for the site to work.')
    expect(
      document.getElementById(switches[1]!.getAttribute('aria-describedby')!)?.textContent,
    ).toBe('Helps us improve.')
    expect(switches[2]!.getAttribute('aria-describedby')).toBeNull()
  })

  it('the details button names the list and reflects its state', () => {
    const target = mountBanner({ categories })
    const details = target.querySelector('button')!
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(details.getAttribute('aria-controls')).toBeNull()
    details.click()
    flushSync()
    expect(details.getAttribute('aria-expanded')).toBe('true')
    const listId = details.getAttribute('aria-controls')
    expect(listId).toBeTruthy()
    const list = document.getElementById(listId!)
    expect(list?.classList.contains('stack')).toBe(true)
    expect(list?.querySelectorAll('input[data-switch]')).toHaveLength(3)
  })

  it('the details button drops the list reference when the details hide', () => {
    const target = renderOpen()
    const details = target.querySelector('button')!
    details.click()
    flushSync()
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(details.getAttribute('aria-controls')).toBeNull()
    expect(target.querySelectorAll('input[data-switch]')).toHaveLength(0)
  })
})
