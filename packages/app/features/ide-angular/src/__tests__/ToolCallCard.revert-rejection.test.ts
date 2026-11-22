// @vitest-environment jsdom

/**
 * A host whose file revert rejects must not leave an unhandled promise
 * rejection behind: `handleRevert` catches the failure, logs it through the
 * module's logger, and leaves the card exactly as it was (still not undone,
 * its toggle never announced). Angular port of
 * `@molecule/app-ide-react/src/__tests__/ToolCallCard.revert-rejection.test.tsx`
 * with the same test name and the same assertions, mounted through Angular's
 * own `createApplication`.
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
import { getLogger } from '@molecule/app-logger'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The props an undoable `edit_file` card carries. */
const EDIT_PROPS = {
  id: 'tc-1',
  name: 'edit_file',
  input: { path: 'src/app.ts', old_string: 'a', new_string: 'b' },
  output: { diff: { type: 'modified', added: 1, removed: 1 } },
  status: 'done',
  fileDiff: { original: 'a', modified: 'b' },
}

/**
 * The JIT host the way the conformance kit mounts the card: its template binds
 * every input the card takes.
 */
const ToolCallCardHost = Component({
  selector: 'mol-tool-call-card-host',
  standalone: true,
  imports: [ToolCallCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-tool-call-card [id]="p['id']" [name]="p['name']" [input]="p['input']" [output]="p['output']" [status]="p['status']" [fileDiff]="p['fileDiff']" [isUndone]="p['isUndone']" [onUndoToggle]="p['onUndoToggle']" [onFileOpen]="p['onFileOpen']" [onFileDoubleClick]="p['onFileDoubleClick']" [onFileDiff]="p['onFileDiff']" [onFileRevert]="p['onFileRevert']" [onAskUserResponse]="p['onAskUserResponse']" [onSkip]="p['onSkip']" [skipDisabledReason]="p['skipDisabledReason']" [className]="p['className']"></div>`,
})(
  class ToolCallCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ToolCallCardHost>>
  container: HTMLElement
} | null = null

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Render one tool call.
 *
 * @param overrides - Inputs to override.
 * @returns The container.
 */
async function renderCall(overrides: Record<string, unknown> = {}): Promise<HTMLElement> {
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
  const ref: ComponentRef<InstanceType<typeof ToolCallCardHost>> = createComponent(
    ToolCallCardHost,
    {
      environmentInjector: appRef.injector,
    },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { ...EDIT_PROPS, ...overrides }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return container
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  current?.appRef.destroy()
  current?.container.remove()
  current = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('ToolCallCard — a revert the host rejects', () => {
  it('logs the failure and leaves the card un-reverted', async () => {
    const warn = vi.spyOn(getLogger('tool-call-card'), 'warn')
    const onUndoToggle = vi.fn()
    const onFileRevert = vi.fn(() => Promise.reject(new Error('disk full')))
    const container = await renderCall({ onFileRevert, onUndoToggle })

    const undo = container.querySelector('[title="Undo this change"]') as HTMLElement
    expect(undo).not.toBeNull()
    undo.click()

    await vi.waitFor(async () => {
      await flush()
      expect(warn).toHaveBeenCalledWith('tool-call-card: reverting a file change failed', {
        error: expect.any(Error),
        path: 'src/app.ts',
      })
    })

    // The card stays exactly as it was: still offering undo, never announced undone.
    expect(onUndoToggle).not.toHaveBeenCalled()
    expect(container.querySelector('[title="Undo this change"]')).not.toBeNull()
    // The busy state cleared, so the control can be tried again.
    await vi.waitFor(async () => {
      await flush()
      expect(
        (container.querySelector('[title="Undo this change"]') as HTMLElement).style.cursor,
      ).toBe('pointer')
    })
    warn.mockRestore()
  })
})
