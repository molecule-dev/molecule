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
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
  Card: ({
    children,
    className,
    ['data-mol-id']: molId,
  }: {
    children?: ReactNode
    className?: string
    'data-mol-id'?: string
  }) => createElement('div', { 'data-card': '', 'data-mol-id': molId, className }, children),
  Switch: ({ checked }: { checked?: boolean }) =>
    createElement('input', { type: 'checkbox', 'data-switch': '', checked, readOnly: true }),
}))

const { ShareLinkCard } = await import('../ShareLinkCard.js')
const { CopyLinkField } = await import('../CopyLinkField.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', () => {
    const markup = html(createElement(CopyLinkField, { value: 'https://x.test/abc' }))
    expect(markup).toContain('value="https://x.test/abc"')
    expect(markup).toContain('readOnly')
  })

  it('renders the Copy button with its default label', () => {
    const markup = html(createElement(CopyLinkField, { value: 'https://x.test' }))
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('forwards className', () => {
    const markup = html(createElement(CopyLinkField, { value: 'u', className: 'clf-cls' }))
    expect(markup).toContain('clf-cls')
  })
})

describe('ShareLinkCard', () => {
  it('renders the title in an <h3> and the description', () => {
    const markup = html(
      createElement(ShareLinkCard, { url: 'u', title: 'Share this', description: 'desc-x' }),
    )
    expect(markup).toContain('<h3')
    expect(markup).toContain('Share this')
    expect(markup).toContain('desc-x')
  })

  it('omits the header when neither title nor description is given', () => {
    const markup = html(createElement(ShareLinkCard, { url: 'u' }))
    expect(markup).not.toContain('<header')
  })

  it('renders the CopyLinkField carrying the url', () => {
    const markup = html(createElement(ShareLinkCard, { url: 'https://x.test/share' }))
    expect(markup).toContain('value="https://x.test/share"')
  })

  it('renders the QR slot only when showQR and qr are both set', () => {
    const shown = html(
      createElement(ShareLinkCard, {
        url: 'u',
        showQR: true,
        qr: createElement('svg', { 'data-qr': '' }),
      }),
    )
    expect(shown).toContain('data-qr=""')
    const hidden = html(
      createElement(ShareLinkCard, { url: 'u', qr: createElement('svg', { 'data-qr': '' }) }),
    )
    expect(hidden).not.toContain('data-qr')
  })

  it('renders the password-protect toggle row with the default label when configured', () => {
    const markup = html(
      createElement(ShareLinkCard, {
        url: 'u',
        passwordProtect: { enabled: false, onChange: () => {} },
      }),
    )
    expect(markup).toContain('data-switch=""')
    expect(markup).toContain('Password protect')
  })

  it('honours a custom password-protect label', () => {
    const markup = html(
      createElement(ShareLinkCard, {
        url: 'u',
        passwordProtect: { enabled: true, onChange: () => {}, label: 'Require a password' },
      }),
    )
    expect(markup).toContain('Require a password')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = html(
      createElement(ShareLinkCard, { url: 'u', dataMolId: 'share-x', className: 'slc-cls' }),
    )
    expect(markup).toContain('data-mol-id="share-x"')
    expect(markup).toContain('slc-cls')
  })
})
