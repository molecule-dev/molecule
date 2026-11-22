// @vitest-environment jsdom
/**
 * A command says what it is FOR: the executor's one-line reason leads the card
 * and the background strip, and the full command is shown wrapped, never as a
 * single line to scroll sideways.
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/CommandCards.test.tsx`
 * with the same test names and the same assertions, mounted through Angular's
 * own `createApplication` (a JIT host binds every input, so they arrive through
 * real bindings).
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import { provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { BackgroundTasksStrip } from '../parts/background-tasks-strip.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

const COMMAND = 'npx vitest run --reporter=dot packages/api/src/auth.test.ts'

/** The JIT host binding every ToolCallCard input from one live props object. */
const ToolCallCardHost = Component({
  selector: 'mol-command-card-host',
  standalone: true,
  imports: [ToolCallCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-tool-call-card [id]="p['id']" [name]="p['name']" [input]="p['input']" [output]="p['output']" [status]="p['status']"></div>`,
})(
  class ToolCallCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The JIT host binding every BackgroundTasksStrip input. */
const StripHost = Component({
  selector: 'mol-command-strip-host',
  standalone: true,
  imports: [BackgroundTasksStrip],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-background-tasks-strip [tasks]="p['tasks']"></div>`,
})(
  class StripHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<{ p: Record<string, unknown> }>
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
 * Mounts a component of the given type with the given props.
 *
 * @param type - The standalone component type.
 * @param props - The props the host binds.
 * @returns The container.
 */
async function mount(
  type: typeof ToolCallCardHost | typeof StripHost,
  props: Record<string, unknown>,
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
    providers: [provideZonelessChangeDetection(), provideTheme(buildThemeProvider())],
  })
  const ref: ComponentRef<InstanceType<typeof ToolCallCardHost | typeof StripHost>> =
    createComponent(type, { environmentInjector: appRef.injector })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  current.appRef.tick()
  await flush()
  return container
}

/**
 * Finds the deepest element whose whole text is the given text (React's
 * `getByText`).
 *
 * @param text - The text to find.
 * @returns The element.
 */
function getByText(text: string): HTMLElement {
  const matches = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(
    (element) => element.textContent === text,
  )
  const deepest = matches.filter((element) =>
    matches.every((other) => other === element || !element.contains(other)),
  )
  const found = deepest[0]
  if (!found) throw new Error(`no element with text: ${text}`)
  return found
}

/**
 * Finds the disclosure button whose accessible name is the given text (React
 * Testing Library's `getByRole('button', { name })`), resolving
 * `aria-labelledby` against the document.
 *
 * @param container - The mount container.
 * @param name - The accessible name.
 * @returns The button.
 */
function getButtonByName(container: HTMLElement, name: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
  const found = buttons.find((button) => {
    const explicit = button.getAttribute('aria-label')
    if (explicit) return explicit === name
    const ids = (button.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)
    const label = ids
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim()
    return label === name
  })
  if (!found) throw new Error(`no button named: ${name}`)
  return found
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
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

describe('exec_command card', () => {
  it('leads with the stated purpose instead of the raw command', async () => {
    const container = await mount(ToolCallCardHost, {
      id: 'tc-1',
      name: 'exec_command',
      status: 'done',
      input: { command: COMMAND, description: 'Run the auth tests to confirm the fix' },
      output: { stdout: 'ok', stderr: '', exitCode: 0 },
    })
    expect(container.textContent).toContain('Run the auth tests to confirm the fix')
    expect(container.textContent).not.toContain(COMMAND)
  })

  it('falls back to the command when no purpose was given', async () => {
    const container = await mount(ToolCallCardHost, {
      id: 'tc-2',
      name: 'exec_command',
      status: 'done',
      input: { command: COMMAND },
      output: { stdout: 'ok', stderr: '', exitCode: 0 },
    })
    expect(container.textContent).toContain('Bash')
  })

  it('shows the whole command and output wrapped when expanded', async () => {
    const container = await mount(ToolCallCardHost, {
      id: 'tc-3',
      name: 'exec_command',
      status: 'done',
      input: { command: COMMAND, description: 'Run the auth tests' },
      output: { stdout: 'line one\nline two', stderr: '', exitCode: 0 },
    })
    getByText('Run the auth tests').click()
    await flush()
    const panes = Array.from(container.querySelectorAll('pre'))
    expect(panes.map((p) => p.textContent).join('|')).toContain(COMMAND)
    for (const pane of panes) expect(pane.style.whiteSpace).toBe('pre-wrap')
    expect(container.textContent).toContain('Command')
    expect(container.textContent).toContain('Output')
  })
})

describe('BackgroundTasksStrip', () => {
  const tasks: BackgroundTaskState[] = [
    {
      id: 'mol-bg-1',
      command: COMMAND,
      description: 'Run the auth tests',
      status: 'running',
      startedAt: Date.now(),
    },
    {
      id: 'mol-bg-2',
      command: 'npm run build',
      status: 'succeeded',
      startedAt: 0,
      finishedAt: 5000,
    },
  ]

  it('names each task by its purpose, falling back to the command', async () => {
    const container = await mount(StripHost, { tasks })
    // collapsed: the task in flight is named
    expect(container.textContent).toContain('Run the auth tests')
    // The disclosure is the overlay button named by the label span
    // (aria-labelledby); a real click lands on the button, not the span.
    getButtonByName(container, '1 task running in the background').click()
    await flush()
    const rows = container.querySelectorAll('[data-mol-id="chat-background-task"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('Run the auth tests')
    expect(rows[0].textContent).toContain(COMMAND)
    expect(rows[1].textContent).toContain('npm run build')
  })

  it('renders nothing without tasks', async () => {
    const container = await mount(StripHost, { tasks: [] })
    expect(container.textContent).toBe('')
  })
})
