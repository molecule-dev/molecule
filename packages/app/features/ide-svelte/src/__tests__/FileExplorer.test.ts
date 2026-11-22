// @vitest-environment jsdom

/**
 * FileExplorer's tree role follows its content — the Svelte port of
 * `@molecule/app-ide-react/src/__tests__/FileExplorer.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through Svelte 5's own
 * `mount`/`unmount`.
 *
 * `role="tree"` requires `treeitem` children (axe `aria-required-children`),
 * so an empty tree — the empty-state text and nothing else — must not claim
 * the role. With at least one item the container stays a tree.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { FileNode } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import FileExplorerHost from './FileExplorerHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

/** The mounts alive right now, torn down before the next test. */
const mounted: { instance: ReturnType<typeof mount>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  // jsdom has no scrollIntoView; the explorer scrolls the active row into view.
  Element.prototype.scrollIntoView = (): void => {}
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance)
    container.remove()
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the explorer with these files.
 * @param files - The tree to render.
 * @returns The container the explorer mounted into.
 */
function renderExplorer(files: FileNode[]): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(FileExplorerHost, {
    target: container,
    props: { theme: buildThemeProvider(), files, onFileSelect: vi.fn() },
  })
  mounted.push({ instance, container })
  flushSync()
  return container
}

/**
 * The explorer's root element.
 * @param container - The container the explorer mounted into.
 * @returns The root element.
 */
function root(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement
}

describe('FileExplorer tree role (axe aria-required-children)', () => {
  it('drops the tree role when there are no items', () => {
    const container = renderExplorer([])

    expect(root(container).getAttribute('role')).toBeNull()
    // The empty state still renders, just outside a tree.
    expect(root(container).textContent).not.toBe('')
  })

  it('keeps the tree role with at least one item', () => {
    const container = renderExplorer([{ path: '/workspace/a.ts', name: 'a.ts', type: 'file' }])

    expect(root(container).getAttribute('role')).toBe('tree')
  })
})

describe('FileExplorer rows are treeitems (axe aria-required-children)', () => {
  it('renders each row as a treeitem with its level, expansion and selection', () => {
    const container = renderExplorer([
      {
        path: '/workspace/src',
        name: 'src',
        type: 'directory',
        children: [{ path: '/workspace/src/a.ts', name: 'a.ts', type: 'file' }],
      },
    ])

    const dir = container.querySelector('[data-explorer-path="/workspace/src"]') as HTMLElement
    expect(dir.getAttribute('role')).toBe('treeitem')
    expect(dir.getAttribute('aria-level')).toBe('1')
    expect(dir.getAttribute('aria-expanded')).toBe('true')
    expect(dir.tagName).not.toBe('BUTTON')

    const file = container.querySelector(
      '[data-explorer-path="/workspace/src/a.ts"]',
    ) as HTMLElement
    expect(file.getAttribute('role')).toBe('treeitem')
    expect(file.getAttribute('aria-level')).toBe('2')
    expect(file.getAttribute('aria-expanded')).toBeNull()
    // Nothing is selected yet, so no row claims selection.
    expect(file.getAttribute('aria-selected')).toBe('false')

    // The row-and-children wrapper is presentational; the directory's
    // children render in a group owned by their treeitem.
    expect(dir.parentElement!.getAttribute('role')).toBe('none')
    const sibling = dir.parentElement!.children[1] as HTMLElement | undefined
    expect(sibling?.getAttribute('role')).toBe('group')
    expect(sibling?.contains(file)).toBe(true)
  })

  it('marks the selected row and points aria-activedescendant at the focused one', () => {
    const container = renderExplorer([{ path: '/workspace/a.ts', name: 'a.ts', type: 'file' }])
    const tree = root(container)
    const row = container.querySelector('[data-explorer-path="/workspace/a.ts"]') as HTMLElement
    // Nothing focused: no active descendant.
    expect(tree.getAttribute('aria-activedescendant')).toBeNull()

    row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    flushSync()
    // The click selects (and focuses) the row: it is selected, and the tree's
    // aria-activedescendant names that row's id.
    expect(row.getAttribute('aria-selected')).toBe('true')
    const active = tree.getAttribute('aria-activedescendant')
    expect(active).toBeTruthy()
    expect(document.getElementById(active!)).toBe(row)
    // The row id comes from the tree's one id prefix plus its render position.
    expect(active).toMatch(/^[^:]+-1$/)
  })
})
