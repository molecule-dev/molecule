// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `SecretRow` — a port of
 * `@molecule/app-secret-row-react/src/__tests__/secret-row.test.tsx`: the same
 * behavioral assertions, rendered with a real Svelte mount (jsdom).
 *
 * React's suite stubs the wired classmap, `useTranslation` and the UI
 * `Button`; this port stubs the classmap and bonds the real simple i18n
 * provider (empty dictionaries, whose `t` returns the `defaultValue`), and
 * renders the real Svelte `Button` over the stubbed map.
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// can assert which cm.* class was applied without a real bond — the same mock
// the React tests use, extended so `cm.button(…)` echoes its arguments.
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

import { SecretRow } from '../components.js'
import type { SecretRowData, SecretRowProps } from '../types.js'

/** The component mounted by the running test, torn down after each. */
let instance: ReturnType<typeof mount> | null = null

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = null
  document.body.innerHTML = ''
})

/** Renders a secret row with the given props and returns the markup it produced. */
const render = (props: SecretRowProps): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  instance = mount(SecretRow, { target: container, props })
  flushSync()
  // Svelte leaves empty comment markers around control-flow blocks; they draw
  // nothing, and the conformance normalizer drops them, so assertions read the
  // visible markup only.
  return container.innerHTML.replace(/<!---->/g, '')
}

const secret = (over: Partial<SecretRowData> = {}): SecretRowData => ({
  id: '1',
  key: 'STRIPE_API_KEY',
  value: 'sk_live_abcdef123456',
  ...over,
})

describe('SecretRow', () => {
  it('renders the secret key and description', () => {
    const markup = render({ secret: secret({ description: 'Stripe API key' }) })
    expect(markup).toContain('STRIPE_API_KEY')
    expect(markup).toContain('Stripe API key')
  })

  it('masks the value by default rather than showing it', () => {
    const markup = render({ secret: secret() })
    expect(markup).not.toContain('sk_live_abcdef123456')
    expect(markup).toContain('•')
  })

  it('renders the version label when present', () => {
    const markup = render({ secret: secret({ version: 3 }) })
    expect(markup).toContain('v3')
  })

  it('renders the expired badge when daysUntilRotation is negative', () => {
    const expired = render({ secret: secret({ daysUntilRotation: -2 }) })
    expect(expired).toContain('Expired')
    const fresh = render({ secret: secret({ daysUntilRotation: 30 }) })
    expect(fresh).not.toContain('Expired')
  })

  it('renders a rotation countdown when daysUntilRotation is zero or positive', () => {
    const soon = render({ secret: secret({ daysUntilRotation: 14 }) })
    expect(soon).toContain('Rotate in 14d')
    const dueToday = render({ secret: secret({ daysUntilRotation: 0 }) })
    expect(dueToday).toContain('Rotate in 0d')
    // Negative → expired, never a countdown.
    const expired = render({ secret: secret({ daysUntilRotation: -1 }) })
    expect(expired).not.toContain('Rotate in')
    // Field omitted → no rotation chip at all.
    const none = render({ secret: secret() })
    expect(none).not.toContain('Rotate in')
  })

  it('renders the last-rotated note when lastRotatedAt is provided', () => {
    const withDate = render({ secret: secret({ lastRotatedAt: '2026-01-02' }) })
    expect(withDate).toContain('Last rotated')
    expect(withDate).toContain('2026-01-02')
    const without = render({ secret: secret() })
    expect(without).not.toContain('Last rotated')
  })

  it('always renders Show and Copy buttons', () => {
    const markup = render({ secret: secret() })
    expect(markup).toContain('Show')
    expect(markup).toContain('Copy')
  })

  it('renders Rotate / Delete buttons only when their handlers are supplied', () => {
    const withActions = render({ secret: secret(), onRotate: () => {}, onDelete: () => {} })
    expect(withActions).toContain('Rotate')
    expect(withActions).toContain('Delete')
    const without = render({ secret: secret() })
    expect(without).not.toContain('Rotate')
    expect(without).not.toContain('Delete')
  })

  it('forwards className', () => {
    const markup = render({ secret: secret(), className: 'sr-cls' })
    expect(markup).toContain('sr-cls')
  })
})
