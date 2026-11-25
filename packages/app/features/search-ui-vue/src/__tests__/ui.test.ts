// @vitest-environment jsdom
/**
 * Unit tests for the Vue search UI — a port of
 * `@molecule/app-search-ui-react/src/__tests__/ui.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  type App,
  type Component,
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  reactive,
  ref,
  type VNodeChild,
} from 'vue'

import { parseQuery } from '@molecule/app-client-search'
import type { SearchSession } from '@molecule/app-client-search-vue'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import type * as UI from '@molecule/app-ui-vue'

beforeAll(() => setClassMap(classMap))

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
      key === 'searchUi.examplePhrase' || key === 'searchUi.exampleExcluded'
        ? `«${key}»`
        : (opts?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m: string, k: string) =>
            String(values?.[k] ?? ''),
          ),
  }),
}))
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<typeof UI>()),
    Icon: defineComponent({
      props: { name: { type: String, required: true } },
      setup: (props) => () => h('svg', { 'data-icon': props.name }),
    }),
    Modal: defineComponent({
      props: { open: { type: Boolean, required: true } },
      setup:
        (props, { slots, attrs }) =>
        () =>
          props.open
            ? h('div', { role: 'dialog', 'aria-label': attrs['aria-label'] }, slots.default?.())
            : null,
    }),
    Tooltip: defineComponent({
      props: { content: null },
      setup:
        (props, { slots }) =>
        () =>
          h('span', null, [slots.default?.(), h('span', { 'data-tooltip': '' }, props.content)]),
    }),
  }
})

const { SearchBox } = await import('../SearchBox.js')
const { SearchResults } = await import('../SearchResults.js')
const { QuickSearchDialog } = await import('../QuickSearchDialog.js')
const { Highlight } = await import('../Highlight.js')
const { Kbd } = await import('../Kbd.js')

interface Mount {
  /** The element the app is mounted on. */
  host: HTMLElement
  /** Merges props into the running render, as React's re-render does. */
  setProps: (next: Record<string, unknown>) => Promise<void>
}

let app: App<Element> | null = null
let mounted: Mount | null = null
afterEach(() => {
  app?.unmount()
  app = null
  mounted = null
  document.body.innerHTML = ''
})

/** Mounts a component with reactive props; the same render/update cycle React's act() drives. */
const mountWith = (comp: Component, props: Record<string, unknown>): Mount => {
  app?.unmount()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const state = reactive({ props })
  app = createApp(defineComponent({ setup: () => () => h(comp, state.props) }))
  app.mount(host)
  mounted = {
    host,
    setProps: async (next: Record<string, unknown>): Promise<void> => {
      Object.assign(state.props, next)
      await nextTick()
    },
  }
  return mounted
}

const q = (sel: string): Element | null => mounted?.host.querySelector(sel) ?? null

describe('SearchBox', () => {
  it('shows the placeholder, the shortcut cap and the help icon while empty, and the count and chips while searching', async () => {
    const onChange = vi.fn()
    const onRemove = vi.fn()
    const onClear = vi.fn()
    mountWith(SearchBox, {
      value: '',
      onChange,
      placeholder: 'Search packages',
      examples: ['category:auth'],
      afterField: h('nav', { 'data-mol-id': 'cat-tabs' }),
      molId: 'cat',
    })
    const input = q('[data-mol-id="cat-input"]') as HTMLInputElement
    expect(input.placeholder).toBe('Search packages')
    const caps = (): (string | null)[] =>
      [...mounted!.host.querySelectorAll('kbd')].map((k) => k.textContent)
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

    await mounted!.setProps({
      value: 'category:auth oauth',
      onChange,
      onClear,
      onRemoveFilter: onRemove,
      filters: [{ field: 'category', values: ['auth'] }],
      count: 7,
      placeholder: 'Search packages',
      examples: ['category:auth'],
      molId: 'cat',
      afterField: undefined,
    })
    expect(caps()).not.toContain('/')
    expect(q('[data-mol-id="cat-count"]')?.textContent).toBe('7 results')
    const chip = q('[data-mol-id="cat-filter"]') as HTMLButtonElement
    expect(chip.textContent).toContain('category: auth')
    chip.click()
    await nextTick()
    expect(onRemove).toHaveBeenCalledWith(0)
    ;(q('[data-mol-id="cat-clear"]') as HTMLButtonElement).click()
    await nextTick()
    expect(onClear).toHaveBeenCalled()
    expect(q('[data-mol-id="cat-tips"]')).toBeNull()
  })

  it('takes the two built-in example tokens through i18n with their keys', async () => {
    mountWith(SearchBox, {
      value: '',
      onChange: vi.fn(),
      placeholder: 'Search packages',
      examples: ['category:auth'],
      molId: 'cat',
    })
    await nextTick()
    const tips = q('[data-tooltip]')?.textContent ?? ''
    expect(tips).toContain('«searchUi.examplePhrase»')
    expect(tips).toContain('«searchUi.exampleExcluded»')
  })

  it('cancels the legacy IME confirmation Enter and hands a legacy IME key to the handler as composing', () => {
    // What the key handler reads on each event: whether it was already cancelled, and `isComposing`.
    const onKeyDown = vi.fn((event: KeyboardEvent) => [
      event.defaultPrevented,
      event.isComposing,
      event.key,
    ])
    mountWith(SearchBox, {
      value: 'auth',
      onChange: vi.fn(),
      onKeyDown,
      placeholder: 'Search packages',
      molId: 'cat',
    })
    /** Presses a key on the input; false when a listener cancelled the key's default action. */
    const press = (init: KeyboardEventInit): boolean =>
      (q('[data-mol-id="cat-input"]') as HTMLInputElement).dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
      )
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
    mountWith(SearchBox, { value: 'auth', onChange: vi.fn(), placeholder: 'Search', molId: 'cat' })
    expect(press({ key: 'Enter', keyCode: 229, isComposing: false })).toBe(true)
  })
})

/** The document the result tests index (a type alias, so it is a `ClientSearchDocument`). */
type PackageDoc = { name: string; d: string }

describe('SearchResults', () => {
  const hits = [
    { id: 'a', doc: { name: 'api-auth', d: 'Sign in and sessions' }, terms: ['auth'] },
    { id: 'b', doc: { name: 'app-auth', d: 'Client auth' }, terms: ['auth'], related: true },
  ]
  const view = (doc: PackageDoc): Record<string, unknown> => ({
    href: `/packages/${doc.name}`,
    title: doc.name,
    description: doc.d,
    meta: ['core', 'auth'],
    mono: true,
  })

  it('marks matches, flags the active and related rows, opens on a plain click, and lets modified clicks through', async () => {
    const onOpen = vi.fn()
    const onActivate = vi.fn()
    const onPrefetch = vi.fn()
    mountWith(SearchResults, {
      hits,
      view,
      activeIndex: 1,
      onActivate,
      onOpen,
      onPrefetch,
      emptyText: 'Nothing',
      molId: 'cat',
    })
    const rows = (): NodeListOf<Element> =>
      mounted!.host.querySelectorAll('[data-mol-id="cat-hit"]')
    expect(rows().length).toBe(2)
    // The rows are a plain list of links: the active row is marked with
    // aria-current (absent when inactive), and no option/listbox roles remain.
    expect(rows()[1].getAttribute('aria-current')).toBe('true')
    expect(rows()[0].getAttribute('aria-current')).toBeNull()
    expect(mounted!.host.querySelectorAll('[role="listbox"], [role="option"]')).toHaveLength(0)
    expect(mounted!.host.querySelectorAll('[aria-selected]')).toHaveLength(0)
    // The active row is announced through the status region: title, position, count.
    expect(q('[data-mol-id="cat-active"]')?.getAttribute('role')).toBe('status')
    expect(q('[data-mol-id="cat-active"]')?.textContent).toBe('app-auth, 2 of 2')
    expect(mounted!.host.querySelectorAll('mark').length).toBeGreaterThan(0)
    expect(q('[data-mol-id="cat-related"]')?.textContent).toBe('related')
    expect(rows()[0].textContent).toContain('core · auth')
    const link = rows()[0].querySelector('a') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/packages/api-auth')
    // The default link renders the row's content inside the anchor, never an empty one.
    expect(link.textContent).toContain('api-auth')
    link.click()
    await nextTick()
    expect(onOpen).toHaveBeenCalledWith(hits[0].doc)
    onOpen.mockClear()
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }))
    expect(onOpen).not.toHaveBeenCalled()
    // The port binds the same bubbling pointerover React derives onPointerEnter from.
    rows()[0].dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    expect(onPrefetch).toHaveBeenCalledWith(hits[0].doc)
  })

  it('renders through a custom link and shows the empty text', async () => {
    const renderLink = vi.fn((p: { href: string; children: VNodeChild }) =>
      h('span', { 'data-custom': p.href }, [p.children]),
    )
    mountWith(SearchResults, {
      hits,
      view,
      activeIndex: -1,
      onOpen: () => {},
      renderLink,
      emptyText: 'Nothing',
    })
    expect(mounted!.host.querySelectorAll('[data-custom]').length).toBe(2)
    // The link renders the row body it is handed, with that row's hit.
    expect(
      [...mounted!.host.querySelectorAll('[data-custom]')].map((link) => link.textContent),
    ).toEqual([expect.stringContaining('api-auth'), expect.stringContaining('app-auth')])
    // No row is active, so the status region is there but silent.
    expect(q('[data-mol-id="search-active"]')?.getAttribute('role')).toBe('status')
    expect(q('[data-mol-id="search-active"]')?.textContent).toBe('')
    await mounted!.setProps({ hits: [] })
    expect(mounted!.host.textContent).toBe('Nothing')
    // The status region exists in the empty state too, so it is live before results arrive.
    expect(q('[data-mol-id="search-active"]')?.getAttribute('role')).toBe('status')
    expect(q('[data-mol-id="search-active"]')?.textContent).toBe('')
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
      mountWith(SearchResults, {
        hits,
        view,
        activeIndex: 0,
        onOpen: () => {},
        emptyText: 'Nothing',
      })
      expect(revealed.mock.results.map((call) => call.value)).toEqual([
        [hits[0].id, { block: 'nearest' }],
      ])
      await mounted!.setProps({ hits: hits.slice(1), view, activeIndex: 0 })
      expect(revealed.mock.results.map((call) => call.value)).toEqual([
        [hits[0].id, { block: 'nearest' }],
        [hits[1].id, { block: 'nearest' }],
      ])
      // Rendering the same results again as equal new objects is not a new active row.
      await mounted!.setProps({ hits: [{ ...hits[1] }], view, activeIndex: 0 })
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
    mountWith(SearchResults, {
      hits,
      view,
      activeIndex: -1,
      onActivate,
      onOpen,
      onPrefetch,
      emptyText: 'Nothing',
      molId: 'cat',
    })
    const rows = (): HTMLElement[] => [
      ...mounted!.host.querySelectorAll<HTMLElement>('[data-mol-id="cat-hit"]'),
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
    // The Vue session holds every reactive field in a ref or computed, as `useSearchSession` returns it.
    const session: SearchSession<QuickDoc> = {
      inputRef,
      query: ref('auth'),
      setQuery: () => {},
      clear: () => {},
      parsed: computed(() => parseQuery('auth')),
      hits: computed(() => [
        { id: 'a', score: 1, doc: { name: 'api-auth' }, terms: ['auth'], fields: ['name'] },
      ]),
      active: computed(() => true),
      ranked: computed(() => true),
      activeIndex: ref(0),
      setActiveIndex: () => {},
      onKeyDown: () => {},
      removeFilter: () => {},
      open: () => {},
      prefetch: () => {},
      focus: () => {},
    }
    const view = (doc: QuickDoc): Record<string, unknown> => ({
      href: `/packages/${doc.name}`,
      title: doc.name,
    })
    const dialog = mountWith(QuickSearchDialog, {
      open: true,
      onClose: () => {},
      session,
      view,
      placeholder: 'Search packages',
      emptyText: 'Nothing',
    })
    expect(q('[role="dialog"]')).not.toBeNull()
    // The dialog is named for screen readers: "Search" by default, the
    // caller's `label` when one is passed.
    expect(q('[role="dialog"]')?.getAttribute('aria-label')).toBe('Search')
    expect(inputRef.current).toBe(q('[data-mol-id="quick-search-input"]'))
    expect(document.activeElement).toBe(inputRef.current)
    expect(q('[data-mol-id="quick-search-link"]')?.textContent).toBe('api-auth')
    await dialog.setProps({
      open: true,
      onClose: () => {},
      session,
      view,
      placeholder: 'Search packages',
      emptyText: 'Nothing',
      label: 'Find a package',
    })
    expect(q('[role="dialog"]')?.getAttribute('aria-label')).toBe('Find a package')
  })
})

describe('Highlight', () => {
  it('wraps matched words in mark elements', () => {
    mountWith(Highlight, { text: 'User feedback', terms: ['feedback'] })
    expect(mounted!.host.innerHTML).toContain('<mark')
    expect(mounted!.host.textContent).toBe('User feedback')
  })
})

describe('Kbd', () => {
  it('marks a key cap with translate="no" so a key name is never translated', () => {
    mountWith(Kbd, { children: 'esc' })
    expect(q('kbd')?.getAttribute('translate')).toBe('no')
  })
})
