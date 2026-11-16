// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `JoinCode` — a port of
 * `@molecule/app-join-code-react/src/__tests__/JoinCode.test.tsx`: the same
 * behavioural assertions, rendered with Svelte in jsdom and driven with the
 * same native events a browser fires.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, the same
// stub the React suite uses.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop): unknown {
        if (prop === 'cn') {
          return (...classes: unknown[]) =>
            classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
        }
        const token = String(prop)
        const fn = (..._args: unknown[]): string => token
        return new Proxy(fn, {
          get(_t, key) {
            if (key === Symbol.toPrimitive || key === 'toString') return () => token
            return undefined
          },
        })
      },
    }
    return new Proxy({}, handler)
  },
}))

// The translations the component reads, resolved from the inline English
// `defaultValue` exactly as the bonded i18n provider does.
vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
        Object.entries(values ?? {}).reduce(
          (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
          options?.defaultValue ?? key,
        ),
    }),
  }
})

import JoinCode from '../JoinCode.svelte'
import type { JoinCodeProps } from '../types.js'
import ControlledJoinCode from './ControlledJoinCode.svelte'

/** Mounted components, torn down after each test. */
const mounted: Array<Record<string, unknown>> = []

/**
 * Mount a component into the document body and return its container.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The element the component rendered into.
 */
function render(component: Component<JoinCodeProps>, props: JoinCodeProps = {}): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
  return host
}

/**
 * Find a slot input by its 0-based index.
 *
 * @param index - Slot index.
 * @returns The HTML input element.
 */
function getSlot(index: number): HTMLInputElement {
  const el = document.querySelector(`[data-mol-id="join-code-slot-${index}"]`)
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`No slot input at index ${index}`)
  }
  return el
}

/**
 * Type into a slot the way a browser does: set the value, then fire the
 * `input` event (React's `onChange`) and `change`.
 *
 * @param el - The slot input.
 * @param value - The text the field holds after the edit.
 */
function type(el: HTMLInputElement, value: string): void {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  flushSync()
}

/**
 * Send a key press to an element.
 *
 * @param el - The slot input.
 * @param key - The key name.
 */
function press(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  flushSync()
}

/**
 * Paste text into a slot.
 *
 * @param el - The slot input.
 * @param text - The clipboard's text.
 */
function paste(el: HTMLElement, text: string): void {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } })
  el.dispatchEvent(event)
  flushSync()
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('<JoinCode>', () => {
  it('renders the configured number of slots (default 6)', () => {
    render(JoinCode)
    const slots = document.querySelectorAll('[data-mol-id^="join-code-slot-"]')
    expect(slots.length).toBe(6)
  })

  it('renders custom length', () => {
    render(JoinCode, { length: 4 })
    const slots = document.querySelectorAll('[data-mol-id^="join-code-slot-"]')
    expect(slots.length).toBe(4)
  })

  it('typing a character advances focus to the next slot', () => {
    render(JoinCode, { length: 4 })
    const s0 = getSlot(0)
    s0.focus()
    type(s0, 'A')
    expect(getSlot(0).value).toBe('A')
    expect(document.activeElement).toBe(getSlot(1))
  })

  it('uppercases letters under alphanumeric alphabet', () => {
    const onChange = vi.fn()
    render(JoinCode, { length: 4, onChange })
    const s0 = getSlot(0)
    type(s0, 'a')
    expect(getSlot(0).value).toBe('A')
    expect(onChange).toHaveBeenCalledWith('A')
  })

  it('strips characters outside the numeric alphabet', () => {
    const onChange = vi.fn()
    render(JoinCode, { length: 4, alphabet: 'numeric', onChange })
    const s0 = getSlot(0)
    type(s0, 'A')
    // 'A' stripped — value stays empty.
    expect(getSlot(0).value).toBe('')
    type(s0, '7')
    expect(getSlot(0).value).toBe('7')
    expect(onChange).toHaveBeenLastCalledWith('7')
  })

  it('strips characters outside the letters alphabet', () => {
    render(JoinCode, { length: 4, alphabet: 'letters' })
    const s0 = getSlot(0)
    type(s0, '7')
    expect(getSlot(0).value).toBe('')
    type(s0, 'q')
    expect(getSlot(0).value).toBe('Q')
  })

  it('backspace on an empty slot focuses and clears the previous slot', () => {
    render(JoinCode, { length: 4, defaultValue: 'AB' })
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('')
    const s2 = getSlot(2)
    s2.focus()
    press(s2, 'Backspace')
    // Slot 1's value is removed; focus moves back.
    expect(getSlot(1).value).toBe('')
    expect(document.activeElement).toBe(getSlot(1))
  })

  it('arrow-left / arrow-right move focus between slots', () => {
    render(JoinCode, { length: 4 })
    const s0 = getSlot(0)
    s0.focus()
    press(s0, 'ArrowRight')
    expect(document.activeElement).toBe(getSlot(1))
    press(getSlot(1), 'ArrowLeft')
    expect(document.activeElement).toBe(getSlot(0))
  })

  it('paste-to-fill distributes characters across slots and truncates to length', () => {
    const onChange = vi.fn()
    render(JoinCode, { length: 4, onChange })
    const s0 = getSlot(0)
    s0.focus()
    paste(s0, 'abcdef')
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('C')
    expect(getSlot(3).value).toBe('D')
    expect(onChange).toHaveBeenCalledWith('ABCD')
  })

  it('paste under numeric alphabet drops invalid characters', () => {
    const onChange = vi.fn()
    render(JoinCode, { length: 6, alphabet: 'numeric', onChange })
    const s0 = getSlot(0)
    s0.focus()
    paste(s0, '12-345')
    expect(onChange).toHaveBeenCalledWith('12345')
  })

  it('fires onComplete once when the code is filled', () => {
    const onComplete = vi.fn()
    render(JoinCode, { length: 3, onComplete })
    type(getSlot(0), '1')
    type(getSlot(1), '2')
    expect(onComplete).not.toHaveBeenCalled()
    type(getSlot(2), '3')
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('123')
  })

  it('does not fire onComplete when autoSubmit is false', () => {
    const onComplete = vi.fn()
    render(JoinCode, { length: 3, autoSubmit: false, onComplete })
    type(getSlot(0), '1')
    type(getSlot(1), '2')
    type(getSlot(2), '3')
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('controlled mode reflects parent value and ignores invalid chars at render', () => {
    render(ControlledJoinCode)
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('')
    type(getSlot(2), 'c')
    expect(getSlot(2).value).toBe('C')
  })

  it('uncontrolled mode honours defaultValue and clamps to length', () => {
    render(JoinCode, { length: 4, defaultValue: 'HELLO-WORLD', alphabet: 'alphanumeric' })
    expect(getSlot(0).value).toBe('H')
    expect(getSlot(1).value).toBe('E')
    expect(getSlot(2).value).toBe('L')
    expect(getSlot(3).value).toBe('L')
  })
})
