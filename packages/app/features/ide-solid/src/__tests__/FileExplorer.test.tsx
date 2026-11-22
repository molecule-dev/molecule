// @vitest-environment jsdom

/**
 * FileExplorer's tree role follows its content — the Solid port of
 * `@molecule/app-ide-react/src/__tests__/FileExplorer.test.tsx` with the same
 * test names and the same behavioral assertions, mounted as a real Solid root.
 *
 * `role="tree"` requires `treeitem` children (axe `aria-required-children`),
 * so an empty tree — the empty-state text and nothing else — must not claim
 * the role. With at least one item the container stays a tree.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { FileNode } from '@molecule/app-ide-panel-logic'
import { ThemeContext, type ThemeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileExplorer } from '../components/FileExplorer.jsx'

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)

/** The root this file last mounted, disposed before the next render. */
let dispose: (() => void) | null = null

/**
 * Renders the explorer with these files.
 * @param files - The tree to render.
 * @returns The host element the tree mounted into.
 */
function renderExplorer(files: FileNode[]): HTMLElement {
  dispose?.()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  dispose = render(
    () => (
      <ThemeContext.Provider value={themeProvider}>
        <FileExplorer files={files} onFileSelect={vi.fn()} />
      </ThemeContext.Provider>
    ),
    host,
  )
  return host
}

/**
 * The explorer's root element.
 * @param host - The host the tree mounted into.
 * @returns The root element.
 */
function root(host: HTMLElement): HTMLElement {
  return host.firstElementChild as HTMLElement
}

beforeEach(() => {
  setClassMap(classMap)
  // jsdom has no scrollIntoView; the explorer scrolls the active row into view.
  Element.prototype.scrollIntoView = (): void => {}
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  dispose?.()
  dispose = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('FileExplorer tree role (axe aria-required-children)', () => {
  it('drops the tree role when there are no items', () => {
    const host = renderExplorer([])

    expect(root(host).getAttribute('role')).toBeNull()
    // The empty state still renders, just outside a tree.
    expect(root(host).textContent).not.toBe('')
  })

  it('keeps the tree role with at least one item', () => {
    const host = renderExplorer([{ path: '/workspace/a.ts', name: 'a.ts', type: 'file' }])

    expect(root(host).getAttribute('role')).toBe('tree')
  })
})

describe('FileExplorer rows are treeitems (axe aria-required-children)', () => {
  it('renders each row as a treeitem with its level, expansion and selection', () => {
    const host = renderExplorer([
      {
        path: '/workspace/src',
        name: 'src',
        type: 'directory',
        children: [{ path: '/workspace/src/a.ts', name: 'a.ts', type: 'file' }],
      },
    ])

    const dir = host.querySelector('[data-explorer-path="/workspace/src"]') as HTMLElement
    expect(dir.getAttribute('role')).toBe('treeitem')
    expect(dir.getAttribute('aria-level')).toBe('1')
    expect(dir.getAttribute('aria-expanded')).toBe('true')
    expect(dir.tagName).not.toBe('BUTTON')

    const file = host.querySelector('[data-explorer-path="/workspace/src/a.ts"]') as HTMLElement
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
    const host = renderExplorer([{ path: '/workspace/a.ts', name: 'a.ts', type: 'file' }])
    const tree = root(host)
    const row = host.querySelector('[data-explorer-path="/workspace/a.ts"]') as HTMLElement
    // Nothing focused: no active descendant.
    expect(tree.getAttribute('aria-activedescendant')).toBeNull()

    row.click()
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
