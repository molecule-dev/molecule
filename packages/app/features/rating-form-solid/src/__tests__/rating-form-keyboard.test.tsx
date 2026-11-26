// @vitest-environment jsdom
/**
 * The star radiogroup's keyboard support (the WAI-ARIA APG radio group
 * pattern) — the Solid port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form-keyboard.test.tsx`:
 * the same test names and assertions, rendered with Solid in jsdom. A roving
 * tabindex makes the checked star the group's one tab stop, and the arrows /
 * Home / End select and focus stars, wrapping. The group itself is
 * `tabindex={-1}` — focusable but never a tab stop.
 *
 * @module
 */
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Solid suite uses.
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

// Each key falls back to its default value.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: (props: {
    children?: JSX.Element
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset' | 'menu'
  }) => (
    <button data-button="" type={props.type ?? 'button'} disabled={props.disabled}>
      {props.children}
    </button>
  ),
  Textarea: (props: { placeholder?: string; 'aria-label'?: string }) => (
    <textarea data-textarea="" placeholder={props.placeholder} aria-label={props['aria-label']} />
  ),
}))

const { RatingForm } = await import('../RatingForm.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Mounts the form in jsdom and returns its container. Solid updates the DOM
 * synchronously on a signal write, so interactions need no flush.
 *
 * @param props - Props over the required `onSubmit`.
 * @returns The container.
 */
function mount(props: Record<string, unknown> = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <RatingForm onSubmit={() => {}} {...props} />, container))
  return container
}

/** The star buttons, in order. */
const stars = (container: HTMLElement): HTMLButtonElement[] =>
  [...container.querySelectorAll('[data-mol-id="rating-form-star"]')] as HTMLButtonElement[]

/** The checked star's number (1-based). */
const checked = (container: HTMLElement): number =>
  stars(container).findIndex((s) => s.getAttribute('aria-checked') === 'true') + 1

/**
 * Presses a key on a star and reports whether its default was prevented.
 *
 * @param container - The container.
 * @param n - The star to press (1-based).
 * @param key - The key.
 * @returns Whether the event's default was prevented.
 */
function press(container: HTMLElement, n: number, key: string): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  stars(container)[n - 1]!.dispatchEvent(event)
  return event.defaultPrevented
}

/**
 * Focuses a star the way a keyboard user arrives at it.
 *
 * @param container - The container.
 * @param n - The star (1-based).
 */
function focus(container: HTMLElement, n: number): void {
  stars(container)[n - 1]!.focus()
}

describe('RatingForm keyboard', () => {
  it('arrow keys move the checked star and focus, wrapping', () => {
    const container = mount({ defaultRating: 4 })
    focus(container, 4)
    press(container, 4, 'ArrowRight')
    expect(checked(container)).toBe(5)
    expect(document.activeElement).toBe(stars(container)[4])
    press(container, 5, 'ArrowRight')
    expect(checked(container)).toBe(1)
    expect(document.activeElement).toBe(stars(container)[0])
    expect(press(container, 1, 'ArrowLeft')).toBe(true)
    expect(checked(container)).toBe(5)
    expect(document.activeElement).toBe(stars(container)[4])
    // ArrowDown is next and ArrowUp previous, the same wrapping.
    press(container, 5, 'ArrowDown')
    expect(checked(container)).toBe(1)
    press(container, 1, 'ArrowUp')
    expect(checked(container)).toBe(5)
    // An unhandled key does nothing and keeps its default.
    expect(press(container, 5, 'PageDown')).toBe(false)
    expect(checked(container)).toBe(5)
  })

  it('Home and End select the first and last star', () => {
    const container = mount({ defaultRating: 3 })
    focus(container, 3)
    expect(press(container, 3, 'Home')).toBe(true)
    expect(checked(container)).toBe(1)
    expect(document.activeElement).toBe(stars(container)[0])
    expect(press(container, 1, 'End')).toBe(true)
    expect(checked(container)).toBe(5)
    expect(document.activeElement).toBe(stars(container)[4])
  })

  it('only the checked star is a tab stop', () => {
    const container = mount({ defaultRating: 3 })
    expect(stars(container).map((s) => s.getAttribute('tabindex'))).toEqual([
      '-1',
      '-1',
      '0',
      '-1',
      '-1',
    ])
    // With no rating yet, the first star is the tab stop.
    const fresh = mount({})
    expect(stars(fresh).map((s) => s.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
      '-1',
    ])
    // A click moves the tab stop with the selection.
    stars(fresh)[3]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(stars(fresh).map((s) => s.getAttribute('tabindex'))).toEqual([
      '-1',
      '-1',
      '-1',
      '0',
      '-1',
    ])
    // The group itself is focusable but never a tab stop.
    const group = fresh.querySelector('[role="radiogroup"]')
    expect(group?.getAttribute('tabindex')).toBe('-1')
    // A defaultRating above max marks no star, so the first star is the stop —
    // an out-of-range value must not leave the group keyboard-unreachable.
    const over = mount({ defaultRating: 9 })
    expect(stars(over).map((s) => s.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
      '-1',
    ])
  })
})
