// @vitest-environment jsdom

/**
 * A `wait_for_task` card carries only the opaque task id in its input; the
 * command it is waiting on lives on the earlier `exec_command` that returned
 * that id, which the chat panel publishes through
 * {@link BACKGROUND_TASK_COMMANDS}. This drives the WIRING — the injected map
 * → the card's label — which is the only place the two ends meet: the pure
 * helpers are covered in the panel logic's own tests, but nothing pinned the
 * card reading the map. Without it the card regresses to a bare task id while
 * every helper test still passes.
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/ToolCallCard.wait-task.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication` with the theme provider and the map token.
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
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { BACKGROUND_TASK_COMMANDS } from '../context/background-task-commands.js'
import { buildThemeProvider } from './theme-test-provider.js'

const TASK_ID = 'mol-bg-abc-123'
const COMMAND = 'npm run build'

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

/** Mounts the card and lets its first render settle. */
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
 * Render a `wait_for_task` card with the published task map.
 *
 * @param commands - The task-id → command map the panel publishes.
 * @param overrides - Input overrides.
 * @returns The rendered container.
 */
async function renderWait(
  commands: ReadonlyMap<string, string>,
  overrides: Record<string, unknown> = {},
): Promise<HTMLElement> {
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
      provideTheme(buildThemeProvider()),
      { provide: BACKGROUND_TASK_COMMANDS, useValue: commands },
    ],
  })
  const ref: ComponentRef<InstanceType<typeof ToolCallCardHost>> = createComponent(
    ToolCallCardHost,
    {
      environmentInjector: appRef.injector,
    },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    id: 'tc-wait',
    name: 'wait_for_task',
    input: { taskId: TASK_ID },
    status: 'done',
    output: { taskId: TASK_ID, exitCode: 0 },
    ...overrides,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return container
}

/** Destroys the live mount, the way the React suite's `cleanup()` does. */
async function cleanup(): Promise<void> {
  if (!current) return
  current.appRef.destroy()
  current.container.remove()
  current = null
  document.body.innerHTML = ''
}

// The first mount in a worker pays Angular's JIT compilation of the card's
// large template; warm it up outside a test so no assertion carries that cost.
beforeAll(async () => {
  await renderWait(new Map())
  await cleanup()
}, 120_000)

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  await cleanup()
  setProvider(createSimpleI18nProvider())
})

describe('ToolCallCard — wait_for_task names the command from the transcript map', () => {
  it('names the background command the wait is for, not just its task id', async () => {
    const container = await renderWait(new Map([[TASK_ID, COMMAND]]))

    expect(container.textContent).toContain('Wait for')
    expect(container.textContent).toContain(COMMAND)
    // The id is the fallback, not the answer, once the command is known.
    expect(container.textContent).not.toContain(TASK_ID)
  })

  it('falls back to the task id when the starting command is not in the transcript', async () => {
    // A wait whose `exec_command` predates the loaded transcript window: the
    // id is then the only thing the card can honestly say.
    const container = await renderWait(new Map())

    expect(container.textContent).toContain(TASK_ID)
    expect(container.textContent).not.toContain(COMMAND)
  })
})
