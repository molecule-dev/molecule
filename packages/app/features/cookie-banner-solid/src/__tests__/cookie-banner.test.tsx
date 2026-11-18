// @vitest-environment jsdom
/**
 * Unit tests for the Solid `CookieBanner` — a port of
 * `@molecule/app-cookie-banner-react/src/__tests__/cookie-banner.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-button` / `data-switch` markers the React tests mock
// `@molecule/app-ui-react` with: a button carrying its children, its click
// handler and the details-list ARIA state, and a checkbox carrying the
// `checked` state and the label/description ids it received.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    children?: JSX.Element
    onClick?: () => void
    'aria-expanded'?: boolean
    'aria-controls'?: string
  }) => (
    <button
      data-button=""
      onClick={props.onClick}
      aria-expanded={props['aria-expanded']}
      aria-controls={props['aria-controls']}
    >
      {props.children}
    </button>
  ),
  Switch: (props: {
    checked?: boolean
    'aria-labelledby'?: string
    'aria-describedby'?: string
  }) => (
    <input
      type="checkbox"
      data-switch=""
      checked={props.checked}
      readonly
      aria-labelledby={props['aria-labelledby']}
      aria-describedby={props['aria-describedby']}
    />
  ),
}))

import { CookieBanner } from '../CookieBanner.jsx'
import type { CookieBannerProps } from '../types.js'

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

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders a {@link CookieBanner} and returns the markup it produced. */
const renderMarkup = (props: Partial<CookieBannerProps>): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <CookieBanner {...props} />, container))
  return container.innerHTML
}

/**
 * Renders the banner with the granular categories and its details list opened
 * (Solid's signals update the DOM synchronously), returning the container.
 */
const renderOpen = (props: Partial<CookieBannerProps> = {}): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <CookieBanner {...{ ...props, categories }} />, container))
  container.querySelector('button')!.click()
  return container
}

describe('CookieBanner', () => {
  it('renders nothing when visible is false', () => {
    expect(renderMarkup({ visible: false }).replace(/<!--.*?-->/g, '')).toBe('')
  })

  it('renders the default title and description', () => {
    const markup = renderMarkup({})
    expect(markup).toContain('Cookie preferences')
    expect(markup).toContain('improve your experience')
  })

  it('honours a custom title and description', () => {
    const markup = renderMarkup({ title: 'Cookies?', description: 'our own copy' })
    expect(markup).toContain('Cookies?')
    expect(markup).toContain('our own copy')
  })

  it('renders a "Learn more" policy link when policyHref is supplied', () => {
    const markup = renderMarkup({ policyHref: '/privacy' })
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('Learn more')
  })

  it('always renders the accept and reject buttons', () => {
    const markup = renderMarkup({})
    expect(markup).toContain('Accept all')
    expect(markup).toContain('Reject all')
  })

  it('renders the customize button only when categories are supplied', () => {
    const withCats = renderMarkup({ categories: [{ id: 'analytics', label: 'Analytics' }] })
    expect(withCats).toContain('Customize')
    const without = renderMarkup({})
    expect(without).not.toContain('Customize')
  })

  it('exposes a labelled dialog role and forwards className', () => {
    const markup = renderMarkup({ className: 'cbn-cls' })
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('cbn-cls')
  })

  it('each category switch is named by its category label', () => {
    const container = renderOpen()
    const switches = [...container.querySelectorAll('input[data-switch]')]
    expect(switches).toHaveLength(3)
    const labels = ['Essential', 'Analytics', 'Marketing']
    for (const [index, label] of labels.entries()) {
      const namedBy = switches[index]!.getAttribute('aria-labelledby')
      expect(namedBy).toBeTruthy()
      expect(document.getElementById(namedBy!)?.textContent).toBe(label)
    }
  })

  it('each category switch is described by its category description', () => {
    const container = renderOpen()
    const switches = [...container.querySelectorAll('input[data-switch]')]
    expect(
      document.getElementById(switches[0]!.getAttribute('aria-describedby')!)?.textContent,
    ).toBe('Required for the site to work.')
    expect(
      document.getElementById(switches[1]!.getAttribute('aria-describedby')!)?.textContent,
    ).toBe('Helps us improve.')
    expect(switches[2]!.getAttribute('aria-describedby')).toBeNull()
  })

  it('the details button names the list and reflects its state', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    disposers.push(render(() => <CookieBanner categories={categories} />, container))
    const details = container.querySelector('button')!
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(details.getAttribute('aria-controls')).toBeNull()
    details.click()
    expect(details.getAttribute('aria-expanded')).toBe('true')
    const listId = details.getAttribute('aria-controls')
    expect(listId).toBeTruthy()
    const list = document.getElementById(listId!)
    expect(list?.classList.contains('stack')).toBe(true)
    expect(list?.querySelectorAll('input[data-switch]')).toHaveLength(3)
  })

  it('the details button drops the list reference when the details hide', () => {
    const container = renderOpen()
    const details = container.querySelector('button')!
    details.click()
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(details.getAttribute('aria-controls')).toBeNull()
    expect(container.querySelectorAll('input[data-switch]')).toHaveLength(0)
  })
})
