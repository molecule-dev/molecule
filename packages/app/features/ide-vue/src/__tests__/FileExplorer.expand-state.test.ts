// @vitest-environment jsdom
/**
 * FileExplorer state that follows its inputs — the Vue port of
 * `@molecule/app-ide-react/src/__tests__/FileExplorer.expand-state.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Vue's own `createApp`.
 *
 * Three prop-driven resets follow the new value:
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, provide, ref, type VNodeChild } from 'vue'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { FileNode } from '@molecule/app-ide-panel-logic'
import { loadExpandState } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { ThemeKey, type ThemeProvider } from '@molecule/app-vue'

import { FileExplorer } from '../components/FileExplorer.js'

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

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/** The live props the host passes down; reassigning them is the test's `rerender`. */
const live = ref<{ files: FileNode[]; activeFile?: string | null; persistKey?: string }>({
  files: TREE,
})

/** The mount alive right now, if any. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * The row for a path, or null when the tree does not render it.
 *
 * @param container - The host the app mounted into.
 * @param path - The row's path.
 * @returns The row, or null.
 */
function row(container: HTMLElement, path: string): HTMLElement | null {
  return container.querySelector(`[data-explorer-path="${path}"]`)
}

/**
 * Mounts the explorer and hands back its host plus a `rerender`.
 *
 * @param initial - The first props.
 * @returns The host element and the prop mutator.
 */
function renderExplorer(initial: {
  files: FileNode[]
  activeFile?: string | null
  persistKey?: string
}): { container: HTMLElement; rerender: (next: typeof initial) => Promise<void> } {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  live.value = { ...initial }
  const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)
  const app = createApp(
    defineComponent({
      setup() {
        provide(ThemeKey, themeProvider)
        return (): VNodeChild =>
          h(FileExplorer, {
            files: live.value.files,
            onFileSelect: vi.fn(),
            activeFile: live.value.activeFile,
            persistKey: live.value.persistKey,
          })
      },
    }),
  )
  mounted.app = app
  app.mount(container)
  return {
    container,
    rerender: async (next): Promise<void> => {
      live.value = { ...next }
      await nextTick()
    },
  }
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom does not implement scrollIntoView; the explorer scrolls the active row into view.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('FileExplorer expand state', () => {
  it('opens the active file ancestors on mount', async () => {
    const { container } = renderExplorer({ files: TREE, activeFile: NESTED_FILE })
    await nextTick()

    expect(row(container, NESTED_FILE), 'the active file must be visible').not.toBeNull()
  })

  it('opens the new ancestors when the active file changes', async () => {
    const { container, rerender } = renderExplorer({ files: TREE })
    await nextTick()
    expect(row(container, NESTED_FILE)).toBeNull()

    await rerender({ files: TREE, activeFile: NESTED_FILE })

    expect(row(container, NESTED_FILE), 'the active file must be visible').not.toBeNull()
  })

  it('persists a directory toggle through the preference store', async () => {
    const persistKey = 'ide-test-expand-toggle'
    expect(loadExpandState(persistKey).collapsed.size).toBe(0)

    const { container } = renderExplorer({ files: TREE, persistKey })
    await nextTick()

    // Depth-0 directories start expanded, so a click collapses this one.
    row(container, '/workspace/src')?.click()
    await nextTick()

    expect(row(container, NESTED_FILE), 'a collapsed directory hides its children').toBeNull()
    expect([...loadExpandState(persistKey).collapsed]).toEqual(['/workspace/src'])
  })
})

describe('FileExplorer selection pruning', () => {
  it('drops a selection whose path left the tree, so it is not selected when it returns', async () => {
    const { container, rerender } = renderExplorer({ files: TREE_A })
    await nextTick()

    row(container, '/workspace/a.ts')?.click()
    await nextTick()
    expect(row(container, '/workspace/a.ts')?.getAttribute('aria-selected')).toBe('true')

    await rerender({ files: TREE_B })
    await rerender({ files: TREE_A })

    expect(row(container, '/workspace/a.ts')?.getAttribute('aria-selected')).toBe('false')
  })
})
