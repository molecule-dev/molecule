// @vitest-environment jsdom
/**
 * Unit tests for the Angular search UI — a port of
 * `@molecule/app-search-ui-react/src/__tests__/ui.test.tsx`: the same
 * behavioral assertions, mounted through Angular's real renderer (the
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserted on the markup the components produce. React's
 * module mocks for `Icon`/`Modal`/`Tooltip` become the same-shaped mock
 * components, and the i18n `t` the React tests stub is the binding mock,
 * which resolves the inline `defaultValue`.
 *
 * @module
 */

import '@angular/compiler'
import { NgTemplateOutlet } from '@angular/common'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  ElementRef,
  EventEmitter,
  inject,
  provideZonelessChangeDetection,
  signal,
  type TemplateRef,
  type Type,
  ViewChild,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { parseQuery } from '@molecule/app-client-search'
import type { SearchSession } from '@molecule/app-client-search-angular'
import type * as UI from '@molecule/app-ui-angular'

import type { SearchResultHit, SearchResultLinkProps, SearchResultView } from '../types.js'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `searchField`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The UI components the box and the dialog compose, each rendering one marked
// element — the same observable contracts the React suite's mocks have
// (Icon → `data-icon`; Modal → a dialog role only while open; Tooltip → the
// trigger beside an inline data-tooltip copy of the content).
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component } = await import('@angular/core')
  return {
    ...(await importOriginal<typeof UI>()),
    Icon: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'svg[mol-icon-root]',
      standalone: true,
      inputs: ['name', 'size', 'className', 'ariaHidden: aria-hidden'],
      host: { '[attr.data-icon]': 'name' },
      template: '',
    })(
      class MockIcon {
        /** The glyph name. */
        name?: string
        /** The pixel size. */
        size?: number
        /** Extra classes. */
        className?: string
      },
    ),
    Modal: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-modal',
      standalone: true,
      inputs: ['open', 'title', 'size'],
      outputs: ['close'],
      host: { 'data-parity-unwrap': '', style: 'display: contents' },
      template: `@if (open) {<div role="dialog"><ng-content></ng-content></div>}`,
    })(
      class MockModal {
        /** Whether the dialog is open. */
        open?: boolean
        /** The dialog title. */
        title?: string
        /** Dialog width preset. */
        size?: string
        /** Fires when the dialog asks to close. */
        readonly close = new EventEmitter<unknown>()

        /** The mock's host element, read for the `aria-*` attributes the real Modal moves onto the dialog. */
        private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

        /**
         * Moves the host's `aria-label` onto the dialog after every check, as
         * the real Modal forwards `aria-*` rest attributes.
         */
        ngAfterViewChecked(): void {
          const host = this.host.nativeElement
          const dialog = host.querySelector<HTMLElement>('[role="dialog"]')
          if (!dialog) return
          const label = host.getAttribute('aria-label')
          if (label === null) dialog.removeAttribute('aria-label')
          else dialog.setAttribute('aria-label', label)
        }
      },
    ),
    Tooltip: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-tooltip',
      standalone: true,
      inputs: ['content', 'placement'],
      host: { 'data-parity-unwrap': '', style: 'display: contents' },
      template: `<div role="presentation"><ng-content></ng-content><span data-tooltip=""><ng-content select="[slot=content]"></ng-content></span></div>`,
    })(
      class MockTooltip {
        /** The tooltip content. */
        content?: unknown
        /** The placement. */
        placement?: string
      },
    ),
  }
})

// The hook mocked at the binding boundary, the same observable contract the
// React suite's `@molecule/app-react` mock has (`t()` resolves the inline
// defaultValue, interpolating `{{count}}` and friends).
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (
      key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      if (key === 'searchUi.examplePhrase' || key === 'searchUi.exampleExcluded') return `«${key}»`
      let out = opts?.defaultValue ?? key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
    locale: signal('en'),
  }),
}))

const { Highlight, Kbd, QuickSearchDialog, SearchBox, SearchResults } = await import('../index.js')

/** A mounted spec host: its DOM, its component ref and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Settles a props update or a click's updates. */
  readonly flush: () => Promise<void>
  /** Updates the props bag the host template binds and re-renders. */
  readonly setProps: (next: Record<string, unknown>) => Promise<void>
  /** Destroys the app and removes the host. */
  readonly destroy: () => Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template.
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
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
      await Promise.resolve()
      appRef.tick()
    },
    setProps: async (next: Record<string, unknown>): Promise<void> => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      await Promise.resolve()
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
})

const q = (sel: string): Element | null =>
  mounted[mounted.length - 1]?.host.querySelector(sel) ?? null

describe('SearchBox', () => {
  it('shows the placeholder, the shortcut cap and the help icon while empty, and the count and chips while searching', async () => {
    const onChange = vi.fn()
    const onRemove = vi.fn()
    const onClear = vi.fn()
    const boxTemplate = `<div mol-search-box
      [value]="p['value']"
      [onChange]="p['onChange']"
      [onRemoveFilter]="p['onRemoveFilter']"
      [onClear]="p['onClear']"
      [filters]="p['filters']"
      [count]="p['count']"
      [placeholder]="p['placeholder']"
      [examples]="p['examples']"
      [molId]="p['molId']"
    >@if (p['withTabs']) {<nav ngProjectAs="[slot=afterField]" data-mol-id="cat-tabs">All</nav>}</div>`
    mounted.push(
      await mount(boxTemplate, SearchBox as Type<unknown>, {
        value: '',
        onChange,
        placeholder: 'Search packages',
        examples: ['category:auth'],
        withTabs: true,
        molId: 'cat',
      }),
    )
    const input = q('[data-mol-id="cat-input"]') as HTMLInputElement
    expect(input.placeholder).toBe('Search packages')
    const caps = (): (string | null)[] =>
      [...mounted[mounted.length - 1]!.host.querySelectorAll('kbd')].map((k) => k.textContent)
    expect(caps()).toContain('/')
    expect(q('[data-mol-id="cat-clear"]')).toBeNull()
    // The help icon lives inside the field, keyboard reachable, and its tooltip carries the syntax.
    const helpButton = q('[data-mol-id="cat-help"]') as HTMLButtonElement
    expect(helpButton.tagName).toBe('BUTTON')
    expect(helpButton.getAttribute('aria-label')).toBe('Search tips')
    expect(helpButton.querySelector('[data-icon="question"]')).not.toBeNull()
    expect(q('[data-tooltip]')?.textContent).toContain('category:auth')
    // No status row while nothing is typed and no filter is active; afterField sits right under the field.
    const field = q('[data-mol-id="cat-input"]')!.parentElement!
    expect(field.nextElementSibling?.getAttribute('data-mol-id')).toBe('cat-tabs')
    expect(q('[data-mol-id="cat-count"]')).toBeNull()

    // The second render replaces the props, as React's re-render does (the tabs go away).
    await mounted[mounted.length - 1]!.setProps({
      value: 'category:auth oauth',
      onChange,
      onClear,
      onRemoveFilter: onRemove,
      filters: [{ field: 'category', values: ['auth'] }],
      count: 7,
      placeholder: 'Search packages',
      examples: ['category:auth'],
      molId: 'cat',
      withTabs: false,
    })
    expect(caps()).not.toContain('/')
    expect(q('[data-mol-id="cat-count"]')?.textContent).toBe('7 results')
    const chip = q('[data-mol-id="cat-filter"]') as HTMLButtonElement
    expect(chip.textContent).toContain('category: auth')
    chip.click()
    await mounted[mounted.length - 1]!.flush()
    expect(onRemove).toHaveBeenCalledWith(0)
    ;(q('[data-mol-id="cat-clear"]') as HTMLButtonElement).click()
    await mounted[mounted.length - 1]!.flush()
    expect(onClear).toHaveBeenCalled()
    expect(q('[data-mol-id="cat-tips"]')).toBeNull()
  })

  it('takes the two built-in example tokens through i18n with their keys', async () => {
    const boxTemplate = `<div mol-search-box
      [value]="p['value']"
      [onChange]="p['onChange']"
      [placeholder]="p['placeholder']"
      [examples]="p['examples']"
      [molId]="p['molId']"
    ></div>`
    mounted.push(
      await mount(boxTemplate, SearchBox as Type<unknown>, {
        value: '',
        onChange: vi.fn(),
        placeholder: 'Search packages',
        examples: ['category:auth'],
        molId: 'cat',
      }),
    )
    const tips = q('[data-tooltip]')?.textContent ?? ''
    expect(tips).toContain('«searchUi.examplePhrase»')
    expect(tips).toContain('«searchUi.exampleExcluded»')
  })

  it('cancels the legacy IME confirmation Enter and hands a legacy IME key to the handler as composing', async () => {
    // What the key handler reads on each event: whether it was already cancelled, and `isComposing`.
    const onKeyDown = vi.fn((event: KeyboardEvent) => [
      event.defaultPrevented,
      event.isComposing,
      event.key,
    ])
    const boxTemplate = `<div mol-search-box
      [value]="p['value']"
      [onChange]="p['onChange']"
      [onKeyDown]="p['onKeyDown']"
      [placeholder]="p['placeholder']"
      [molId]="p['molId']"
    ></div>`
    const mountBox = async (props: Record<string, unknown>): Promise<void> => {
      mounted.push(await mount(boxTemplate, SearchBox as Type<unknown>, props))
    }
    /** Presses a key on the input; false when a listener cancelled the key's default action. */
    const press = (init: KeyboardEventInit): boolean =>
      (q('[data-mol-id="cat-input"]') as HTMLInputElement).dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
      )
    await mountBox({
      value: 'auth',
      onChange: vi.fn(),
      onKeyDown,
      placeholder: 'Search packages',
      molId: 'cat',
    })
    // An ordinary key reaches the handler as it is.
    expect(press({ key: 'ArrowDown' })).toBe(true)
    // An Enter the IME is still composing is the IME's own: it is handed over untouched.
    expect(press({ key: 'Enter', isComposing: true })).toBe(true)
    // A legacy IME confirms with key code 229 once composing ended: that Enter is
    // cancelled before the handler runs, so it submits nothing.
    expect(press({ key: 'Enter', keyCode: 229, isComposing: false })).toBe(false)
    // Another legacy key is left alone, and the handler still sees the IME composing.
    expect(press({ key: 'a', keyCode: 229 })).toBe(true)
    expect(press({ key: 'Escape' })).toBe(true)
    expect(onKeyDown.mock.results.map((call) => call.value)).toEqual([
      [false, false, 'ArrowDown'],
      [false, true, 'Enter'],
      [true, true, 'Enter'],
      [false, true, 'a'],
      [false, false, 'Escape'],
    ])

    // A field given no key handler cancels nothing.
    await mountBox({ value: 'auth', onChange: vi.fn(), placeholder: 'Search', molId: 'cat' })
    expect(press({ key: 'Enter', keyCode: 229, isComposing: false })).toBe(true)
  })
})

/** The document the result tests index (a type alias, so it is a `ClientSearchDocument`). */
type PackageDoc = { name: string; d: string }

describe('SearchResults', () => {
  const hits: SearchResultHit<PackageDoc>[] = [
    { id: 'a', doc: { name: 'api-auth', d: 'Sign in and sessions' }, terms: ['auth'] },
    { id: 'b', doc: { name: 'app-auth', d: 'Client auth' }, terms: ['auth'], related: true },
  ]
  const view = (doc: PackageDoc): SearchResultView => ({
    href: `/packages/${doc.name}`,
    title: doc.name,
    description: doc.d,
    meta: ['core', 'auth'],
    mono: true,
  })

  const resultsTemplate = `<mol-search-results
      [hits]="p['hits']"
      [view]="p['view']"
      [activeIndex]="p['activeIndex']"
      [onActivate]="p['onActivate']"
      [onOpen]="p['onOpen']"
      [onPrefetch]="p['onPrefetch']"
      [renderLink]="p['renderLink']"
      [emptyText]="p['emptyText']"
      [molId]="p['molId']"
    ></mol-search-results>`

  it('marks matches, flags the active and related rows, opens on a plain click, and lets modified clicks through', async () => {
    const onOpen = vi.fn()
    const onActivate = vi.fn()
    const onPrefetch = vi.fn()
    mounted.push(
      await mount(resultsTemplate, SearchResults as Type<unknown>, {
        hits,
        view,
        activeIndex: 1,
        onActivate,
        onOpen,
        onPrefetch,
        emptyText: 'Nothing',
        molId: 'cat',
      }),
    )
    const rows = (): NodeListOf<Element> =>
      mounted[mounted.length - 1]!.host.querySelectorAll('[data-mol-id="cat-hit"]')
    expect(rows().length).toBe(2)
    // The rows are a plain list of links: the active row is marked with
    // aria-current (absent when inactive), and no option/listbox roles remain.
    expect(rows()[1].getAttribute('aria-current')).toBe('true')
    expect(rows()[0].getAttribute('aria-current')).toBeNull()
    expect(
      mounted[mounted.length - 1]!.host.querySelectorAll('[role="listbox"], [role="option"]'),
    ).toHaveLength(0)
    expect(mounted[mounted.length - 1]!.host.querySelectorAll('[aria-selected]')).toHaveLength(0)
    // The active row is announced through the status region: title, position, count.
    expect(q('[data-mol-id="cat-active"]')?.getAttribute('role')).toBe('status')
    expect(q('[data-mol-id="cat-active"]')?.textContent?.trim()).toBe('app-auth, 2 of 2')
    expect(mounted[mounted.length - 1]!.host.querySelectorAll('mark').length).toBeGreaterThan(0)
    expect(q('[data-mol-id="cat-related"]')?.textContent).toBe('related')
    expect(rows()[0].textContent).toContain('core · auth')
    const link = rows()[0].querySelector('a') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/packages/api-auth')
    // The default link renders the row's content inside the anchor, never an empty one.
    expect(link.textContent).toContain('api-auth')
    link.click()
    await mounted[mounted.length - 1]!.flush()
    expect(onOpen).toHaveBeenCalledWith(hits[0].doc)
    onOpen.mockClear()
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }))
    expect(onOpen).not.toHaveBeenCalled()
    // The port binds the same bubbling pointerover React derives onPointerEnter from.
    rows()[0].dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    await mounted[mounted.length - 1]!.flush()
    expect(onPrefetch).toHaveBeenCalledWith(hits[0].doc)
  })

  it('renders through a custom link and shows the empty text', async () => {
    // The custom link is a host template ref, so this test mounts a dedicated
    // host holding it; the hits field updates between the two renders. The
    // ViewChild decorator is applied in its call form: this file sits under
    // the tsconfig's excluded tests glob, where decorator syntax does not
    // transform.
    class SpecCustomHost {
      /** The custom link template, read from the host's own template. */
      customLink?: TemplateRef<{ $implicit: SearchResultLinkProps }>
      /** The hits to render. */
      hits: SearchResultHit<PackageDoc>[] = hits
      /** The view. */
      view = view
      /** The open callback. */
      onOpen = (): void => {}
    }
    ViewChild('customLink')(SpecCustomHost.prototype, 'customLink')
    const Host = Component({
      selector: 'mol-spec-custom-host',
      standalone: true,
      imports: [SearchResults as Type<unknown>, NgTemplateOutlet],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<mol-search-results
          [hits]="hits"
          [view]="view"
          [activeIndex]="-1"
          [onOpen]="onOpen"
          [renderLink]="customLink"
          emptyText="Nothing"
        ></mol-search-results>
        <ng-template #customLink let-p
          ><span [attr.data-custom]="p.href"
            ><ng-container
              [ngTemplateOutlet]="p.children"
              [ngTemplateOutletContext]="p.childrenContext"
            ></ng-container></span
        ></ng-template>`,
    })(SpecCustomHost)
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    const ref: ComponentRef<{ hits: SearchResultHit<PackageDoc>[] }> = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    const m: Mounted = {
      host,
      flush: async () => {
        appRef.tick()
        await Promise.resolve()
        appRef.tick()
      },
      setProps: async (next: Record<string, unknown>): Promise<void> => {
        Object.assign(ref.instance, next)
        ref.changeDetectorRef.markForCheck()
        await Promise.resolve()
        appRef.tick()
      },
      destroy: async () => {
        appRef.destroy()
        host.remove()
      },
    }
    mounted.push(m)
    await m.flush()
    expect(host.querySelectorAll('[data-custom]').length).toBe(2)
    // The link renders the row body it is handed, with that row's hit.
    expect([...host.querySelectorAll('[data-custom]')].map((link) => link.textContent)).toEqual([
      expect.stringContaining('api-auth'),
      expect.stringContaining('app-auth'),
    ])
    // No row is active, so the status region is there but silent.
    expect(host.querySelector('[data-mol-id="search-active"]')?.getAttribute('role')).toBe('status')
    expect(host.querySelector('[data-mol-id="search-active"]')?.textContent?.trim()).toBe('')
    await m.setProps({ hits: [] })
    expect(host.textContent?.trim()).toBe('Nothing')
    // The status region exists in the empty state too, so it is live before results arrive.
    expect(host.querySelector('[data-mol-id="search-active"]')?.getAttribute('role')).toBe('status')
    expect(host.querySelector('[data-mol-id="search-active"]')?.textContent?.trim()).toBe('')
  })

  it('shows and removes the results wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div>@if (p['on']) {<mol-search-results [hits]="p['hits']" [view]="p['view']" [activeIndex]="-1" [onOpen]="p['onOpen']" molId="cat"></mol-search-results>}</div>`,
      SearchResults as Type<unknown>,
      { on: false, hits, view, onOpen: () => {} },
    )
    mounted.push(m)
    const row = (): HTMLElement | null => m.host.querySelector('[data-mol-id="cat-hit"]')
    expect(row()).toBeNull()
    await m.setProps({ on: true })
    // React renders the list beside the (unwrapped) component host.
    expect(row()).not.toBeNull()
    expect(row()?.isConnected).toBe(true)
    await m.setProps({ on: false })
    expect(row()).toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><mol-search-results [hits]="p['hits']" [view]="p['view']" [activeIndex]="-1" [onOpen]="p['onOpen']" [emptyText]="'Nothing'" molId="cat"></mol-search-results><i>b</i>`,
      SearchResults as Type<unknown>,
      { hits, view, onOpen: () => {} },
    )
    mounted.push(m)
    const tags = (): string[] => Array.from(m.host.children).map((el) => el.tagName.toLowerCase())
    // Non-empty: React's fragment is the <ul> plus the live status <p>.
    expect(tags()).toEqual(['i', 'ul', 'p', 'i'])
    expect(m.host.querySelector('mol-search-results')).toBeNull()
    // Toggle to the empty branch: the empty <p> plus the status <p>, still no host.
    await m.setProps({ hits: [] })
    expect(tags()).toEqual(['i', 'p', 'p', 'i'])
    expect(m.host.querySelector('mol-search-results')).toBeNull()
  })

  it('reveals the replacement active row when its index stays the same', async () => {
    const revealed = vi.fn(function (this: HTMLElement, options: ScrollIntoViewOptions) {
      return [this.dataset.hitId, options]
    })
    const old = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: revealed,
    })
    try {
      const m = await mount(resultsTemplate, SearchResults as Type<unknown>, {
        hits,
        view,
        activeIndex: 0,
        onOpen: () => {},
        emptyText: 'Nothing',
      })
      mounted.push(m)
      expect(revealed.mock.results.map((call) => call.value)).toEqual([
        [hits[0].id, { block: 'nearest' }],
      ])
      // The hits change under the component, as a new query's results do.
      await m.setProps({ hits: hits.slice(1), view })
      expect(revealed.mock.results.map((call) => call.value)).toEqual([
        [hits[0].id, { block: 'nearest' }],
        [hits[1].id, { block: 'nearest' }],
      ])
      // Rendering the same results again as equal new objects is not a new active row.
      await m.setProps({ hits: [{ ...hits[1] }], view })
      expect(revealed.mock.results.map((call) => call.value)).toEqual([
        [hits[0].id, { block: 'nearest' }],
        [hits[1].id, { block: 'nearest' }],
      ])
    } finally {
      if (old) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', old)
      else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    }
  })

  it('activates a row once per hover, and never for a touch contact', async () => {
    const onOpen = vi.fn()
    const onActivate = vi.fn()
    const onPrefetch = vi.fn()
    const m = await mount(resultsTemplate, SearchResults as Type<unknown>, {
      hits,
      view,
      activeIndex: -1,
      onActivate,
      onOpen,
      onPrefetch,
      emptyText: 'Nothing',
      molId: 'cat',
    })
    mounted.push(m)
    const rows = (): HTMLElement[] => [
      ...m.host.querySelectorAll<HTMLElement>('[data-mol-id="cat-hit"]'),
    ]
    const [first, second] = rows()
    // A mouse or pen entering the row activates it and warms its page; the mouse entry
    // the browser sends for the same move is not a second hover.
    first.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(onActivate.mock.calls).toEqual([[0]])
    expect(onPrefetch.mock.calls).toEqual([[hits[0].doc]])
    first.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    // Moving between the row's own children is not an entry.
    const [heading, description] = [...first.querySelector('a')!.children] as HTMLElement[]
    description.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
        relatedTarget: heading,
      }),
    )
    expect(onActivate).toHaveBeenCalledTimes(1)
    expect(onPrefetch).toHaveBeenCalledTimes(1)
    // Leaving and coming back is a new hover.
    const around = first.parentElement!
    first.dispatchEvent(
      new PointerEvent('pointerout', {
        bubbles: true,
        pointerType: 'mouse',
        relatedTarget: around,
      }),
    )
    first.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: around }))
    expect(onActivate).toHaveBeenCalledTimes(1)
    first.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(onActivate.mock.calls).toEqual([[0], [0]])
    onActivate.mockClear()
    onPrefetch.mockClear()
    // A finger is not a hover: the row warms on the touch itself, and the mouse event a
    // browser sends after the touch is not a hover either.
    second.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }))
    second.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    second.dispatchEvent(new Event('touchstart', { bubbles: true }))
    expect(onActivate).not.toHaveBeenCalled()
    expect(onPrefetch.mock.calls).toEqual([[hits[1].doc]])
    // A pen entering afterwards is a hover again.
    second.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'pen' }))
    expect(onActivate.mock.calls).toEqual([[1]])
  })
})

/** The document the quick-search test indexes. */
type QuickDoc = { name: string }

describe('QuickSearchDialog', () => {
  it('moves focus into the field through its ref when it opens, and renders hits as anchors with content', async () => {
    const inputRef = { current: null as HTMLInputElement | null }
    // The Angular session holds every reactive field in a signal, as `useSearchSession` returns it.
    const session: SearchSession<QuickDoc> = {
      inputRef,
      query: signal('auth'),
      setQuery: () => {},
      clear: () => {},
      parsed: signal(parseQuery('auth')),
      hits: signal([
        { id: 'a', score: 1, doc: { name: 'api-auth' }, terms: ['auth'], fields: ['name'] },
      ]),
      active: signal(true),
      ranked: signal(true),
      activeIndex: signal(0),
      setActiveIndex: () => {},
      onKeyDown: () => {},
      removeFilter: () => {},
      open: () => {},
      prefetch: () => {},
      focus: () => {},
    }
    const dialogTemplate = `<mol-quick-search-dialog
      [open]="p['open']"
      [onClose]="p['onClose']"
      [session]="p['session']"
      [view]="p['view']"
      [placeholder]="p['placeholder']"
      [emptyText]="p['emptyText']"
      [label]="p['label']"
    ></mol-quick-search-dialog>`
    mounted.push(
      await mount(dialogTemplate, QuickSearchDialog as Type<unknown>, {
        open: true,
        onClose: () => {},
        session,
        view: (doc: QuickDoc): SearchResultView => ({
          href: `/packages/${doc.name}`,
          title: doc.name,
        }),
        placeholder: 'Search packages',
        emptyText: 'Nothing',
      }),
    )
    expect(q('[role="dialog"]')).not.toBeNull()
    // The dialog is named for screen readers: "Search" by default, the
    // caller's `label` when one is passed.
    expect(q('[role="dialog"]')?.getAttribute('aria-label')).toBe('Search')
    expect(inputRef.current).toBe(q('[data-mol-id="quick-search-input"]'))
    expect(document.activeElement).toBe(inputRef.current)
    expect(q('[data-mol-id="quick-search-link"]')?.textContent).toBe('api-auth')
    await mounted[mounted.length - 1]!.setProps({ label: 'Find a package' })
    expect(q('[role="dialog"]')?.getAttribute('aria-label')).toBe('Find a package')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const session: SearchSession<QuickDoc> = {
      inputRef: { current: null },
      query: signal(''),
      setQuery: () => {},
      clear: () => {},
      parsed: signal(parseQuery('')),
      hits: signal([]),
      active: signal(false),
      ranked: signal(false),
      activeIndex: signal(-1),
      setActiveIndex: () => {},
      onKeyDown: () => {},
      removeFilter: () => {},
      open: () => {},
      prefetch: () => {},
      focus: () => {},
    }
    const m = await mount(
      `<i>a</i><mol-quick-search-dialog [open]="p['open']" [session]="p['session']" [view]="p['view']" [placeholder]="'Search'" [emptyText]="'Nothing'"></mol-quick-search-dialog><i>b</i>`,
      QuickSearchDialog as Type<unknown>,
      {
        open: true,
        session,
        view: (doc: QuickDoc): SearchResultView => ({ href: `/p/${doc.name}`, title: doc.name }),
      },
    )
    mounted.push(m)
    // React renders the modal's content or nothing; the host never appears.
    expect(m.host.querySelector('mol-quick-search-dialog')).toBeNull()
    expect(m.host.querySelector('[role="dialog"]')).not.toBeNull()
    await m.setProps({ open: false })
    expect(m.host.querySelector('mol-quick-search-dialog')).toBeNull()
    expect(m.host.querySelector('[role="dialog"]')).toBeNull()
  })
})

describe('Highlight', () => {
  it('wraps matched words in mark elements', async () => {
    mounted.push(
      await mount(
        `<mol-highlight text="User feedback" [terms]="p['terms']"></mol-highlight>`,
        Highlight as Type<unknown>,
        { terms: ['feedback'] },
      ),
    )
    expect(mounted[mounted.length - 1]!.host.innerHTML).toContain('<mark')
    expect(mounted[mounted.length - 1]!.host.textContent).toBe('User feedback')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><mol-highlight text="User feedback" [terms]="p['terms']"></mol-highlight><i>b</i>`,
      Highlight as Type<unknown>,
      { terms: ['feedback'] },
    )
    mounted.push(m)
    const tags = (): string[] => Array.from(m.host.children).map((el) => el.tagName.toLowerCase())
    // React's fragment is plain text plus the matched <mark>, no host element.
    expect(tags()).toEqual(['i', 'mark', 'i'])
    expect(m.host.querySelector('mol-highlight')).toBeNull()
    await m.setProps({ terms: [] })
    expect(tags()).toEqual(['i', 'i'])
    expect(m.host.querySelector('mol-highlight')).toBeNull()
  })
})

describe('Kbd', () => {
  it('renders a kbd cap with the given class and label', async () => {
    mounted.push(
      await mount(`<kbd mol-kbd [className]="p['className']">↵</kbd>`, Kbd as Type<unknown>, {
        className: 'parity-kbd',
      }),
    )
    const kbd = q('kbd') as HTMLElement
    expect(kbd.tagName).toBe('KBD')
    expect(kbd.getAttribute('class')).toContain('kbd')
    expect(kbd.getAttribute('class')).toContain('parity-kbd')
    expect(kbd.textContent).toBe('↵')
  })

  it('marks a key cap with translate="no" so a key name is never translated', async () => {
    mounted.push(await mount(`<kbd mol-kbd>esc</kbd>`, Kbd as Type<unknown>))
    expect(q('kbd')?.getAttribute('translate')).toBe('no')
  })
})
