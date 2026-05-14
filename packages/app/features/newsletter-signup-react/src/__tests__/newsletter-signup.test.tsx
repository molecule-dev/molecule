import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
  Input: ({
    placeholder,
    ['aria-label']: ariaLabel,
  }: {
    placeholder?: string
    'aria-label'?: string
  }) => createElement('input', { 'data-input': '', placeholder, 'aria-label': ariaLabel }),
}))

const { NewsletterSignup } = await import('../NewsletterSignup.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('NewsletterSignup', () => {
  it('renders the email input and subscribe button', () => {
    const markup = html(createElement(NewsletterSignup, { onSubscribe: () => {} }))
    expect(markup).toContain('aria-label="Email"')
    expect(markup).toContain('Subscribe')
  })

  it('renders the default email placeholder and honours a custom one', () => {
    expect(html(createElement(NewsletterSignup, { onSubscribe: () => {} }))).toContain(
      'placeholder="Your email"',
    )
    const custom = html(
      createElement(NewsletterSignup, { onSubscribe: () => {}, placeholder: 'name@co.com' }),
    )
    expect(custom).toContain('placeholder="name@co.com"')
  })

  it('renders the title and description when present and omits them otherwise', () => {
    const full = html(
      createElement(NewsletterSignup, {
        onSubscribe: () => {},
        title: 'Stay in the loop',
        description: 'monthly digest',
      }),
    )
    expect(full).toContain('Stay in the loop')
    expect(full).toContain('monthly digest')
    const bare = html(createElement(NewsletterSignup, { onSubscribe: () => {} }))
    expect(bare).not.toContain('<h4')
  })

  it('honours a custom buttonLabel', () => {
    const markup = html(
      createElement(NewsletterSignup, { onSubscribe: () => {}, buttonLabel: 'Join now' }),
    )
    expect(markup).toContain('Join now')
    expect(markup).not.toContain('Subscribe')
  })

  it('forwards className onto the form', () => {
    const markup = html(
      createElement(NewsletterSignup, { onSubscribe: () => {}, className: 'ns-cls' }),
    )
    expect(markup).toContain('ns-cls')
  })
})
