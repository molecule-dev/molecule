// @vitest-environment jsdom

/**
 * FileExplorer state that follows its inputs — a port of
 * `@molecule/app-ide-react/src/__tests__/FileExplorer.expand-state.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Svelte 5's own `mount`/`flushSync` and re-rendered by updating the host's
 * store the way React's `rerender` hands the explorer new props.
 *
 * Three input-driven resets are pinned here:
 *
 * - `activeFile` opens its ancestor directories, so an active file is never
 *   hidden inside a collapsed directory (on mount and on later changes);
 * - `files` prunes selections whose path left the tree, so a path that comes
 *   back is not still selected;
 * - the resulting expand state is persisted to the bonded preference store.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { writable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { FileNode } from '@molecule/app-ide-panel-logic'
import { loadExpandState } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import FileExplorerStateHost from './FileExplorerStateHost.svelte'
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

/** The store the host renders from. */
const source = writable<{
  files: FileNode[]
  activeFile?: string
  persistKey?: string
  onFileSelect: (path: string) => void
} | null>(null)

/** The mount alive right now, torn down before the next test. */
let instance: Record<string, unknown> | null = null
let container: HTMLElement | null = null

/** The row for a path, or null when the tree does not render it. */
function row(target: HTMLElement, path: string): HTMLElement | null {
  return target.querySelector(`[data-explorer-path="${path}"]`)
}

/**
 * Mounts the explorer with these inputs.
 *
 * @param next - The explorer's inputs.
 * @returns The container the explorer mounted into.
 */
function render(next: {
  files: FileNode[]
  activeFile?: string
  persistKey?: string
  onFileSelect?: (path: string) => void
}): HTMLElement {
  if (instance) void unmount(instance as never)
  document.body.innerHTML = ''
  const target = document.createElement('div')
  document.body.appendChild(target)
  source.set({ onFileSelect: vi.fn(), ...next })
  const mounted = mount(FileExplorerStateHost, {
    target,
    props: { theme: buildThemeProvider(), source },
  }) as Record<string, unknown>
  flushSync()
  instance = mounted
  container = target
  return target
}

/**
 * Re-renders the mounted explorer with new inputs, in place.
 *
 * @param next - The next inputs.
 */
function rerender(next: {
  files: FileNode[]
  activeFile?: string
  persistKey?: string
  onFileSelect?: (path: string) => void
}): void {
  source.update((current) => ({ onFileSelect: current?.onFileSelect ?? vi.fn(), ...next }))
  flushSync()
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom does not implement scrollIntoView; the explorer scrolls the active row into view.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(async () => {
  if (instance) await unmount(instance as never)
  instance = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('FileExplorer expand state', () => {
  it('opens the active file ancestors on mount', () => {
    const target = render({ files: TREE, activeFile: NESTED_FILE })

    expect(row(target, NESTED_FILE), 'the active file must be visible').not.toBeNull()
  })

  it('opens the new ancestors when the active file changes', () => {
    const target = render({ files: TREE })
    expect(row(target, NESTED_FILE)).toBeNull()

    rerender({ files: TREE, activeFile: NESTED_FILE })

    expect(row(target, NESTED_FILE), 'the active file must be visible').not.toBeNull()
  })

  it('persists a directory toggle through the preference store', () => {
    const persistKey = 'ide-test-expand-toggle'
    expect(loadExpandState(persistKey).collapsed.size).toBe(0)

    const target = render({ files: TREE, persistKey })

    // Depth-0 directories start expanded, so a click collapses this one.
    row(target, '/workspace/src')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flushSync()

    expect(row(target, NESTED_FILE), 'a collapsed directory hides its children').toBeNull()
    expect([...loadExpandState(persistKey).collapsed]).toEqual(['/workspace/src'])
  })
})

describe('FileExplorer selection pruning', () => {
  it('drops a selection whose path left the tree, so it is not selected when it returns', () => {
    const target = render({ files: TREE_A })

    row(target, '/workspace/a.ts')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flushSync()
    expect(row(target, '/workspace/a.ts')?.getAttribute('aria-selected')).toBe('true')

    rerender({ files: TREE_B })
    rerender({ files: TREE_A })

    expect(row(target, '/workspace/a.ts')?.getAttribute('aria-selected')).toBe('false')
  })
})
