// @vitest-environment jsdom
/**
 * EditorPanel's formatting toast: when it appears and when it leaves.
 *
 * Angular port of
 * `@molecule/app-ide-react/src/__tests__/EditorPanel.formatting-toast.test.tsx`
 * with the same test names and the same assertions, mounted through Angular's
 * own `createApplication` (a JIT host binds the input) with a stub in-memory
 * editor provider.
 *
 * The toast is driven by `formattingFile === activeFile`. The show edge is read
 * by the panel's own `ngDoCheck` formatting comparison — the pass that sees the
 * new value — so the toast is in the DOM the moment formatting starts, and its
 * 300ms exit animation still delays the removal after formatting stops.
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

import { provideDomPlacement, provideEditor, provideTheme } from '@molecule/app-angular'
import type {
  EditorChangeEvent,
  EditorPosition,
  EditorProvider,
  EditorTab,
} from '@molecule/app-code-editor'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { EditorPanel } from '../components/editor-panel.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The one file the fake editor has open (and active). */
const APP = '/workspace/src/app.ts'

/** The text the toast shows (the untranslated default). */
const TOAST_TEXT = 'Formatting…'

/**
 * A minimal in-memory editor provider: one active tab, no Monaco.
 *
 * @returns The provider to hand to `provideEditor`.
 */
function createEditorProvider(): EditorProvider {
  const tabs: EditorTab[] = [{ path: APP, label: 'app.ts', isDirty: false, isActive: true }]
  const listeners = new Set<(event: EditorChangeEvent) => void>()
  return {
    name: 'test',
    mount: vi.fn(),
    dispose: vi.fn(),
    openFile: vi.fn(),
    closeFile: vi.fn(),
    getContent: () => null,
    setContent: vi.fn(),
    getCursorPosition: (): EditorPosition | null => null,
    setCursorPosition: vi.fn(),
    focus: vi.fn(),
    onChange: (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    getTabs: () => tabs,
    setActiveTab: vi.fn(),
    updateConfig: vi.fn(),
  }
}

/** The JIT host binding the panel's input. */
const EditorPanelHost = Component({
  selector: 'mol-editor-panel-host',
  standalone: true,
  imports: [EditorPanel],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-editor-panel [formattingFile]="p['formattingFile']"></div>`,
})(
  class EditorPanelHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof EditorPanelHost>>
  container: HTMLElement
} | null = null

/**
 * Mounts the panel with the given formatting file.
 *
 * @param formattingFile - The file being formatted, or `null`.
 * @returns The mount container.
 */
async function renderPanel(formattingFile?: string | null): Promise<HTMLElement> {
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
      provideEditor(createEditorProvider()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof EditorPanelHost>> = createComponent(EditorPanelHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { formattingFile }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  ref.changeDetectorRef.detectChanges()
  return container
}

/**
 * Re-renders the panel with a new formatting file — the same instance, the way
 * React's `rerender` reuses it.
 *
 * @param formattingFile - The file being formatted, or `null`.
 */
function rerender(formattingFile?: string | null): void {
  if (!current) throw new Error('nothing mounted')
  current.ref.instance.p = { formattingFile }
  current.ref.changeDetectorRef.detectChanges()
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom does not implement scrollIntoView; the tab bar scrolls the active
  // tab into view after every active-file change.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

describe('EditorPanel formatting toast', () => {
  it('shows the toast for the active file and keeps it through the exit animation', async () => {
    vi.useFakeTimers()
    const container = await renderPanel(APP)

    // Visible in the very first committed render of the formatting state.
    expect(container.textContent).toContain(TOAST_TEXT)

    // Formatting stopped: the toast stays in the DOM for its 300ms exit
    // animation, then leaves.
    rerender(null)
    expect(container.textContent).toContain(TOAST_TEXT)
    vi.advanceTimersByTime(350)
    if (!current) throw new Error('nothing mounted')
    current.ref.changeDetectorRef.detectChanges()
    expect(container.textContent).not.toContain(TOAST_TEXT)
  })

  it('shows the toast in the commit that starts formatting', async () => {
    vi.useFakeTimers()
    const container = await renderPanel(null)
    expect(container.textContent).not.toContain(TOAST_TEXT)

    rerender(APP)
    expect(container.textContent).toContain(TOAST_TEXT)
  })

  it('never shows the toast for a file that is not the active one', async () => {
    const container = await renderPanel('/workspace/other.ts')
    expect(container.textContent).not.toContain(TOAST_TEXT)
  })
})
