// @vitest-environment jsdom

/**
 * FileExplorer's tree role follows its content — the Angular port of
 * `@molecule/app-ide-react/src/__tests__/FileExplorer.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through Angular's own
 * `createApplication` with the theme provider (the only provider the tree
 * needs).
 *
 * `role="tree"` requires `treeitem` children (axe `aria-required-children`),
 * so an empty tree — the empty-state text and nothing else — must not claim
 * the role. With at least one item the container stays a tree.
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

import { provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { FileNode } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileExplorer } from '../components/file-explorer.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The JIT host the way the conformance kit mounts the component. */
const FileExplorerHost = Component({
  selector: 'mol-file-explorer-host',
  standalone: true,
  imports: [FileExplorer],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div
    mol-file-explorer
    [files]="p['files']"
    [onFileSelect]="p['onFileSelect']"
  ></div>`,
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
 * Mounts the explorer with these files.
 * @param files - The tree to render.
 * @returns The container the explorer mounted into.
 */
async function renderExplorer(files: FileNode[]): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideTheme(buildThemeProvider())],
  })
  const ref: ComponentRef<InstanceType<typeof FileExplorerHost>> = createComponent(
    FileExplorerHost,
    {
      environmentInjector: appRef.injector,
    },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { files, onFileSelect: vi.fn() }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
  return container
}

beforeEach(() => {
  setClassMap(classMap)
  // jsdom has no scrollIntoView; the explorer scrolls the active row into view.
  Element.prototype.scrollIntoView = (): void => {}
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  current?.appRef.destroy()
  current = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

describe('FileExplorer tree role (axe aria-required-children)', () => {
  it('drops the tree role when there are no items', async () => {
    const container = await renderExplorer([])
    const root = container.querySelector('div[mol-file-explorer]') as HTMLElement

    expect(root.getAttribute('role')).toBeNull()
    // The empty state still renders, just outside a tree.
    expect(root.textContent).not.toBe('')
  })

  it('keeps the tree role with at least one item', async () => {
    const container = await renderExplorer([
      { path: '/workspace/a.ts', name: 'a.ts', type: 'file' },
    ])
    const root = container.querySelector('div[mol-file-explorer]') as HTMLElement

    expect(root.getAttribute('role')).toBe('tree')
  })
})

describe('FileExplorer rows are treeitems (axe aria-required-children)', () => {
  it('renders each row as a treeitem with its level, expansion and selection', async () => {
    const container = await renderExplorer([
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

  it('marks the selected row and points aria-activedescendant at the focused one', async () => {
    const container = await renderExplorer([
      { path: '/workspace/a.ts', name: 'a.ts', type: 'file' },
    ])
    const tree = container.querySelector('div[mol-file-explorer]') as HTMLElement
    const row = container.querySelector('[data-explorer-path="/workspace/a.ts"]') as HTMLElement
    // Nothing focused: no active descendant.
    expect(tree.getAttribute('aria-activedescendant')).toBeNull()

    row.click()
    await flush()
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
