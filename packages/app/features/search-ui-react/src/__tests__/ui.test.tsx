import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
      (opts?.defaultValue ?? _key).replace(/\{\{(\w+)\}\}/g, (_m, k) => String(values?.[k] ?? '')),
  }),
}))
vi.mock('@molecule/app-ui-react', () => ({
  Icon: ({ name }: { name: string }) => createElement('svg', { 'data-icon': name }),
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? createElement('div', { role: 'dialog' }, children) : null,
  Tooltip: ({ content, children }: { content: React.ReactNode; children: React.ReactNode }) =>
    createElement('span', null, children, createElement('span', { 'data-tooltip': '' }, content)),
}))

const { SearchBox } = await import('../SearchBox.js')
const { SearchResults } = await import('../SearchResults.js')
const { Highlight } = await import('../Highlight.js')

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
})

describe('SearchResults', () => {
  const hits = [
    { id: 'a', doc: { name: 'api-auth', d: 'Sign in and sessions' }, terms: ['auth'] },
    { id: 'b', doc: { name: 'app-auth', d: 'Client auth' }, terms: ['auth'], related: true },
  ]
  const view = (doc: { name: string; d: string }) => ({
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
      createElement(SearchResults, {
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
    expect(rows[1].getAttribute('aria-selected')).toBe('true')
    expect(rows[0].getAttribute('aria-selected')).toBe('false')
    expect(container.querySelectorAll('mark').length).toBeGreaterThan(0)
    expect(q('[data-mol-id="cat-related"]')?.textContent).toBe('related')
    expect(rows[0].textContent).toContain('core · auth')
    const link = rows[0].querySelector('a') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/packages/api-auth')
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
      createElement(SearchResults, {
        hits,
        view,
        activeIndex: -1,
        onOpen: () => {},
        renderLink,
        emptyText: 'Nothing',
      }),
    )
    expect(container.querySelectorAll('[data-custom]').length).toBe(2)
    act(() =>
      root!.render(
        createElement(SearchResults, {
          hits: [],
          view,
          activeIndex: -1,
          onOpen: () => {},
          emptyText: 'Nothing',
        }),
      ),
    )
    expect(container.textContent).toBe('Nothing')
  })
})

describe('Highlight', () => {
  it('wraps matched words in mark elements', () => {
    render(createElement(Highlight, { text: 'User feedback', terms: ['feedback'] }))
    expect(container.innerHTML).toContain('<mark')
    expect(container.textContent).toBe('User feedback')
  })
})
