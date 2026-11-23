// @vitest-environment jsdom
/**
 * FileExplorer state that follows its inputs.
 *
 * Angular port of
 * `@molecule/app-ide-react/src/__tests__/FileExplorer.expand-state.test.tsx`
 * with the same test names and the same assertions, mounted through Angular's
 * own `createApplication` (a JIT host binds the inputs).
 *
 * Three prop-driven resets are committed in the pass that sees the new value
 * (`ngOnChanges`) rather than from a later render:
 *
 * - `activeFile` opens its ancestor directories, so an active file is never
 *   hidden inside a collapsed directory (on mount and on later changes);
 * - `files` prunes selections whose path left the tree, so a path that comes
 *   back is not still selected;
 * - the resulting expand state is persisted to the bonded preference store.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement, provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { FileNode } from '@molecule/app-ide-panel-logic'
import { loadExpandState } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileExplorer } from '../components/file-explorer.component.js'
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

/** The JIT host binding every explorer input the tests use. */
const FileExplorerHost = Component({
  selector: 'mol-file-explorer-state-host',
  standalone: true,
  imports: [FileExplorer],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-file-explorer [files]="p['files']" [onFileSelect]="p['onFileSelect']" [persistKey]="p['persistKey']" [activeFile]="p['activeFile']"></div>`,
})(
  class FileExplorerHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof FileExplorerHost>>
  container: HTMLElement
} | null = null

/**
 * Mounts the explorer with the given props.
 *
 * @param props - The props the host binds.
 * @returns The mount container.
 */
async function renderExplorer(props: Record<string, unknown>): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideTheme(buildThemeProvider()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof FileExplorerHost>> = createComponent(
    FileExplorerHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { onFileSelect: vi.fn(), ...props }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  ref.changeDetectorRef.detectChanges()
  return container
}

/**
 * Re-renders the explorer with new props — the same instance, the way React's
 * `rerender` reuses it.
 *
 * @param props - The props the host binds.
 */
function rerender(props: Record<string, unknown>): void {
  if (!current) throw new Error('nothing mounted')
  current.ref.instance.p = { onFileSelect: vi.fn(), ...props }
  current.ref.changeDetectorRef.detectChanges()
}

/** Runs one change-detection pass (the click handler's re-render). */
function tick(): void {
  if (!current) throw new Error('nothing mounted')
  current.ref.changeDetectorRef.detectChanges()
}

/**
 * The row for a path, or null when the tree does not render it.
 *
 * @param container - The mount container.
 * @param path - The path.
 * @returns The row element, or null.
 */
function row(container: HTMLElement, path: string): HTMLElement | null {
  return container.querySelector(`[data-explorer-path="${path}"]`)
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom does not implement scrollIntoView; the explorer scrolls the active row into view.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('FileExplorer expand state', () => {
  it('opens the active file ancestors on mount', async () => {
    const container = await renderExplorer({
      files: TREE,
      onFileSelect: vi.fn(),
      activeFile: NESTED_FILE,
    })

    expect(row(container, NESTED_FILE), 'the active file must be visible').not.toBeNull()
  })

  it('opens the new ancestors when the active file changes', async () => {
    const container = await renderExplorer({ files: TREE, onFileSelect: vi.fn() })
    expect(row(container, NESTED_FILE)).toBeNull()

    rerender({ files: TREE, onFileSelect: vi.fn(), activeFile: NESTED_FILE })

    expect(row(container, NESTED_FILE), 'the active file must be visible').not.toBeNull()
  })

  it('persists a directory toggle through the preference store', async () => {
    const persistKey = 'ide-test-expand-toggle'
    expect(loadExpandState(persistKey).collapsed.size).toBe(0)

    const container = await renderExplorer({
      files: TREE,
      onFileSelect: vi.fn(),
      persistKey,
    })

    // Depth-0 directories start expanded, so a click collapses this one.
    row(container, '/workspace/src')?.click()
    tick()

    expect(row(container, NESTED_FILE), 'a collapsed directory hides its children').toBeNull()
    expect([...loadExpandState(persistKey).collapsed]).toEqual(['/workspace/src'])
  })
})

describe('FileExplorer selection pruning', () => {
  it('drops a selection whose path left the tree, so it is not selected when it returns', async () => {
    const container = await renderExplorer({ files: TREE_A, onFileSelect: vi.fn() })

    row(container, '/workspace/a.ts')?.click()
    tick()
    expect(row(container, '/workspace/a.ts')?.getAttribute('aria-selected')).toBe('true')

    rerender({ files: TREE_B, onFileSelect: vi.fn() })
    rerender({ files: TREE_A, onFileSelect: vi.fn() })

    expect(row(container, '/workspace/a.ts')?.getAttribute('aria-selected')).toBe('false')
  })
})
