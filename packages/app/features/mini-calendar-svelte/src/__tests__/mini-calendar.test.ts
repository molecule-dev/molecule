// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `MiniCalendar` — a port of
 * `@molecule/app-mini-calendar-react/src/__tests__/mini-calendar.test.tsx`:
 * the same test names and the same assertions, rendered with Svelte in jsdom.
 *
 * The real `@molecule/app-ui-svelte` Button renders against the mocked
 * ClassMap, so the markup carries the same observable contract the React
 * suite's Button mock produces (a `<button>` with the aria-label React
 * passes).
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `textSize`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

import MiniCalendar from '../MiniCalendar.svelte'

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
  useLocale: () => ({
    subscribe(fn: (value: string) => void) {
      fn('en-US')
      return () => {}
    },
  }),
}))

interface Mounted {
  readonly target: HTMLElement
  destroy(): void
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const m of mounted.splice(0)) m.destroy()
})

// Pin the visible month to March 2026 for deterministic grid output.
const march2026 = new Date(2026, 2, 15)

/** Mounts a {@link MiniCalendar} and returns the wrapper around its DOM. */
const render = (props: Record<string, unknown>): Mounted => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(MiniCalendar, { target, props })
  const m: Mounted = {
    target,
    destroy: () => {
      unmount(component)
      target.remove()
    },
  }
  mounted.push(m)
  return m
}

describe('MiniCalendar', () => {
  it('renders the visible month name in the header', () => {
    const markup = render({ month: march2026, locale: 'en-US' }).target.innerHTML
    expect(markup).toContain('March 2026')
  })

  it('renders previous/next month navigation buttons', () => {
    const markup = render({ month: march2026 }).target.innerHTML
    expect(markup.match(/<button[^>]*aria-label="[^"]+"/g) ?? []).toHaveLength(2)
  })

  it('takes the previous-month button aria-label through i18n by default', () => {
    const markup = render({ month: march2026 }).target.innerHTML
    expect(markup).toContain('aria-label="«miniCalendar.aria.previousMonth»"')
  })

  it('takes the next-month button aria-label through i18n by default', () => {
    const markup = render({ month: march2026 }).target.innerHTML
    expect(markup).toContain('aria-label="«miniCalendar.aria.nextMonth»"')
  })

  it('renders a 6×7 day grid (42 day buttons)', () => {
    const markup = render({ month: march2026 }).target.innerHTML
    expect(markup.match(/<button(?![^>]*aria-label=)/g) ?? []).toHaveLength(42)
  })

  it('marks the selected day with aria-current="date"', () => {
    const markup = render({ month: march2026, selected: new Date(2026, 2, 10) }).target.innerHTML
    expect(markup.match(/aria-current="date"/g) ?? []).toHaveLength(1)
  })

  it('disables days rejected by the isDisabled predicate', () => {
    const markup = render({
      month: march2026,
      isDisabled: (d: Date) => d.getDate() === 10 && d.getMonth() === 2,
    }).target.innerHTML
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('forwards className', () => {
    const markup = render({ month: march2026, className: 'mc-cls' }).target.innerHTML
    expect(markup).toContain('mc-cls')
  })
})
