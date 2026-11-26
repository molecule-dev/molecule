// @vitest-environment jsdom
/**
 * Unit tests for the Solid `SecretRow` — a port of
 * `@molecule/app-secret-row-react/src/__tests__/secret-row.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * React's suite stubs the wired classmap, `useTranslation` and the UI
 * `Button`; this port stubs the classmap and bonds the real simple i18n
 * provider (empty dictionaries, whose `t` returns the `defaultValue`), and
 * renders the real Solid `Button` over the stubbed map.
 */

import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// can assert which cm.* class was applied without a real bond — the same mock
// the React tests use, extended so `cm.button(…)` echoes its arguments.
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
        if (prop === 'button') {
          return (args: Record<string, unknown>) =>
            `btn-${args.variant}-${args.color}-${args.size}${args.fullWidth ? '-full' : ''}`
        }
        const token = String(prop)
        return (...args: unknown[]) => {
          const arg = args.filter((a) => a != null && a !== '').join('-')
          return arg.length > 0 ? `${token}-${arg}` : token
        }
      },
    }
    return new Proxy({}, handler)
  },
}))

// The bonded provider `useTranslation()` falls back to (React's
// `useTranslation` contract): empty dictionaries, so every `t` returns its
// English defaultValue.
setI18nProvider(
  createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ]),
)

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

const { SecretRow } = await import('../SecretRow.jsx')

import type { SecretRowData, SecretRowProps } from '../types.js'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders a {@link SecretRow} and returns the markup it produced. */
const renderRow = (props: SecretRowProps): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <SecretRow {...props} />, container))
  return container.innerHTML
}

const secret = (over: Partial<SecretRowData> = {}): SecretRowData => ({
  id: '1',
  key: 'STRIPE_API_KEY',
  value: 'sk_live_abcdef123456',
  ...over,
})

/** Mounts a SecretRow and returns its container (clickable). */
const mountRow = (props: SecretRowProps): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <SecretRow {...props} />, container))
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

/** Settles every pending microtask, so the copy promise and its render ran. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

describe('SecretRow', () => {
  it('renders the secret key and description', () => {
    const markup = renderRow({ secret: secret({ description: 'Stripe API key' }) })
    expect(markup).toContain('STRIPE_API_KEY')
    expect(markup).toContain('Stripe API key')
  })

  it('masks the value by default rather than showing it', () => {
    const markup = renderRow({ secret: secret() })
    expect(markup).not.toContain('sk_live_abcdef123456')
    expect(markup).toContain('•')
  })

  it('renders the version label when present', () => {
    const markup = renderRow({ secret: secret({ version: 3 }) })
    expect(markup).toContain('v3')
  })

  it('renders the expired badge when daysUntilRotation is negative', () => {
    const expired = renderRow({ secret: secret({ daysUntilRotation: -2 }) })
    expect(expired).toContain('Expired')
    const fresh = renderRow({ secret: secret({ daysUntilRotation: 30 }) })
    expect(fresh).not.toContain('Expired')
  })

  it('renders a rotation countdown when daysUntilRotation is zero or positive', () => {
    const soon = renderRow({ secret: secret({ daysUntilRotation: 14 }) })
    expect(soon).toContain('Rotate in 14d')
    const dueToday = renderRow({ secret: secret({ daysUntilRotation: 0 }) })
    expect(dueToday).toContain('Rotate in 0d')
    // Negative → expired, never a countdown.
    const expired = renderRow({ secret: secret({ daysUntilRotation: -1 }) })
    expect(expired).not.toContain('Rotate in')
    // Field omitted → no rotation chip at all.
    const none = renderRow({ secret: secret() })
    expect(none).not.toContain('Rotate in')
  })

  it('renders the last-rotated note when lastRotatedAt is provided', () => {
    const withDate = renderRow({ secret: secret({ lastRotatedAt: '2026-01-02' }) })
    expect(withDate).toContain('Last rotated')
    expect(withDate).toContain('2026-01-02')
    const without = renderRow({ secret: secret() })
    expect(without).not.toContain('Last rotated')
  })

  it('always renders Show and Copy buttons', () => {
    const markup = renderRow({ secret: secret() })
    expect(markup).toContain('Show')
    expect(markup).toContain('Copy')
  })

  it('renders Rotate / Delete buttons only when their handlers are supplied', () => {
    const withActions = renderRow({
      secret: secret(),
      onRotate: () => {},
      onDelete: () => {},
    })
    expect(withActions).toContain('Rotate')
    expect(withActions).toContain('Delete')
    const without = renderRow({ secret: secret() })
    expect(without).not.toContain('Rotate')
    expect(without).not.toContain('Delete')
  })

  it('forwards className', () => {
    const markup = renderRow({ secret: secret(), className: 'sr-cls' })
    expect(markup).toContain('sr-cls')
  })

  it('copies the value through the clipboard core when Copy is clicked', async () => {
    const host = mountRow({ secret: secret() })
    buttonWithText(host, 'Copy').click()
    await flush()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('sk_live_abcdef123456')
    expect(buttonWithText(host, 'Copied!').textContent?.trim()).toBe('Copied!')
  })

  it('shows no copied feedback when the clipboard core reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValueOnce(false)
    const host = mountRow({ secret: secret() })
    buttonWithText(host, 'Copy').click()
    await flush()
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('sk_live_abcdef123456')
    expect(buttonWithText(host, 'Copy').textContent?.trim()).toBe('Copy')
    expect(host.textContent).not.toContain('Copied!')
  })
})
