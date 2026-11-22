// @vitest-environment jsdom

/**
 * FileExplorer state that follows its inputs.
 *
 * Three prop-driven resets are committed in the render that sees the new value
 * (React's "adjust state when a prop changes" pattern) rather than from an
 * effect on a later render:
 *
 * - `activeFile` opens its ancestor directories, so an active file is never
 *   hidden inside a collapsed directory (on mount and on later changes);
 * - `files` prunes selections whose path left the tree, so a path that comes
 *   back is not still selected;
 * - the resulting expand state is persisted to the bonded preference store.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { JSX, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { FileNode } from '@molecule/app-ide-panel-logic'
import { loadExpandState } from '@molecule/app-ide-panel-logic/panels'
import { ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileExplorer } from '../components/FileExplorer.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A file two directories deep: `deep` is collapsed unless something opens it. */
const NESTED_FILE = '/workspace/src/deep/a.ts'

/** A tree whose `deep` directory (depth 1) starts collapsed. */
const TREE: FileNode[] = [
  {
    path: '/workspace/src',
    name: 'src',
    type: 'directory',
    children: [
      {
        path: '/workspace/src/deep',
        name: 'deep',
        type: 'directory',
        children: [{ path: NESTED_FILE, name: 'a.ts', type: 'file' }],
      },
    ],
  },
]

/** A one-file tree used for the selection-pruning round trip. */
const TREE_A: FileNode[] = [{ path: '/workspace/a.ts', name: 'a.ts', type: 'file' }]
/** A different one-file tree; `a.ts` is gone from it. */
const TREE_B: FileNode[] = [{ path: '/workspace/b.ts', name: 'b.ts', type: 'file' }]

/** Wrap children in the theme context (i18n rides the bonded provider). */
function wrap(children: ReactNode): JSX.Element {
  return <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
}

/** The row for a path, or null when the tree does not render it. */
function row(container: HTMLElement, path: string): HTMLElement | null {
  return container.querySelector(`[data-explorer-path="${path}"]`)
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom does not implement scrollIntoView; the explorer scrolls the active row into view.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(cleanup)

describe('FileExplorer expand state', () => {
  it('opens the active file ancestors on mount', () => {
    const { container } = render(
      wrap(<FileExplorer files={TREE} onFileSelect={vi.fn()} activeFile={NESTED_FILE} />),
    )

    expect(row(container, NESTED_FILE), 'the active file must be visible').not.toBeNull()
  })

  it('opens the new ancestors when the active file changes', () => {
    const { container, rerender } = render(
      wrap(<FileExplorer files={TREE} onFileSelect={vi.fn()} />),
    )
    expect(row(container, NESTED_FILE)).toBeNull()

    rerender(wrap(<FileExplorer files={TREE} onFileSelect={vi.fn()} activeFile={NESTED_FILE} />))

    expect(row(container, NESTED_FILE), 'the active file must be visible').not.toBeNull()
  })

  it('persists a directory toggle through the preference store', () => {
    const persistKey = 'ide-test-expand-toggle'
    expect(loadExpandState(persistKey).collapsed.size).toBe(0)

    const { container } = render(
      wrap(<FileExplorer files={TREE} onFileSelect={vi.fn()} persistKey={persistKey} />),
    )

    // Depth-0 directories start expanded, so a click collapses this one.
    fireEvent.click(row(container, '/workspace/src') as HTMLElement)

    expect(row(container, NESTED_FILE), 'a collapsed directory hides its children').toBeNull()
    expect([...loadExpandState(persistKey).collapsed]).toEqual(['/workspace/src'])
  })
})

describe('FileExplorer selection pruning', () => {
  it('drops a selection whose path left the tree, so it is not selected when it returns', () => {
    const { container, rerender } = render(
      wrap(<FileExplorer files={TREE_A} onFileSelect={vi.fn()} />),
    )

    fireEvent.click(row(container, '/workspace/a.ts') as HTMLElement)
    expect(row(container, '/workspace/a.ts')?.getAttribute('aria-selected')).toBe('true')

    rerender(wrap(<FileExplorer files={TREE_B} onFileSelect={vi.fn()} />))
    rerender(wrap(<FileExplorer files={TREE_A} onFileSelect={vi.fn()} />))

    expect(row(container, '/workspace/a.ts')?.getAttribute('aria-selected')).toBe('false')
  })
})
