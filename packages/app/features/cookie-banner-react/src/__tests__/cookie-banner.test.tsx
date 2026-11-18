// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    onClick,
    'aria-expanded': ariaExpanded,
    'aria-controls': ariaControls,
  }: {
    children?: ReactNode
    onClick?: () => void
    'aria-expanded'?: boolean
    'aria-controls'?: string
  }) =>
    createElement(
      'button',
      { 'data-button': '', onClick, 'aria-expanded': ariaExpanded, 'aria-controls': ariaControls },
      children,
    ),
  Switch: ({
    checked,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
  }: {
    checked?: boolean
    'aria-labelledby'?: string
    'aria-describedby'?: string
  }) =>
    createElement('input', {
      type: 'checkbox',
      'data-switch': '',
      checked,
      readOnly: true,
      'aria-labelledby': labelledBy,
      'aria-describedby': describedBy,
    }),
}))

const { CookieBanner } = await import('../CookieBanner.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

afterEach(cleanup)

/**
 * Renders the banner with the granular categories and its details list opened
 * (the string renderer cannot fire events), returning the container.
 */
const renderOpen = (
  props: Parameters<typeof CookieBanner>[0],
): ReturnType<typeof render>['container'] => {
  const { container } = render(createElement(CookieBanner, { categories, ...props }))
  fireEvent.click(container.querySelector('button')!)
  return container
}

/** The categories of the granular mode: one required, two optional, one with no description. */
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

describe('CookieBanner', () => {
  it('renders nothing when visible is false', () => {
    expect(html(createElement(CookieBanner, { visible: false }))).toBe('')
  })

  it('renders the default title and description', () => {
    const markup = html(createElement(CookieBanner, {}))
    expect(markup).toContain('Cookie preferences')
    expect(markup).toContain('improve your experience')
  })

  it('honours a custom title and description', () => {
    const markup = html(
      createElement(CookieBanner, { title: 'Cookies?', description: 'our own copy' }),
    )
    expect(markup).toContain('Cookies?')
    expect(markup).toContain('our own copy')
  })

  it('renders a "Learn more" policy link when policyHref is supplied', () => {
    const markup = html(createElement(CookieBanner, { policyHref: '/privacy' }))
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('Learn more')
  })

  it('always renders the accept and reject buttons', () => {
    const markup = html(createElement(CookieBanner, {}))
    expect(markup).toContain('Accept all')
    expect(markup).toContain('Reject all')
  })

  it('renders the customize button only when categories are supplied', () => {
    const withCats = html(
      createElement(CookieBanner, {
        categories: [{ id: 'analytics', label: 'Analytics' }],
      }),
    )
    expect(withCats).toContain('Customize')
    const without = html(createElement(CookieBanner, {}))
    expect(without).not.toContain('Customize')
  })

  it('exposes a labelled dialog role and forwards className', () => {
    const markup = html(createElement(CookieBanner, { className: 'cbn-cls' }))
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('cbn-cls')
  })

  it('each category switch is named by its category label', () => {
    const container = renderOpen({})
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
    const container = renderOpen({})
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
    const { container } = render(createElement(CookieBanner, { categories }))
    const details = container.querySelector('button')!
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(details.getAttribute('aria-controls')).toBeNull()
    fireEvent.click(details)
    expect(details.getAttribute('aria-expanded')).toBe('true')
    const listId = details.getAttribute('aria-controls')
    expect(listId).toBeTruthy()
    const list = document.getElementById(listId!)
    expect(list?.classList.contains('stack')).toBe(true)
    expect(list?.querySelectorAll('input[data-switch]')).toHaveLength(3)
  })

  it('the details button drops the list reference when the details hide', () => {
    const { container } = render(createElement(CookieBanner, { categories }))
    const details = container.querySelector('button')!
    fireEvent.click(details)
    fireEvent.click(details)
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(details.getAttribute('aria-controls')).toBeNull()
    expect(container.querySelectorAll('input[data-switch]')).toHaveLength(0)
  })
})
