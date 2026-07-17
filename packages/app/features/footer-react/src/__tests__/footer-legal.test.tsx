// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A mutable i18n catalog the tests can seed to simulate an app that registered
// real legal HTML. Hoisted so the `vi.mock` factory below can reference it.
const { catalog } = vi.hoisted(() => ({ catalog: {} as Record<string, string> }))

// Proxy ClassMap echoing each accessed member back as its token (e.g. `prose`),
// so tests can assert which cm.* class was applied without a real bond.
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

// `t()` consults the seeded catalog first, then the inline defaultValue — the
// same resolution order the real i18n provider uses (bond value → fallback).
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let out = key in catalog ? catalog[key] : (opts?.defaultValue ?? key)
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replaceAll(`{{${k}}}`, String(v))
      return out
    },
    locale: 'en',
    setLocale: () => {},
    locales: [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
    ],
  }),
  useVersion: () => ({ state: { version: '2.0.0' } }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Icon: ({ name }: { name?: string }) => createElement('span', { 'data-icon': name }),
  // Render children only when open, like the real Modal — so a closed modal has
  // no body and an opened one exposes exactly what the footer put inside it.
  Modal: ({ open, children }: { open: boolean; children?: ReactNode }) =>
    open ? createElement('div', { 'data-modal': '' }, children) : null,
}))

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement('a', { href: to, 'data-link': '' }, children),
}))

const { AppFooter } = await import('../AppFooter.js')

afterEach(() => {
  cleanup()
  for (const k of Object.keys(catalog)) delete catalog[k]
})

/** Open the Privacy or Terms modal and return the rendered modal element. */
function openLegalModal(label: 'Privacy Policy' | 'Terms of Service'): HTMLElement {
  const { container, getByRole } = render(
    createElement(AppFooter, { appName: 'Acme', aboutHref: '/about' }),
  )
  fireEvent.click(getByRole('button', { name: label }))
  const modal = container.querySelector<HTMLElement>('[data-modal]')
  if (!modal) throw new Error(`${label} modal did not open`)
  return modal
}

describe('AppFooter legal modals — no silently-blank modal (empty content)', () => {
  it('shows the honest placeholder in the Privacy modal when content is empty', () => {
    const modal = openLegalModal('Privacy Policy')
    // The modal is not blank — it carries the configured-placeholder message.
    expect(modal.textContent).toContain('This content has not been configured yet')
    expect(modal.textContent).toContain('app owner must provide it')
    expect((modal.textContent ?? '').trim().length).toBeGreaterThan(0)
    // Placeholder branch renders the message as plain text in a <p> — NOT an
    // injected-HTML <div> (which would be blank when content is empty).
    expect(modal.firstElementChild?.tagName).toBe('P')
  })

  it('shows the honest placeholder in the Terms modal when content is empty', () => {
    const modal = openLegalModal('Terms of Service')
    expect(modal.textContent).toContain('This content has not been configured yet')
    expect(modal.firstElementChild?.tagName).toBe('P')
  })
})

describe('AppFooter legal modals — app-registered content renders as HTML', () => {
  it('renders registered privacy HTML instead of the placeholder', () => {
    catalog['content.privacyPolicy'] = '<h2>Acme Privacy</h2><p>We collect nothing.</p>'
    const modal = openLegalModal('Privacy Policy')
    // Registered content branch renders the raw HTML inside a <div>.
    expect(modal.firstElementChild?.tagName).toBe('DIV')
    expect(modal.firstElementChild?.innerHTML).toContain('<h2>Acme Privacy</h2>')
    // The placeholder must NOT appear once real content exists.
    expect(modal.textContent).not.toContain('has not been configured yet')
  })

  it('interpolates {{appName}} into registered terms HTML', () => {
    catalog['content.termsOfService'] = '<p>These terms govern {{appName}}.</p>'
    const modal = openLegalModal('Terms of Service')
    expect(modal.firstElementChild?.tagName).toBe('DIV')
    expect(modal.firstElementChild?.innerHTML).toContain('These terms govern Acme.')
    expect(modal.textContent).not.toContain('has not been configured yet')
  })
})
