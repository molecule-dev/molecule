import { createElement } from 'react'
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

vi.mock('@molecule/app-ui-react', () => ({
  Avatar: ({ src, name }: { src?: string; name?: string }) =>
    createElement('img', { 'data-avatar': src ?? '', 'data-avatar-name': name ?? '' }),
}))

const { ContactDisplay } = await import('../ContactDisplay.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const contact = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+15551234',
  role: 'CTO',
  company: 'Acme Inc.',
  address: '123 Main St',
}

describe('ContactDisplay', () => {
  it('renders the name and role', () => {
    const markup = html(createElement(ContactDisplay, { contact }))
    expect(markup).toContain('Jane Doe')
    expect(markup).toContain('CTO')
  })

  it('renders the avatar carrying the contact name', () => {
    const markup = html(createElement(ContactDisplay, { contact }))
    expect(markup).toContain('data-avatar-name="Jane Doe"')
  })

  it('renders email and phone as mailto/tel links in the card layout', () => {
    const markup = html(createElement(ContactDisplay, { contact }))
    expect(markup).toContain('href="mailto:jane@example.com"')
    expect(markup).toContain('href="tel:+15551234"')
    expect(markup).toContain('123 Main St')
  })

  it('hides email/phone/address in the compact layout', () => {
    const markup = html(createElement(ContactDisplay, { contact, layout: 'compact' }))
    expect(markup).not.toContain('mailto:')
    expect(markup).not.toContain('tel:')
    expect(markup).toContain('Jane Doe')
  })

  it('renders the company', () => {
    const markup = html(createElement(ContactDisplay, { contact }))
    expect(markup).toContain('Acme Inc.')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = html(createElement(ContactDisplay, { contact, onClick: () => {} }))
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(ContactDisplay, { contact }))
    expect(plain).not.toContain('cursorPointer')
  })

  it('renders the actions slot and forwards className', () => {
    const markup = html(
      createElement(ContactDisplay, {
        contact,
        actions: createElement('button', { 'data-actions': '' }),
        className: 'cd-cls',
      }),
    )
    expect(markup).toContain('data-actions=""')
    expect(markup).toContain('cd-cls')
  })
})
