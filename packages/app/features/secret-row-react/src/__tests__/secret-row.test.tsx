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
}))

const { SecretRow } = await import('../SecretRow.js')
import type { SecretRowData } from '../SecretRow.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const secret = (over: Partial<SecretRowData> = {}): SecretRowData => ({
  id: '1',
  key: 'STRIPE_API_KEY',
  value: 'sk_live_abcdef123456',
  ...over,
})

describe('SecretRow', () => {
  it('renders the secret key and description', () => {
    const markup = html(
      createElement(SecretRow, { secret: secret({ description: 'Stripe API key' }) }),
    )
    expect(markup).toContain('STRIPE_API_KEY')
    expect(markup).toContain('Stripe API key')
  })

  it('masks the value by default rather than showing it', () => {
    const markup = html(createElement(SecretRow, { secret: secret() }))
    expect(markup).not.toContain('sk_live_abcdef123456')
    expect(markup).toContain('•')
  })

  it('renders the version label when present', () => {
    const markup = html(createElement(SecretRow, { secret: secret({ version: 3 }) }))
    expect(markup).toContain('v3')
  })

  it('renders the expired badge when daysUntilRotation is negative', () => {
    const expired = html(createElement(SecretRow, { secret: secret({ daysUntilRotation: -2 }) }))
    expect(expired).toContain('Expired')
    const fresh = html(createElement(SecretRow, { secret: secret({ daysUntilRotation: 30 }) }))
    expect(fresh).not.toContain('Expired')
  })

  it('always renders Show and Copy buttons', () => {
    const markup = html(createElement(SecretRow, { secret: secret() }))
    expect(markup).toContain('Show')
    expect(markup).toContain('Copy')
  })

  it('renders Rotate / Delete buttons only when their handlers are supplied', () => {
    const withActions = html(
      createElement(SecretRow, { secret: secret(), onRotate: () => {}, onDelete: () => {} }),
    )
    expect(withActions).toContain('Rotate')
    expect(withActions).toContain('Delete')
    const without = html(createElement(SecretRow, { secret: secret() }))
    expect(without).not.toContain('Rotate')
    expect(without).not.toContain('Delete')
  })

  it('forwards className', () => {
    const markup = html(createElement(SecretRow, { secret: secret(), className: 'sr-cls' }))
    expect(markup).toContain('sr-cls')
  })
})
