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
  Input: ({ ['aria-label']: ariaLabel }: { 'aria-label'?: string }) =>
    createElement('input', { 'data-input': '', 'aria-label': ariaLabel }),
  Textarea: ({ ['aria-label']: ariaLabel }: { 'aria-label'?: string }) =>
    createElement('textarea', { 'data-textarea': '', 'aria-label': ariaLabel }),
}))

const { ContactForm } = await import('../ContactForm.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('ContactForm', () => {
  it('renders the name, email, and message fields', () => {
    const markup = html(createElement(ContactForm, { onSubmit: () => {} }))
    expect(markup).toContain('aria-label="Name"')
    expect(markup).toContain('aria-label="Email"')
    expect(markup).toContain('aria-label="Message"')
  })

  it('renders the title and description when present and omits the header otherwise', () => {
    const withHeader = html(
      createElement(ContactForm, {
        onSubmit: () => {},
        title: 'Contact us',
        description: 'we reply fast',
      }),
    )
    expect(withHeader).toContain('Contact us')
    expect(withHeader).toContain('we reply fast')
    const without = html(createElement(ContactForm, { onSubmit: () => {} }))
    expect(without).not.toContain('<header')
  })

  it('renders the default submit label', () => {
    const markup = html(createElement(ContactForm, { onSubmit: () => {} }))
    expect(markup).toContain('Send message')
  })

  it('honours a custom submitLabel', () => {
    const markup = html(
      createElement(ContactForm, { onSubmit: () => {}, submitLabel: 'Get in touch' }),
    )
    expect(markup).toContain('Get in touch')
    expect(markup).not.toContain('Send message')
  })

  it('renders the extraFields slot', () => {
    const markup = html(
      createElement(ContactForm, {
        onSubmit: () => {},
        extraFields: createElement('input', { 'data-extra': '' }),
      }),
    )
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className onto the form', () => {
    const markup = html(createElement(ContactForm, { onSubmit: () => {}, className: 'cf-cls' }))
    expect(markup).toContain('cf-cls')
  })
})
