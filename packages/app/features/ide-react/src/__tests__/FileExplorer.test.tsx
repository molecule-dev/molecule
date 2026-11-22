// @vitest-environment jsdom

/**
 * FileExplorer's tree role follows its content.
 *
 * `role="tree"` requires `treeitem` children (axe `aria-required-children`),
 * so an empty tree — the empty-state text and nothing else — must not claim
 * the role. With at least one item the container stays a tree.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { JSX, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileExplorer } from '../components/FileExplorer.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A minimal light theme so `useThemeMode` (the git colors) resolves. */

/** Wrap children in the theme context (i18n rides the bonded provider). */
function wrap(children: ReactNode): JSX.Element {
  return <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
}

/** The explorer's root element (the empty-state text's parent). */
function root(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
})

describe('FileExplorer tree role (axe aria-required-children)', () => {
  it('drops the tree role when there are no items', () => {
    const { container } = render(wrap(<FileExplorer files={[]} onFileSelect={vi.fn()} />))

    expect(root(container).getAttribute('role')).toBeNull()
    // The empty state still renders, just outside a tree.
    expect(root(container).textContent).not.toBe('')
  })

  it('keeps the tree role with at least one item', () => {
    const { container } = render(
      wrap(
        <FileExplorer
          files={[{ path: '/workspace/a.ts', name: 'a.ts', type: 'file' }]}
          onFileSelect={vi.fn()}
        />,
      ),
    )

    expect(root(container).getAttribute('role')).toBe('tree')
  })
})

describe('FileExplorer rows are treeitems (axe aria-required-children)', () => {
  it('renders each row as a treeitem with its level, expansion and selection', () => {
    const { container } = render(
      wrap(
        <FileExplorer
          files={[
            {
              path: '/workspace/src',
              name: 'src',
              type: 'directory',
              children: [{ path: '/workspace/src/a.ts', name: 'a.ts', type: 'file' }],
            },
          ]}
          onFileSelect={vi.fn()}
        />,
      ),
    )

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
    const { container } = render(
      wrap(
        <FileExplorer
          files={[{ path: '/workspace/a.ts', name: 'a.ts', type: 'file' }]}
          onFileSelect={vi.fn()}
        />,
      ),
    )
    const tree = root(container)
    const row = container.querySelector('[data-explorer-path="/workspace/a.ts"]') as HTMLElement
    // Nothing focused: no active descendant.
    expect(tree.getAttribute('aria-activedescendant')).toBeNull()

    fireEvent.click(row)
    // The click selects (and focuses) the row: it is selected, and the tree's
    // aria-activedescendant names that row's id.
    expect(row.getAttribute('aria-selected')).toBe('true')
    const active = tree.getAttribute('aria-activedescendant')
    expect(active).toBeTruthy()
    expect(document.getElementById(active!)).toBe(row)
    // The row id comes from the tree's one useId prefix plus its render position.
    expect(active).toMatch(/^[^:]+-1$/)
  })
})
