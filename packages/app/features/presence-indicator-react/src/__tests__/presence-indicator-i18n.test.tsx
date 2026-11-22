// @vitest-environment jsdom
/**
 * PresenceDot's accessible label goes through i18n, and follows a locale
 * switch.
 *
 * The label used to be a template literal (`Presence: ${status}`) built in the
 * JSX, which no provider could ever translate or re-render. It now flows
 * through `useTranslation()` from `@molecule/app-react` — one key for the
 * label and one key per status word — which subscribes through
 * `useSyncExternalStore`, so the dot re-renders on a locale switch. A provider
 * whose `t` marks every string proves a default that bypassed `t()`.
 *
 * @module
 */
import { act, createElement, type ReactElement, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

// Class tokens echo their own name — the same mock the other tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .map((c) => (typeof c === 'function' ? c() : c))
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : () => String(prop),
      },
    ),
}))

// The provider's locale, switchable from the tests (the hook re-renders
// through the store subscription, the way the real useTranslation does).
const i18n = vi.hoisted(() => ({ locale: 'en', listeners: new Set<() => void>() }))

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => {
    useSyncExternalStore(
      (onChange) => {
        i18n.listeners.add(onChange)
        return () => {
          i18n.listeners.delete(onChange)
        }
      },
      () => i18n.locale,
      () => i18n.locale,
    )
    return {
      t: (key: string, values?: Record<string, unknown>) =>
        values?.status === undefined
          ? `«${i18n.locale}:${key}»`
          : `«${i18n.locale}:${key}»⟨${values.status}⟩`,
    }
  },
}))

const { PresenceDot } = await import('../PresenceDot.js')

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  i18n.locale = 'en'
})

/**
 * Mounts a component in jsdom, kept until the test's cleanup so a locale
 * switch re-renders in place.
 *
 * @param element - The element to render.
 * @returns The container.
 */
async function mount(element: ReactElement): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(element)
  })
  return host
}

/**
 * Switches the mock provider's locale and flushes the re-render.
 *
 * @param locale - The locale to switch to.
 */
async function switchLocale(locale: string): Promise<void> {
  await act(async () => {
    i18n.locale = locale
    i18n.listeners.forEach((listener) => listener())
  })
}

describe('PresenceDot i18n', () => {
  it('takes the presence label through t when no ariaLabel is given', async () => {
    const container = await mount(createElement(PresenceDot, { status: 'online' }))
    const dot = container.querySelector('[role="status"]')
    expect(dot?.getAttribute('aria-label')).toBe(
      '«en:presenceIndicator.aria.presence»⟨«en:presenceIndicator.status.online»⟩',
    )
  })

  it('lets an explicit ariaLabel prop override the translated default', async () => {
    const container = await mount(
      createElement(PresenceDot, { status: 'busy', ariaLabel: 'Do not disturb' }),
    )
    const dot = container.querySelector('[role="status"]')
    expect(dot?.getAttribute('aria-label')).toBe('Do not disturb')
    expect(dot?.getAttribute('aria-label')).not.toContain('«')
  })

  it('renders each status word through its own key', async () => {
    for (const status of ['online', 'away', 'busy', 'offline'] as const) {
      const container = await mount(createElement(PresenceDot, { status }))
      expect(container.innerHTML).toContain(`«en:presenceIndicator.status.${status}»`)
    }
  })

  it('renders the label in the locale the provider switches to', async () => {
    const container = await mount(createElement(PresenceDot, { status: 'away' }))
    const dot = container.querySelector('[role="status"]')
    expect(dot?.getAttribute('aria-label')).toBe(
      '«en:presenceIndicator.aria.presence»⟨«en:presenceIndicator.status.away»⟩',
    )

    // The switch itself: the label must re-render in the new locale. Against
    // the old template literal this stayed English — nothing subscribed it.
    await switchLocale('de')
    expect(dot?.getAttribute('aria-label')).toBe(
      '«de:presenceIndicator.aria.presence»⟨«de:presenceIndicator.status.away»⟩',
    )
  })
})
