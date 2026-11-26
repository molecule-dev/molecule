// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) =>
    createElement('button', { 'data-button': '', type: 'button', onClick }, children),
}))

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

import { copyTextWithFallback } from '@molecule/app-clipboard'

const { SecretRow } = await import('../SecretRow.js')
import type { SecretRowData } from '../SecretRow.js'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

/** The roots mounted for the interaction tests, unmounted after each test. */
const mountedRoots: Array<{ root: Root; container: HTMLElement }> = []

/** Mounts a SecretRow in jsdom and returns its container (clickable). */
const mountRow = async (props: { secret: SecretRowData }): Promise<HTMLElement> => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ root, container })
  await act(async () => {
    root.render(createElement(SecretRow, props))
  })
  return container
}

/** The button whose label equals `text`. */
const buttonWithText = (host: HTMLElement, text: string): HTMLButtonElement => {
  const match = [...host.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === text,
  )
  if (!match) throw new Error(`No button labelled "${text}"`)
  return match
}

afterEach(async () => {
  for (const { root } of mountedRoots.splice(0)) {
    await act(async () => {
      root.unmount()
    })
  }
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

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

  it('copies the value through the clipboard core when Copy is clicked', async () => {
    const host = await mountRow({ secret: secret() })
    await act(async () => {
      buttonWithText(host, 'Copy').click()
    })
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('sk_live_abcdef123456')
    expect(buttonWithText(host, 'Copied!').textContent?.trim()).toBe('Copied!')
  })

  it('shows no copied feedback when the clipboard core reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValueOnce(false)
    const host = await mountRow({ secret: secret() })
    await act(async () => {
      buttonWithText(host, 'Copy').click()
    })
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('sk_live_abcdef123456')
    expect(buttonWithText(host, 'Copy').textContent?.trim()).toBe('Copy')
    expect(host.textContent).not.toContain('Copied!')
  })
})
