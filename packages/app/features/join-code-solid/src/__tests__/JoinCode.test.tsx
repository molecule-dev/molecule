// @vitest-environment jsdom
/**
 * Unit tests for the Solid `JoinCode` — a port of
 * `@molecule/app-join-code-react/src/__tests__/JoinCode.test.tsx`: the same
 * behavioural assertions, rendered with Solid in jsdom and driven with the same
 * native events a browser fires.
 *
 * @module
 */

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
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      Object.entries(values ?? {}).reduce(
        (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
        options?.defaultValue ?? key,
      ),
  }),
}))

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'

import { JoinCode } from '../JoinCode.jsx'

/** Render disposers, torn down after each test. */
const disposers: Array<() => void> = []

/**
 * Render a view with Solid's browser renderer and dispose it after the test.
 *
 * @param view - The view to render.
 * @returns The container the view rendered into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/**
 * Let Solid's queued effects and DOM writes run before asserting.
 *
 * @returns A promise resolved after the next macrotask.
 */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
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
}

/**
 * Send a key press to an element.
 *
 * @param el - The slot input.
 * @param key - The key name.
 */
function press(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
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
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('<JoinCode>', () => {
  it('renders the configured number of slots (default 6)', () => {
    mount(() => <JoinCode />)
    const slots = document.querySelectorAll('[data-mol-id^="join-code-slot-"]')
    expect(slots.length).toBe(6)
  })

  it('renders custom length', () => {
    mount(() => <JoinCode length={4} />)
    const slots = document.querySelectorAll('[data-mol-id^="join-code-slot-"]')
    expect(slots.length).toBe(4)
  })

  it('typing a character advances focus to the next slot', async () => {
    mount(() => <JoinCode length={4} />)
    const s0 = getSlot(0)
    s0.focus()
    type(s0, 'A')
    await flush()
    expect(getSlot(0).value).toBe('A')
    expect(document.activeElement).toBe(getSlot(1))
  })

  it('uppercases letters under alphanumeric alphabet', async () => {
    const onChange = vi.fn()
    mount(() => <JoinCode length={4} onChange={onChange} />)
    const s0 = getSlot(0)
    type(s0, 'a')
    await flush()
    expect(getSlot(0).value).toBe('A')
    expect(onChange).toHaveBeenCalledWith('A')
  })

  it('strips characters outside the numeric alphabet', async () => {
    const onChange = vi.fn()
    mount(() => <JoinCode length={4} alphabet="numeric" onChange={onChange} />)
    const s0 = getSlot(0)
    type(s0, 'A')
    await flush()
    // 'A' stripped — value stays empty.
    expect(getSlot(0).value).toBe('')
    type(s0, '7')
    await flush()
    expect(getSlot(0).value).toBe('7')
    expect(onChange).toHaveBeenLastCalledWith('7')
  })

  it('strips characters outside the letters alphabet', async () => {
    mount(() => <JoinCode length={4} alphabet="letters" />)
    const s0 = getSlot(0)
    type(s0, '7')
    await flush()
    expect(getSlot(0).value).toBe('')
    type(s0, 'q')
    await flush()
    expect(getSlot(0).value).toBe('Q')
  })

  it('backspace on an empty slot focuses and clears the previous slot', async () => {
    mount(() => <JoinCode length={4} defaultValue="AB" />)
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('')
    const s2 = getSlot(2)
    s2.focus()
    press(s2, 'Backspace')
    await flush()
    // Slot 1's value is removed; focus moves back.
    expect(getSlot(1).value).toBe('')
    expect(document.activeElement).toBe(getSlot(1))
  })

  it('arrow-left / arrow-right move focus between slots', async () => {
    mount(() => <JoinCode length={4} />)
    const s0 = getSlot(0)
    s0.focus()
    press(s0, 'ArrowRight')
    expect(document.activeElement).toBe(getSlot(1))
    press(getSlot(1), 'ArrowLeft')
    expect(document.activeElement).toBe(getSlot(0))
    await flush()
  })

  it('paste-to-fill distributes characters across slots and truncates to length', async () => {
    const onChange = vi.fn()
    mount(() => <JoinCode length={4} onChange={onChange} />)
    const s0 = getSlot(0)
    s0.focus()
    paste(s0, 'abcdef')
    await flush()
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('C')
    expect(getSlot(3).value).toBe('D')
    expect(onChange).toHaveBeenCalledWith('ABCD')
  })

  it('paste under numeric alphabet drops invalid characters', async () => {
    const onChange = vi.fn()
    mount(() => <JoinCode length={6} alphabet="numeric" onChange={onChange} />)
    const s0 = getSlot(0)
    s0.focus()
    paste(s0, '12-345')
    await flush()
    expect(onChange).toHaveBeenCalledWith('12345')
  })

  it('fires onComplete once when the code is filled', async () => {
    const onComplete = vi.fn()
    mount(() => <JoinCode length={3} onComplete={onComplete} />)
    type(getSlot(0), '1')
    await flush()
    type(getSlot(1), '2')
    await flush()
    expect(onComplete).not.toHaveBeenCalled()
    type(getSlot(2), '3')
    await flush()
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('123')
  })

  it('does not fire onComplete when autoSubmit is false', async () => {
    const onComplete = vi.fn()
    mount(() => <JoinCode length={3} autoSubmit={false} onComplete={onComplete} />)
    type(getSlot(0), '1')
    await flush()
    type(getSlot(1), '2')
    await flush()
    type(getSlot(2), '3')
    await flush()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('controlled mode reflects parent value and ignores invalid chars at render', async () => {
    /** Parent that maintains controlled state. */
    function Parent(): JSX.Element {
      const [value, setValue] = createSignal('AB')
      return <JoinCode length={4} value={value()} onChange={setValue} />
    }
    mount(() => <Parent />)
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('')
    type(getSlot(2), 'c')
    await flush()
    expect(getSlot(2).value).toBe('C')
  })

  it('uncontrolled mode honours defaultValue and clamps to length', () => {
    mount(() => <JoinCode length={4} defaultValue="HELLO-WORLD" alphabet="alphanumeric" />)
    expect(getSlot(0).value).toBe('H')
    expect(getSlot(1).value).toBe('E')
    expect(getSlot(2).value).toBe('L')
    expect(getSlot(3).value).toBe('L')
  })
})
