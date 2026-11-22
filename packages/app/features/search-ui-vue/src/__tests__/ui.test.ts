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

beforeAll(() => setClassMap(classMap))

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
      key === 'searchUi.examplePhrase' || key === 'searchUi.exampleExcluded'
        ? `«${key}»`
        : (opts?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m: string, k: string) =>
            String(values?.[k] ?? ''),
          ),
  }),
}))
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
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
