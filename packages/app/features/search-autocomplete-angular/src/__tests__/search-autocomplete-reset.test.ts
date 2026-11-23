// @vitest-environment jsdom

/**
 * The per-query reset, as in the other frameworks: a query that can search keeps
 * the previous query's suggestions until its own search answers, and text below
 * `minChars` drops them in the same update, so they never show for it nor come
 * back when the text grows again.
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
    value: '',
    onChange: () => {},
    onSelect: () => {},
    debounceMs: 0,
    ...props,
  })
  mounted.push(m)
  return m
}

/** Deferred promise helper so a search can be held open across a query change. */
function defer<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
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

describe('SearchAutocomplete per-query reset', () => {
  it("keeps the previous query's suggestions until the new query's search answers", async () => {
    vi.useFakeTimers()
    const second = defer<SuggestionItem[]>()
    const onSearch = vi.fn<(q: string) => Promise<SuggestionItem[]>>((q) =>
      q === 'a' ? Promise.resolve([{ id: 'apple', label: 'Apple' }]) : second.promise,
    )
    const m = await render({ onSearch })
    const input = m.host.querySelector('input') as HTMLInputElement

    // First query resolves and shows its suggestion.
    type(input, 'a')
    await m.setProps({ value: 'a' })
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(m.host.textContent).toContain('Apple')

    // Typing the next query keeps it while that query's search is pending.
    type(input, 'ab')
    await m.setProps({ value: 'ab' })
    expect(m.host.textContent).toContain('Apple')

    // The new query is searched only after the debounce; resolve that one.
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(onSearch).toHaveBeenCalledWith('ab')
    second.resolve([{ id: 'banana', label: 'Banana' }])
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(m.host.textContent).toContain('Banana')
    expect(m.host.textContent).not.toContain('Apple')
  })

  it('never shows stale suggestions below minChars', async () => {
    vi.useFakeTimers()
    const onSearch = vi.fn<(q: string) => Promise<SuggestionItem[]>>((q) =>
      Promise.resolve(q === 'ab' ? [{ id: 'banana', label: 'Banana' }] : []),
    )
    const m = await render({ onSearch, minChars: 2 })
    const input = m.host.querySelector('input') as HTMLInputElement

    type(input, 'ab')
    await m.setProps({ value: 'ab' })
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(m.host.textContent).toContain('Banana')

    // Shrinking below the threshold hides the results without a new search.
    type(input, 'a')
    await m.setProps({ value: 'a' })
    expect(m.host.textContent).not.toContain('Banana')

    // Growing past it again does not bring the dropped results back: only the
    // new query's search can show suggestions.
    onSearch.mockImplementation(() => new Promise<SuggestionItem[]>(() => {}))
    type(input, 'ab')
    await m.setProps({ value: 'ab' })
    await vi.advanceTimersByTimeAsync(0)
    await m.flush()
    expect(m.host.textContent).not.toContain('Banana')
  })
})
