// @vitest-environment jsdom
/**
 * Unit tests of the Angular `SearchAutocomplete` keyboard and data behavior —
 * the port of `@molecule/app-search-autocomplete-react`'s own suite: the same
 * test names and the same behavioral assertions (ARIA combobox wiring, the
 * keyboard highlight/select/close machine, pointer selection and the
 * stale-response race guard), mounted through Angular's real renderer.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SuggestionItem } from '../types.js'

// Proxy ClassMap echoing each accessed member back as its token, exactly like
// the React suite's mock.
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
        // React's ClassMap exposes the Input wrapper/inner classes as plain
        // string properties, not generators; Angular's [class] requires the
        // string.
        if (prop === 'inputWrapper') return 'input-wrapper'
        if (prop === 'inputInner') return 'input-inner'
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { SearchAutocomplete } = await import('../search-autocomplete.component.js')

/** The static suggestion fixture the React suite uses. */
const suggestions: SuggestionItem[] = [
  { id: '1', label: 'One' },
  { id: '2', label: 'Two' },
  { id: '3', label: 'Three' },
]

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection and pending microtasks. */
  flush(): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The host template: every prop bound as an input, the React suite's shape. */
const TEMPLATE = `<div
  mol-search-autocomplete
  [value]="p['value'] ?? ''"
  [onChange]="p['onChange']"
  [onSearch]="p['onSearch']"
  [suggestions]="p['suggestions']"
  [onSelect]="p['onSelect']"
  [placeholder]="p['placeholder']"
  [ariaLabel]="p['ariaLabel']"
  [debounceMs]="p['debounceMs']"
  [minChars]="p['minChars']"
  [className]="p['className']"
></div>`

/**
 * Mounts the component through a JIT host template.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [SearchAutocomplete],
    changeDetection: ChangeDetectionStrategy.Eager,
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
    flush: async () => {
      appRef.tick()
      for (let i = 0; i < 3; i++) await Promise.resolve()
      appRef.tick()
    },
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

/**
 * Mounts a `SearchAutocomplete` with the given props.
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount({
    value: 'o',
    suggestions,
    onChange: () => {},
    onSelect: () => {},
    ...props,
  })
  mounted.push(m)
  return m
}

/**
 * Focuses an input the way the conformance kit does (a bubbling focusin).
 * @param input - The input to focus.
 */
const focus = (input: HTMLInputElement): void => {
  input.focus()
  input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

/**
 * Dispatches one keydown on an element.
 * @param element - The target element.
 * @param key - The key name.
 */
const keydown = (element: Element, key: string): void => {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/**
 * Types a value into an input (sets the property, then fires `input`).
 * @param input - The input.
 * @param value - The typed value.
 */
const type = (input: HTMLInputElement, value: string): void => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/** A deferred promise helper for driving out-of-order resolution. */
function defer<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('SearchAutocomplete keyboard navigation', () => {
  it('is a combobox that opens, moves the highlight, and selects with Enter', async () => {
    const onSelect = vi.fn()
    const m = await render({ onSelect })
    const input = m.host.querySelector('input') as HTMLInputElement
    expect(input.getAttribute('aria-expanded')).toBe('false')

    focus(input)
    await m.flush()
    const listbox = m.host.querySelector('[role="listbox"]') as HTMLElement
    expect(listbox).not.toBeNull()
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(input.getAttribute('aria-controls')).toBe(listbox.getAttribute('id'))

    keydown(input, 'ArrowDown')
    await m.flush()
    let options = m.host.querySelectorAll('[role="option"]')
    expect(options[0]?.getAttribute('aria-selected')).toBe('true')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]?.getAttribute('id'))

    keydown(input, 'ArrowDown')
    await m.flush()
    options = m.host.querySelectorAll('[role="option"]')
    expect(options[1]?.getAttribute('aria-selected')).toBe('true')
    keydown(input, 'Enter')
    await m.flush()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(suggestions[1])
  })

  it('wraps with ArrowUp and closes on Escape (no mouse involved)', async () => {
    const m = await render({ onSelect: vi.fn() })
    const input = m.host.querySelector('input') as HTMLInputElement
    focus(input)
    await m.flush()

    keydown(input, 'ArrowUp')
    await m.flush()
    const options = m.host.querySelectorAll('[role="option"]')
    expect(options[options.length - 1]?.getAttribute('aria-selected')).toBe('true')

    keydown(input, 'Escape')
    await m.flush()
    expect(m.host.querySelector('[role="listbox"]')).toBeNull()
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('Enter without a highlighted option does not select', async () => {
    const onSelect = vi.fn()
    const m = await render({ onSelect })
    const input = m.host.querySelector('input') as HTMLInputElement
    focus(input)
    await m.flush()
    keydown(input, 'Enter')
    await m.flush()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps aria-activedescendant valid when the list shrinks below the highlight', async () => {
    const onSelect = vi.fn()
    const m = await render({ onSelect })
    const input = m.host.querySelector('input') as HTMLInputElement
    focus(input)
    await m.flush()
    keydown(input, 'ArrowDown')
    await m.flush()
    keydown(input, 'ArrowDown')
    await m.flush()
    keydown(input, 'ArrowDown')
    await m.flush()
    expect(m.host.querySelectorAll('[role="option"]')[2]?.getAttribute('aria-selected')).toBe(
      'true',
    )

    // The list shrinks past the highlight: the old option id no longer exists,
    // so the combobox names no option instead of naming a gone one.
    await m.setProps({ suggestions: suggestions.slice(0, 1) })
    expect(m.host.querySelectorAll('[role="option"]')).toHaveLength(1)
    expect(input.getAttribute('aria-activedescendant')).toBeNull()
    expect(m.host.querySelectorAll('[role="option"]')[0]?.getAttribute('aria-selected')).toBe(
      'false',
    )

    // Enter over a highlight that names nothing selects nothing.
    keydown(input, 'Enter')
    await m.flush()
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('SearchAutocomplete option rows', () => {
  /**
   * Opens the popover over the static suggestion fixture.
   * @param onSelect - Selection callback spy.
   * @returns The mounted host and its input.
   */
  const renderOpen = async (
    onSelect: (item: SuggestionItem) => void,
  ): Promise<{ m: Mounted; input: HTMLInputElement }> => {
    const m = await render({ onSelect })
    const input = m.host.querySelector('input') as HTMLInputElement
    focus(input)
    await m.flush()
    return { m, input }
  }

  it('options hold no nested control and are never Tab stops', async () => {
    const { m } = await renderOpen(vi.fn())
    for (const option of m.host.querySelectorAll('[role="option"]')) {
      expect(option.querySelector('button, a, input, [tabindex="0"]')).toBeNull()
      expect(option.getAttribute('tabindex')).toBe('-1')
    }
  })

  it('pressing a suggestion selects it, keeps focus on the input and closes the popover', async () => {
    const onSelect = vi.fn()
    const { m, input } = await renderOpen(onSelect)
    const option = m.host.querySelectorAll('[role="option"]')[1] as HTMLElement
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    option.dispatchEvent(press)
    await m.flush()
    expect(press.defaultPrevented).toBe(true)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(suggestions[1])
    expect(m.host.querySelector('[role="listbox"]')).toBeNull()
    expect(document.activeElement).toBe(input)
  })
})

describe('SearchAutocomplete stale-response race guard', () => {
  it('ignores an earlier onSearch response that resolves after a later one', async () => {
    vi.useFakeTimers()
    const first = defer<SuggestionItem[]>()
    const second = defer<SuggestionItem[]>()
    let calls = 0
    const onSearch = vi.fn((_query: string) => (++calls === 1 ? first.promise : second.promise))

    const m = await render({ value: '', debounceMs: 0, onSearch, suggestions: undefined })
    const input = m.host.querySelector('input') as HTMLInputElement

    // Type "a" → the first (slow) request fires for this value.
    type(input, 'a')
    await m.setProps({ value: 'a' })
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(onSearch).toHaveBeenCalledWith('a')

    // Type "ab" → the second (fast) request fires.
    type(input, 'ab')
    await m.setProps({ value: 'ab' })
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(onSearch).toHaveBeenCalledWith('ab')

    // The EARLIER request resolves while the later one is still in flight: it
    // has lost the race and must be dropped.
    first.resolve([{ id: 'stale', label: 'Stale result' }])
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(m.host.textContent).not.toContain('Stale result')

    // The later (fresh) response applies.
    second.resolve([{ id: 'fresh', label: 'Fresh result' }])
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(m.host.textContent).toContain('Fresh result')
  })

  it('applies an in-order response normally', async () => {
    vi.useFakeTimers()
    const only = defer<SuggestionItem[]>()
    const onSearch = vi.fn((_query: string) => only.promise)

    const m = await render({ value: '', debounceMs: 0, onSearch, suggestions: undefined })
    const input = m.host.querySelector('input') as HTMLInputElement

    type(input, 'x')
    await m.setProps({ value: 'x' })
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(onSearch).toHaveBeenCalledWith('x')

    only.resolve([{ id: 'ok', label: 'Only result' }])
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(m.host.textContent).toContain('Only result')
  })
})
