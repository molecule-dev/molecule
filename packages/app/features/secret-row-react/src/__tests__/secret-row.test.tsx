import type { ReactNode } from 'react'
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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      // Mirror i18next `{{var}}` interpolation so tests can assert the rendered value.
      const template = opts?.defaultValue ?? key
      return template.replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        values && name in values ? String(values[name]) : `{{${name}}}`,
      )
    },
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
}))

const { SecretRow } = await import('../SecretRow.js')
import type { SecretRowData } from '../SecretRow.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

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

  it('renders a rotation countdown when daysUntilRotation is zero or positive', () => {
    const soon = html(createElement(SecretRow, { secret: secret({ daysUntilRotation: 14 }) }))
    expect(soon).toContain('Rotate in 14d')
    const dueToday = html(createElement(SecretRow, { secret: secret({ daysUntilRotation: 0 }) }))
    expect(dueToday).toContain('Rotate in 0d')
    // Negative → expired, never a countdown.
    const expired = html(createElement(SecretRow, { secret: secret({ daysUntilRotation: -1 }) }))
    expect(expired).not.toContain('Rotate in')
    // Field omitted → no rotation chip at all.
    const none = html(createElement(SecretRow, { secret: secret() }))
    expect(none).not.toContain('Rotate in')
  })

  it('renders the last-rotated note when lastRotatedAt is provided', () => {
    const withDate = html(
      createElement(SecretRow, { secret: secret({ lastRotatedAt: '2026-01-02' }) }),
    )
    expect(withDate).toContain('Last rotated')
    expect(withDate).toContain('2026-01-02')
    const without = html(createElement(SecretRow, { secret: secret() }))
    expect(without).not.toContain('Last rotated')
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
