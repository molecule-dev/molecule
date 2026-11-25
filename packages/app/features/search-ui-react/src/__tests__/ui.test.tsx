import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { parseQuery } from '@molecule/app-client-search'
import type { SearchSession } from '@molecule/app-client-search-react'
import { type OverlayTarget, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
      key === 'searchUi.examplePhrase' || key === 'searchUi.exampleExcluded'
        ? `«${key}»`
        : (opts?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, k) =>
            String(values?.[k] ?? ''),
          ),
  }),
}))
vi.mock('@molecule/app-ui-react', () => ({
  Icon: ({ name }: { name: string }) => createElement('svg', { 'data-icon': name }),
  Modal: ({
    open,
    children,
    initialFocus,
    'aria-label': ariaLabel,
  }: {
    open: boolean
    children: React.ReactNode
    initialFocus?: OverlayTarget
    'aria-label'?: string
  }) => {
    useEffect(() => {
      if (open) initialFocus?.current?.focus()
    }, [open, initialFocus])
    return open
      ? createElement(
          'div',
          {
            role: 'dialog',
            'aria-label': ariaLabel,
            'data-initial-focus': initialFocus ? 'true' : undefined,
          },
          children,
        )
      : null
  },
  Tooltip: ({ content, children }: { content: React.ReactNode; children: React.ReactNode }) =>
    createElement('span', null, children, createElement('span', { 'data-tooltip': '' }, content)),
}))

const { SearchBox } = await import('../SearchBox.js')
const { SearchResults } = await import('../SearchResults.js')
const { QuickSearchDialog } = await import('../QuickSearchDialog.js')
const { Highlight } = await import('../Highlight.js')
const { Kbd } = await import('../Kbd.js')

beforeAll(() => setClassMap(classMap))

let root: Root | null = null
let container: HTMLDivElement
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
})
function render(node: React.ReactElement): HTMLDivElement {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(node))
  return container
}
const q = (sel: string): HTMLElement | null => container.querySelector(sel)

describe('SearchBox', () => {
  it('shows the placeholder, the shortcut cap and the help icon while empty, and the count and chips while searching', () => {
    const onChange = vi.fn()
    const onRemove = vi.fn()
    const onClear = vi.fn()
    render(
      createElement(SearchBox, {
        value: '',
        onChange,
        placeholder: 'Search packages',
        examples: ['category:auth'],
        afterField: createElement('nav', { 'data-mol-id': 'cat-tabs' }),
        molId: 'cat',
      }),
    )
    const input = q('[data-mol-id="cat-input"]') as HTMLInputElement
    expect(input.placeholder).toBe('Search packages')
    const caps = () => [...container.querySelectorAll('kbd')].map((k) => k.textContent)
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

    act(() =>
      root!.render(
        createElement(SearchBox, {
          value: 'category:auth oauth',
          onChange,
          onClear,
          onRemoveFilter: onRemove,
          filters: [{ field: 'category', values: ['auth'] }],
          count: 7,
          placeholder: 'Search packages',
          examples: ['category:auth'],
          molId: 'cat',
        }),
      ),
    )
    expect(caps()).not.toContain('/')
    expect(q('[data-mol-id="cat-count"]')?.textContent).toBe('7 results')
    const chip = q('[data-mol-id="cat-filter"]') as HTMLButtonElement
    expect(chip.textContent).toContain('category: auth')
    act(() => chip.click())
    expect(onRemove).toHaveBeenCalledWith(0)
    act(() => (q('[data-mol-id="cat-clear"]') as HTMLButtonElement).click())
    expect(onClear).toHaveBeenCalled()
    expect(q('[data-mol-id="cat-tips"]')).toBeNull()
  })

  it('takes the two built-in example tokens through i18n with their keys', () => {
    render(
      createElement(SearchBox, {
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
})

/** The document the result tests index (a type alias, so it is a `ClientSearchDocument`). */
type PackageDoc = { name: string; d: string }

describe('SearchResults', () => {
  const hits = [
    { id: 'a', doc: { name: 'api-auth', d: 'Sign in and sessions' }, terms: ['auth'] },
    { id: 'b', doc: { name: 'app-auth', d: 'Client auth' }, terms: ['auth'], related: true },
  ]
  const view = (doc: PackageDoc) => ({
    href: `/packages/${doc.name}`,
    title: doc.name,
    description: doc.d,
    meta: ['core', 'auth'],
    mono: true,
  })

  it('marks matches, flags the active and related rows, opens on a plain click, and lets modified clicks through', () => {
    const onOpen = vi.fn()
    const onActivate = vi.fn()
    const onPrefetch = vi.fn()
    render(
      createElement(SearchResults<PackageDoc>, {
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
    const rows = container.querySelectorAll('[data-mol-id="cat-hit"]')
    expect(rows.length).toBe(2)
    // The rows are a plain list of links: the active row is marked with
    // aria-current (absent when inactive), and no option/listbox roles remain.
    expect(rows[1].getAttribute('aria-current')).toBe('true')
    expect(rows[0].getAttribute('aria-current')).toBeNull()
    expect(container.querySelectorAll('[role="listbox"], [role="option"]')).toHaveLength(0)
    expect(container.querySelectorAll('[aria-selected]')).toHaveLength(0)
    // The active row is announced through the status region: title, position, count.
    expect(q('[data-mol-id="cat-active"]')?.getAttribute('role')).toBe('status')
    expect(q('[data-mol-id="cat-active"]')?.textContent).toBe('app-auth, 2 of 2')
    expect(container.querySelectorAll('mark').length).toBeGreaterThan(0)
    expect(q('[data-mol-id="cat-related"]')?.textContent).toBe('related')
    expect(rows[0].textContent).toContain('core · auth')
    const link = rows[0].querySelector('a') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/packages/api-auth')
    // The default link renders the row's content inside the anchor, never an empty one.
    expect(link.textContent).toContain('api-auth')
    act(() => link.click())
    expect(onOpen).toHaveBeenCalledWith(hits[0].doc)
    onOpen.mockClear()
    act(() =>
      link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }),
      ),
    )
    expect(onOpen).not.toHaveBeenCalled()
    // React derives onPointerEnter from pointerover/pointerout at the root.
    act(() => rows[0].dispatchEvent(new PointerEvent('pointerover', { bubbles: true })))
    expect(onPrefetch).toHaveBeenCalledWith(hits[0].doc)
  })

  it('renders through a custom link and shows the empty text', () => {
    const renderLink = vi.fn((p: { href: string; children: React.ReactNode }) =>
      createElement('span', { 'data-custom': p.href }, p.children),
    )
    render(
      createElement(SearchResults<PackageDoc>, {
        hits,
        view,
        activeIndex: -1,
        onOpen: () => {},
        renderLink,
        emptyText: 'Nothing',
      }),
    )
    expect(container.querySelectorAll('[data-custom]').length).toBe(2)
    // The link renders the row body it is handed, with that row's hit.
    expect(
      [...container.querySelectorAll('[data-custom]')].map((link) => link.textContent),
    ).toEqual([expect.stringContaining('api-auth'), expect.stringContaining('app-auth')])
    // No row is active, so the status region is there but silent.
    expect(q('[data-mol-id="search-active"]')?.getAttribute('role')).toBe('status')
    expect(q('[data-mol-id="search-active"]')?.textContent).toBe('')
    act(() =>
      root!.render(
        createElement(SearchResults<PackageDoc>, {
          hits: [],
          view,
          activeIndex: -1,
          onOpen: () => {},
          emptyText: 'Nothing',
        }),
      ),
    )
    expect(container.textContent).toBe('Nothing')
    // The status region exists in the empty state too, so it is live before results arrive.
    expect(q('[data-mol-id="search-active"]')?.getAttribute('role')).toBe('status')
    expect(q('[data-mol-id="search-active"]')?.textContent).toBe('')
  })

  it('reveals the replacement active row when its index stays the same', () => {
    const revealed = vi.fn(function (this: HTMLElement, options: ScrollIntoViewOptions) {
      return [this.dataset.hitId, options]
    })
    const old = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: revealed,
    })
    try {
      render(
        <SearchResults
          hits={hits}
          view={view}
          activeIndex={0}
          onOpen={() => {}}
          emptyText="Nothing"
        />,
      )
      expect(revealed.mock.results.map((call) => call.value)).toEqual([
        [hits[0].id, { block: 'nearest' }],
      ])
      act(() =>
        root?.render(
          <SearchResults
            hits={hits.slice(1)}
            view={view}
            activeIndex={0}
            onOpen={() => {}}
            emptyText="Nothing"
          />,
        ),
      )
      expect(revealed.mock.results.map((call) => call.value)).toEqual([
        [hits[0].id, { block: 'nearest' }],
        [hits[1].id, { block: 'nearest' }],
      ])
    } finally {
      if (old) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', old)
      else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    }
  })
})

/** The document the quick-search test indexes. */
type QuickDoc = { name: string }

describe('QuickSearchDialog', () => {
  it('moves focus into the field through its ref when it opens, and renders hits as anchors with content', () => {
    const inputRef = { current: null as HTMLInputElement | null }
    const session: SearchSession<QuickDoc> = {
      inputRef,
      query: 'auth',
      setQuery: () => {},
      clear: () => {},
      parsed: parseQuery('auth'),
      hits: [{ id: 'a', score: 1, doc: { name: 'api-auth' }, terms: ['auth'], fields: ['name'] }],
      active: true,
      ranked: true,
      activeIndex: 0,
      setActiveIndex: () => {},
      onKeyDown: () => {},
      removeFilter: () => {},
      open: () => {},
      prefetch: () => {},
      focus: () => {},
    }
    const view = (doc: QuickDoc) => ({ href: `/packages/${doc.name}`, title: doc.name })
    render(
      createElement(QuickSearchDialog<QuickDoc>, {
        open: true,
        onClose: () => {},
        session,
        view,
        placeholder: 'Search packages',
        emptyText: 'Nothing',
      }),
    )
    expect(q('[role="dialog"]')).not.toBeNull()
    // The dialog is named for screen readers: "Search" by default, the
    // caller's `label` when one is passed.
    expect(q('[role="dialog"]')?.getAttribute('aria-label')).toBe('Search')
    expect(q('[role="dialog"]')?.getAttribute('data-initial-focus')).toBe('true')
    expect(inputRef.current).toBe(q('[data-mol-id="quick-search-input"]'))
    expect(document.activeElement).toBe(inputRef.current)
    expect(q('[data-mol-id="quick-search-link"]')?.textContent).toBe('api-auth')

    act(() =>
      root!.render(
        createElement(QuickSearchDialog<QuickDoc>, {
          open: true,
          onClose: () => {},
          session,
          view,
          placeholder: 'Search packages',
          emptyText: 'Nothing',
          label: 'Find a package',
        }),
      ),
    )
    expect(q('[role="dialog"]')?.getAttribute('aria-label')).toBe('Find a package')
  })
})

describe('Highlight', () => {
  it('wraps matched words in mark elements', () => {
    render(createElement(Highlight, { text: 'User feedback', terms: ['feedback'] }))
    expect(container.innerHTML).toContain('<mark')
    expect(container.textContent).toBe('User feedback')
  })
})

describe('Kbd', () => {
  it('marks a key cap with translate="no" so a key name is never translated', () => {
    render(createElement(Kbd, { children: 'esc' }))
    expect(q('kbd')?.getAttribute('translate')).toBe('no')
  })
})
