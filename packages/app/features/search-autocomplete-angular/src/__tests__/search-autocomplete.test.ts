// @vitest-environment jsdom
/**
 * Unit tests of the Angular `SearchAutocomplete` (closed surface) — the port of
 * `@molecule/app-search-autocomplete-react`'s own suite: the same test names
 * and the same behavioral assertions, mounted through Angular's real renderer
 * (the same JIT host approach the conformance kit's Angular adapter uses).
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

// Proxy ClassMap echoing each accessed member back as its token, exactly like
// the React suite's mock, so tests assert which cm.* token was applied.
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

// The React suite's translation mock: each key falls back to its default value.
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
  /** The markup the component rendered. */
  readonly markup: string
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection. */
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
 * Mounts the component through a JIT host template, written the way an Angular
 * app would write it.
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
    markup: host.innerHTML,
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
    ...props,
  })
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('SearchAutocomplete (closed state)', () => {
  it('renders the search input carrying the value', async () => {
    const markup = (await render({ value: 'react' })).markup
    expect(markup).toContain('type="search"')
    expect(markup).toContain('value="react"')
  })

  it('uses the default placeholder and honours a custom one', async () => {
    expect((await render({ value: '' })).markup).toContain('placeholder="Search')
    expect((await render({ value: '', placeholder: 'Find a project' })).markup).toContain(
      'placeholder="Find a project"',
    )
  })

  it('names the input with an aria-label and honours a custom one', async () => {
    // The input's only name must never rest on its placeholder (an empty one
    // leaves it nameless): the translated default names it either way.
    expect((await render({ value: '', placeholder: '' })).markup).toContain('aria-label="Search"')
    expect((await render({ value: '', ariaLabel: 'Find a project' })).markup).toContain(
      'aria-label="Find a project"',
    )
  })

  it('exposes autocomplete a11y attributes with the popover collapsed', async () => {
    const markup = (await render({ value: '' })).markup
    expect(markup).toContain('aria-autocomplete="list"')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('does not render the suggestion listbox before being opened', async () => {
    const markup = (await render({ value: 'q', suggestions: [{ id: '1', label: 'Result one' }] }))
      .markup
    expect(markup).not.toContain('role="listbox"')
  })

  it('forwards className onto the wrapper', async () => {
    expect((await render({ value: '', className: 'sa-cls' })).markup).toContain('sa-cls')
  })
})
