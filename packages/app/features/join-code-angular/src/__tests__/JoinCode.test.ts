// @vitest-environment jsdom
/**
 * Unit tests of the Angular `JoinCode` — the port of
 * `@molecule/app-join-code-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the DOM; this port mounts
 * the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and makes the same assertions.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
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
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      Object.entries(values ?? {}).reduce(
        (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
        options?.defaultValue ?? key,
      ),
  }),
}))

const { JoinCode } = await import('../join-code.component.js')

/** The host template, written the way an Angular app writes the component. */
const TEMPLATE = `<div
  mol-join-code
  [length]="p['length']"
  [value]="p['value']"
  [defaultValue]="p['defaultValue']"
  [onChange]="p['onChange']"
  [onComplete]="p['onComplete']"
  [autoSubmit]="p['autoSubmit']"
  [alphabet]="p['alphabet']"
  [disabled]="p['disabled']"
  [className]="p['className']"
></div>`

/** A mounted spec host: its DOM, a props setter, a tick and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Runs one change-detection pass. */
  tick(): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the join-code component through a JIT host template.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [JoinCode as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: async () => {
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
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

const mounted: Mounted[] = []

/**
 * Mounts the component and registers it for teardown.
 *
 * @param props - The props to mount with.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  vi.clearAllMocks()
})

describe('<JoinCode>', () => {
  it('renders the configured number of slots (default 6)', async () => {
    await render()
    const slots = document.querySelectorAll('[data-mol-id^="join-code-slot-"]')
    expect(slots.length).toBe(6)
  })

  it('renders custom length', async () => {
    await render({ length: 4 })
    const slots = document.querySelectorAll('[data-mol-id^="join-code-slot-"]')
    expect(slots.length).toBe(4)
  })

  it('typing a character advances focus to the next slot', async () => {
    const m = await render({ length: 4 })
    const s0 = getSlot(0)
    s0.focus()
    type(s0, 'A')
    await m.tick()
    expect(getSlot(0).value).toBe('A')
    expect(document.activeElement).toBe(getSlot(1))
  })

  it('uppercases letters under alphanumeric alphabet', async () => {
    const onChange = vi.fn()
    const m = await render({ length: 4, onChange })
    const s0 = getSlot(0)
    type(s0, 'a')
    await m.tick()
    expect(getSlot(0).value).toBe('A')
    expect(onChange).toHaveBeenCalledWith('A')
  })

  it('strips characters outside the numeric alphabet', async () => {
    const onChange = vi.fn()
    const m = await render({ length: 4, alphabet: 'numeric', onChange })
    const s0 = getSlot(0)
    type(s0, 'A')
    await m.tick()
    // 'A' stripped — value stays empty.
    expect(getSlot(0).value).toBe('')
    type(s0, '7')
    await m.tick()
    expect(getSlot(0).value).toBe('7')
    expect(onChange).toHaveBeenLastCalledWith('7')
  })

  it('strips characters outside the letters alphabet', async () => {
    const m = await render({ length: 4, alphabet: 'letters' })
    const s0 = getSlot(0)
    type(s0, '7')
    await m.tick()
    expect(getSlot(0).value).toBe('')
    type(s0, 'q')
    await m.tick()
    expect(getSlot(0).value).toBe('Q')
  })

  it('backspace on an empty slot focuses and clears the previous slot', async () => {
    const m = await render({ length: 4, defaultValue: 'AB' })
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('')
    const s2 = getSlot(2)
    s2.focus()
    press(s2, 'Backspace')
    await m.tick()
    // Slot 1's value is removed; focus moves back.
    expect(getSlot(1).value).toBe('')
    expect(document.activeElement).toBe(getSlot(1))
  })

  it('arrow-left / arrow-right move focus between slots', async () => {
    const m = await render({ length: 4 })
    const s0 = getSlot(0)
    s0.focus()
    press(s0, 'ArrowRight')
    expect(document.activeElement).toBe(getSlot(1))
    press(getSlot(1), 'ArrowLeft')
    expect(document.activeElement).toBe(getSlot(0))
    await m.tick()
  })

  it('paste-to-fill distributes characters across slots and truncates to length', async () => {
    const onChange = vi.fn()
    const m = await render({ length: 4, onChange })
    const s0 = getSlot(0)
    s0.focus()
    paste(s0, 'abcdef')
    await m.tick()
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('C')
    expect(getSlot(3).value).toBe('D')
    expect(onChange).toHaveBeenCalledWith('ABCD')
  })

  it('paste under numeric alphabet drops invalid characters', async () => {
    const onChange = vi.fn()
    const m = await render({ length: 6, alphabet: 'numeric', onChange })
    const s0 = getSlot(0)
    s0.focus()
    paste(s0, '12-345')
    await m.tick()
    expect(onChange).toHaveBeenCalledWith('12345')
  })

  it('fires onComplete once when the code is filled', async () => {
    const onComplete = vi.fn()
    const m = await render({ length: 3, onComplete })
    type(getSlot(0), '1')
    await m.tick()
    type(getSlot(1), '2')
    await m.tick()
    expect(onComplete).not.toHaveBeenCalled()
    type(getSlot(2), '3')
    await m.tick()
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('123')
  })

  it('does not fire onComplete when autoSubmit is false', async () => {
    const onComplete = vi.fn()
    const m = await render({ length: 3, autoSubmit: false, onComplete })
    type(getSlot(0), '1')
    await m.tick()
    type(getSlot(1), '2')
    await m.tick()
    type(getSlot(2), '3')
    await m.tick()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('controlled mode reflects parent value and ignores invalid chars at render', async () => {
    /** The props the host template reads; `onChange` writes the parent's copy. */
    const props: Record<string, unknown> = { length: 4, value: 'AB' }
    props.onChange = (next: string): void => {
      props.value = next
    }
    const m = await render(props)
    expect(getSlot(0).value).toBe('A')
    expect(getSlot(1).value).toBe('B')
    expect(getSlot(2).value).toBe('')
    type(getSlot(2), 'c')
    // The parent's value follows the change, as React's `setValue` does.
    await m.setProps({ value: props.value })
    expect(getSlot(2).value).toBe('C')
  })

  it('uncontrolled mode honours defaultValue and clamps to length', async () => {
    await render({ length: 4, defaultValue: 'HELLO-WORLD', alphabet: 'alphanumeric' })
    expect(getSlot(0).value).toBe('H')
    expect(getSlot(1).value).toBe('E')
    expect(getSlot(2).value).toBe('L')
    expect(getSlot(3).value).toBe('L')
  })
})
