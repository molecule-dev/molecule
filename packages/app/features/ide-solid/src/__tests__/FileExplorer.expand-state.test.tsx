// @vitest-environment jsdom

/**
 * FileExplorer state that follows its inputs.
 *
 * Three input-driven resets are committed in the frame that sees the new value:
 *
 * - `activeFile` opens its ancestor directories, so an active file is never
 *   hidden inside a collapsed directory (on mount and on later changes);
 * - `files` prunes selections whose path left the tree, so a path that comes
 *   back is not still selected;
 * - the resulting expand state is persisted to the bonded preference store.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/FileExplorer.expand-state.test.tsx`
 * with the same test names and the same behavioral assertions. Solid has no
 * `rerender`: `files` and `activeFile` are read through accessors, so changing
 * them is a signal write the mounted explorer sees, as React's re-render does.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { FileExplorerProps, FileNode } from '@molecule/app-ide-panel-logic'
import { loadExpandState } from '@molecule/app-ide-panel-logic/panels'
import { ThemeContext, type ThemeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileExplorer } from '../components/FileExplorer.jsx'

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)

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

/** The root this file last mounted, disposed before the next render. */
let dispose: (() => void) | null = null

/** A live explorer whose inputs the test can replace. */
interface MountedExplorer {
  /** The host element the tree mounted into. */
  host: HTMLElement
  /** Replace the tree, as React's `rerender` would. */
  setFiles: (files: FileNode[]) => void
  /** Replace the active file, as React's `rerender` would. */
  setActiveFile: (path: string | null) => void
}

/**
 * Mounts the explorer over signals for the inputs this suite changes.
 *
 * @param initial - The starting inputs.
 * @returns The host and the setters that stand in for React's `rerender`.
 */
function renderExplorer(initial: {
  files: FileNode[]
  activeFile?: string | null
  persistKey?: string
}): MountedExplorer {
  dispose?.()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const [files, setFiles] = createSignal(initial.files)
  const [activeFile, setActiveFile] = createSignal<string | null>(initial.activeFile ?? null)
  const props = (): FileExplorerProps => ({
    files: files(),
    onFileSelect: vi.fn(),
    activeFile: activeFile(),
    ...(initial.persistKey ? { persistKey: initial.persistKey } : {}),
  })
  dispose = render(
    () => (
      <ThemeContext.Provider value={themeProvider}>
        <FileExplorer {...props()} />
      </ThemeContext.Provider>
    ),
    host,
  )
  return { host, setFiles, setActiveFile }
}

/** The row for a path, or null when the tree does not render it. */
function row(host: HTMLElement, path: string): HTMLElement | null {
  return host.querySelector(`[data-explorer-path="${path}"]`)
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom does not implement scrollIntoView; the explorer scrolls the active row into view.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  dispose?.()
  dispose = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('FileExplorer expand state', () => {
  it('opens the active file ancestors on mount', () => {
    const explorer = renderExplorer({ files: TREE, activeFile: NESTED_FILE })

    expect(row(explorer.host, NESTED_FILE), 'the active file must be visible').not.toBeNull()
  })

  it('opens the new ancestors when the active file changes', () => {
    const explorer = renderExplorer({ files: TREE })
    expect(row(explorer.host, NESTED_FILE)).toBeNull()

    explorer.setActiveFile(NESTED_FILE)

    expect(row(explorer.host, NESTED_FILE), 'the active file must be visible').not.toBeNull()
  })

  it('persists a directory toggle through the preference store', () => {
    const persistKey = 'ide-test-expand-toggle'
    expect(loadExpandState(persistKey).collapsed.size).toBe(0)

    const explorer = renderExplorer({ files: TREE, persistKey })

    // Depth-0 directories start expanded, so a click collapses this one.
    ;(row(explorer.host, '/workspace/src') as HTMLElement).click()

    expect(row(explorer.host, NESTED_FILE), 'a collapsed directory hides its children').toBeNull()
    expect([...loadExpandState(persistKey).collapsed]).toEqual(['/workspace/src'])
  })
})

describe('FileExplorer selection pruning', () => {
  it('drops a selection whose path left the tree, so it is not selected when it returns', () => {
    const explorer = renderExplorer({ files: TREE_A })

    ;(row(explorer.host, '/workspace/a.ts') as HTMLElement).click()
    expect(row(explorer.host, '/workspace/a.ts')?.getAttribute('aria-selected')).toBe('true')

    explorer.setFiles(TREE_B)
    explorer.setFiles(TREE_A)

    expect(row(explorer.host, '/workspace/a.ts')?.getAttribute('aria-selected')).toBe('false')
  })
})
