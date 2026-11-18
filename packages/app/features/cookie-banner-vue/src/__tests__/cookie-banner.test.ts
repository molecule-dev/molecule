// @vitest-environment jsdom
/**
 * Unit tests for the Vue `CookieBanner` — a port of
 * `@molecule/app-cookie-banner-react/src/__tests__/cookie-banner.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
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
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-button` / `data-switch` markers the React tests mock
// `@molecule/app-ui-react` with: a button carrying its children (its click
// handler and the details-list ARIA attrs fall through as attributes), and a
// checkbox carrying the `checked` state (its label/description ids fall
// through the same way).
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      setup(_props, { slots }) {
        return () => h('button', { 'data-button': '' }, slots.default?.())
      },
    }),
    Switch: defineComponent({
      name: 'Switch',
      props: { checked: { type: Boolean, default: false } },
      setup(props) {
        return () =>
          h('input', {
            type: 'checkbox',
            'data-switch': '',
            checked: props.checked,
            readonly: true,
          })
      },
    }),
  }
})

import { type App, createApp, defineComponent, h, nextTick } from 'vue'

import { CookieBanner } from '../CookieBanner.js'

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

/** Mounted apps, unmounted after each test. */
const mounted: App[] = []

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link CookieBanner} and returns its host element (click tests read
 * the live DOM through it).
 */
const mountBanner = (props: Record<string, unknown>): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(CookieBanner, props) }))
  app.mount(host)
  mounted.push(app)
  return host
}

/** Renders a {@link CookieBanner} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(CookieBanner, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

/**
 * Mounts the banner with the granular categories, opens the details and
 * returns the host element (Vue flushes on the next tick, so the open awaits
 * it).
 */
const renderOpen = async (props: Record<string, unknown> = {}): Promise<HTMLElement> => {
  const host = mountBanner({ categories, ...props })
  host.querySelector('button')!.click()
  await nextTick()
  return host
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

  it('each category switch is named by its category label', async () => {
    const host = await renderOpen()
    const switches = [...host.querySelectorAll('input[data-switch]')]
    expect(switches).toHaveLength(3)
    const labels = ['Essential', 'Analytics', 'Marketing']
    for (const [index, label] of labels.entries()) {
      const namedBy = switches[index]!.getAttribute('aria-labelledby')
      expect(namedBy).toBeTruthy()
      expect(document.getElementById(namedBy!)?.textContent).toBe(label)
    }
  })

  it('each category switch is described by its category description', async () => {
    const host = await renderOpen()
    const switches = [...host.querySelectorAll('input[data-switch]')]
    expect(
      document.getElementById(switches[0]!.getAttribute('aria-describedby')!)?.textContent,
    ).toBe('Required for the site to work.')
    expect(
      document.getElementById(switches[1]!.getAttribute('aria-describedby')!)?.textContent,
    ).toBe('Helps us improve.')
    expect(switches[2]!.getAttribute('aria-describedby')).toBeNull()
  })

  it('the details button names the list and reflects its state', async () => {
    const host = mountBanner({ categories })
    const details = host.querySelector('button')!
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(details.getAttribute('aria-controls')).toBeNull()
    details.click()
    await nextTick()
    expect(details.getAttribute('aria-expanded')).toBe('true')
    const listId = details.getAttribute('aria-controls')
    expect(listId).toBeTruthy()
    const list = document.getElementById(listId!)
    expect(list?.classList.contains('stack')).toBe(true)
    expect(list?.querySelectorAll('input[data-switch]')).toHaveLength(3)
  })

  it('the details button drops the list reference when the details hide', async () => {
    const host = await renderOpen()
    const details = host.querySelector('button')!
    details.click()
    await nextTick()
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(details.getAttribute('aria-controls')).toBeNull()
    expect(host.querySelectorAll('input[data-switch]')).toHaveLength(0)
  })
})
