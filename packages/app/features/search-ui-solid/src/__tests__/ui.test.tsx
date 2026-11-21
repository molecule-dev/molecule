// @vitest-environment jsdom
/**
 * Unit tests for the Solid search UI — a port of
 * `@molecule/app-search-ui-react/src/__tests__/ui.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { parseQuery } from '@molecule/app-client-search'
import type { SearchSession } from '@molecule/app-client-search-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type {
  SearchBoxProps,
  SearchResultLinkProps,
  SearchResultsProps,
  SearchResultView,
} from '../types.js'

vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
      key === 'searchUi.examplePhrase' || key === 'searchUi.exampleExcluded'
        ? `«${key}»`
        : (opts?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m: string, k: string) =>
            String(values?.[k] ?? ''),
          ),
  }),
}))
vi.mock('@molecule/app-ui-solid', () => ({
  Icon: (props: { name: string }) => <svg data-icon={props.name} />,
  Modal: (props: { open: boolean; 'aria-label'?: string; children?: JSX.Element }) =>
    props.open ? (
      <div role="dialog" aria-label={props['aria-label']}>
        {props.children}
      </div>
    ) : null,
  Tooltip: (props: { content?: JSX.Element; children?: JSX.Element }) => (
    <span>
      {props.children}
      <span data-tooltip="">{props.content}</span>
    </span>
  ),
}))

const { SearchBox } = await import('../SearchBox.jsx')
const { SearchResults } = await import('../SearchResults.jsx')
const { QuickSearchDialog } = await import('../QuickSearchDialog.jsx')
const { Highlight } = await import('../Highlight.jsx')
const { Kbd } = await import('../Kbd.jsx')

beforeAll(() => setClassMap(classMap))

const disposers: (() => void)[] = []
let container: HTMLElement | null = null
afterEach(() => {
  for (const dispose of disposers) dispose()
  disposers.length = 0
  container = null
  document.body.innerHTML = ''
})

/** Renders a body into a fresh container, the mount React's render() replaces per test. */
const mountWith = (body: () => JSX.Element): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  container = host
  disposers.push(render(body, host))
  return host
}
const q = (sel: string): Element | null => container?.querySelector(sel) ?? null

describe('SearchBox', () => {
  it('shows the placeholder, the shortcut cap and the help icon while empty, and the count and chips while searching', () => {
    const onChange = vi.fn()
    const onRemove = vi.fn()
    const onClear = vi.fn()
    const [boxProps, setBoxProps] = createSignal<SearchBoxProps>({
      value: '',
      onChange,
      placeholder: 'Search packages',
      examples: ['category:auth'],
      afterField: <nav data-mol-id="cat-tabs" />,
      molId: 'cat',
    })
    mountWith(() => <SearchBox {...boxProps()} />)
    const input = q('[data-mol-id="cat-input"]') as HTMLInputElement
    expect(input.placeholder).toBe('Search packages')
    const caps = (): (string | null)[] =>
      [...container!.querySelectorAll('kbd')].map((k) => k.textContent)
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

    // The second render replaces the props, as React's re-render does.
    setBoxProps({
      value: 'category:auth oauth',
      onChange,
      onClear,
      onRemoveFilter: onRemove,
      filters: [{ field: 'category', values: ['auth'] }],
      count: 7,
      placeholder: 'Search packages',
      examples: ['category:auth'],
      molId: 'cat',
    })
    expect(caps()).not.toContain('/')
    expect(q('[data-mol-id="cat-count"]')?.textContent).toBe('7 results')
    const chip = q('[data-mol-id="cat-filter"]') as HTMLButtonElement
    expect(chip.textContent).toContain('category: auth')
    chip.click()
    expect(onRemove).toHaveBeenCalledWith(0)
    ;(q('[data-mol-id="cat-clear"]') as HTMLButtonElement).click()
    expect(onClear).toHaveBeenCalled()
    expect(q('[data-mol-id="cat-tips"]')).toBeNull()
  })

  it('takes the two built-in example tokens through i18n with their keys', () => {
    mountWith(() => (
      <SearchBox
        value=""
        onChange={vi.fn()}
        placeholder="Search packages"
        examples={['category:auth']}
        molId="cat"
      />
    ))
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
  const view = (doc: PackageDoc): SearchResultView => ({
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
    const [listProps] = createSignal<SearchResultsProps<PackageDoc>>({
      hits,
      view,
      activeIndex: 1,
      onActivate,
      onOpen,
      onPrefetch,
      emptyText: 'Nothing',
      molId: 'cat',
    })
    mountWith(() => <SearchResults {...listProps()} />)
    const rows = (): NodeListOf<Element> => container!.querySelectorAll('[data-mol-id="cat-hit"]')
    expect(rows().length).toBe(2)
    // The rows are a plain list of links: the active row is marked with
    // aria-current (absent when inactive), and no option/listbox roles remain.
    expect(rows()[1].getAttribute('aria-current')).toBe('true')
    expect(rows()[0].getAttribute('aria-current')).toBeNull()
    expect(container!.querySelectorAll('[role="listbox"], [role="option"]')).toHaveLength(0)
    expect(container!.querySelectorAll('[aria-selected]')).toHaveLength(0)
    // The active row is announced through the status region: title, position, count.
    expect(q('[data-mol-id="cat-active"]')?.getAttribute('role')).toBe('status')
    expect(q('[data-mol-id="cat-active"]')?.textContent).toBe('app-auth, 2 of 2')
    expect(container!.querySelectorAll('mark').length).toBeGreaterThan(0)
    expect(q('[data-mol-id="cat-related"]')?.textContent).toBe('related')
    expect(rows()[0].textContent).toContain('core · auth')
    const link = rows()[0].querySelector('a') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/packages/api-auth')
    // The default link renders the row's content inside the anchor, never an empty one.
    expect(link.textContent).toContain('api-auth')
    link.click()
    expect(onOpen).toHaveBeenCalledWith(hits[0].doc)
    onOpen.mockClear()
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }))
    expect(onOpen).not.toHaveBeenCalled()
    // The port binds the same bubbling pointerover React derives onPointerEnter from.
    rows()[0].dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    expect(onPrefetch).toHaveBeenCalledWith(hits[0].doc)
  })

  it('renders through a custom link and shows the empty text', () => {
    const renderLink = vi.fn((p: SearchResultLinkProps) => (
      <span data-custom={p.href}>{p.children}</span>
    ))
    const [listProps, setListProps] = createSignal<SearchResultsProps<PackageDoc>>({
      hits,
      view,
      activeIndex: -1,
      onOpen: () => {},
      renderLink,
      emptyText: 'Nothing',
    })
    mountWith(() => <SearchResults {...listProps()} />)
    expect(container!.querySelectorAll('[data-custom]').length).toBe(2)
    // No row is active, so the status region is there but silent.
    expect(q('[data-mol-id="search-active"]')?.getAttribute('role')).toBe('status')
    expect(q('[data-mol-id="search-active"]')?.textContent).toBe('')
    setListProps({
      hits: [],
      view,
      activeIndex: -1,
      onOpen: () => {},
      emptyText: 'Nothing',
    })
    expect(container!.textContent).toBe('Nothing')
    // The status region exists in the empty state too, so it is live before results arrive.
    expect(q('[data-mol-id="search-active"]')?.getAttribute('role')).toBe('status')
    expect(q('[data-mol-id="search-active"]')?.textContent).toBe('')
  })
})

/** The document the quick-search test indexes. */
type QuickDoc = { name: string }

describe('QuickSearchDialog', () => {
  it('moves focus into the field through its ref when it opens, and renders hits as anchors with content', () => {
    const inputRef = { current: null as HTMLInputElement | null }
    // The Solid session holds every reactive field in an accessor, as `useSearchSession` returns it.
    const session: SearchSession<QuickDoc> = {
      inputRef,
      query: () => 'auth',
      setQuery: () => {},
      clear: () => {},
      parsed: () => parseQuery('auth'),
      hits: () => [
        { id: 'a', score: 1, doc: { name: 'api-auth' }, terms: ['auth'], fields: ['name'] },
      ],
      active: () => true,
      ranked: () => true,
      activeIndex: () => 0,
      setActiveIndex: () => {},
      onKeyDown: () => {},
      removeFilter: () => {},
      open: () => {},
      prefetch: () => {},
      focus: () => {},
    }
    const view = (doc: QuickDoc): SearchResultView => ({
      href: `/packages/${doc.name}`,
      title: doc.name,
    })
    const [label, setLabel] = createSignal<string | undefined>(undefined)
    mountWith(() => (
      <QuickSearchDialog
        open
        onClose={() => {}}
        session={session}
        view={view}
        placeholder="Search packages"
        emptyText="Nothing"
        label={label()}
      />
    ))
    expect(q('[role="dialog"]')).not.toBeNull()
    // The dialog is named for screen readers: "Search" by default, the
    // caller's `label` when one is passed.
    expect(q('[role="dialog"]')?.getAttribute('aria-label')).toBe('Search')
    expect(inputRef.current).toBe(q('[data-mol-id="quick-search-input"]'))
    expect(document.activeElement).toBe(inputRef.current)
    expect(q('[data-mol-id="quick-search-link"]')?.textContent).toBe('api-auth')
    setLabel('Find a package')
    expect(q('[role="dialog"]')?.getAttribute('aria-label')).toBe('Find a package')
  })
})

describe('Highlight', () => {
  it('wraps matched words in mark elements', () => {
    mountWith(() => <Highlight text="User feedback" terms={['feedback']} />)
    expect(container!.innerHTML).toContain('<mark')
    expect(container!.textContent).toBe('User feedback')
  })
})

describe('Kbd', () => {
  it('marks a key cap with translate="no" so a key name is never translated', () => {
    mountWith(() => <Kbd>esc</Kbd>)
    expect(q('kbd')?.getAttribute('translate')).toBe('no')
  })
})
