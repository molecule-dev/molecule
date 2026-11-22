// @vitest-environment jsdom

/**
 * Two results that are not successes and must never read as one: a call a
 * server restart interrupted (its effect is unknown), and a subagent run that
 * failed (one plain line for the person; the model-facing report stays hidden).
 *
 * Angular port of
 * `@molecule/app-ide-react/src/__tests__/ToolCallCard.interrupted-subagent.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication`.
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
import type { TranslateFunction } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import {
  isInterruptedByRestart,
  subagentErrorLine,
  toolSummary,
} from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * English passthrough translator — the text the package's former static `t`
 * returned for `en`, so these direct-call expectations stay plain English while
 * following the caller-supplied-translate-function contract.
 */
const t: TranslateFunction = (key, values, opts) =>
  opts?.defaultValue
    ? Object.entries(values ?? {}).reduce(
        (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
        opts.defaultValue,
      )
    : key

/** The output the API settles an interrupted write/command with. */
const INTERRUPTED_OUTPUT = {
  status: 'interrupted_by_restart',
  message:
    'The server restarted while this call was running, so whether it took effect is unknown. Check the actual state first.',
}

/** The model-facing report a failed subagent run carries beside its error. */
const MODEL_REPORT =
  'Subagent aborted after a provider error (Error: fetch failed). Treat its part as unfinished and do it yourself.'

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

/** Lets Angular's zoneless change detection settle. */
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
  ref.instance.p = {
    id: 'tc-1',
    name: 'exec_command',
    input: { command: 'npx playwright test' },
    status: 'running',
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
  await renderCall({ name: 'spawn_agent', output: {} })
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

/**
 * Every coloured status marker the card drew: the SVG dot's fill and the
 * subagent dot's background.
 *
 * @param container - The rendered container.
 * @returns The marker colours, as the DOM carries them.
 */
const dotsOf = (container: HTMLElement): Array<string | null> => [
  ...[...container.querySelectorAll('circle')].map((c) => c.getAttribute('fill')),
  ...[...container.querySelectorAll('span[aria-hidden]')].map(
    (s) => (s as HTMLElement).style.background || null,
  ),
]

describe('interrupted_by_restart', () => {
  it('is recognised from the output status', () => {
    expect(isInterruptedByRestart(INTERRUPTED_OUTPUT)).toBe(true)
    expect(isInterruptedByRestart({ status: 'skipped_by_user' })).toBe(false)
    expect(isInterruptedByRestart({ ok: true })).toBe(false)
    expect(isInterruptedByRestart(null)).toBe(false)
  })

  it('summarises as Interrupted, never as an empty (successful) summary', () => {
    expect(toolSummary(t, 'write_file', INTERRUPTED_OUTPUT, 'done')).toBe('Interrupted')
    expect(toolSummary(t, 'exec_command', INTERRUPTED_OUTPUT, 'done')).toBe('Interrupted')
  })

  it('renders gray with the Interrupted word, never green', async () => {
    const container = await renderCall({
      name: 'write_file',
      input: { path: 'src/a.ts', content: 'x' },
      status: 'done',
      output: INTERRUPTED_OUTPUT,
    })
    expect(container.textContent).toContain('Interrupted')
    const dots = dotsOf(container)
    expect(dots.some((d) => d === '#888888' || d === 'rgb(136, 136, 136)')).toBe(true)
    expect(dots).not.toContain('#3fb950')
    expect(dots).not.toContain('rgb(63, 185, 80)')
  })
})

describe('subagentErrorLine', () => {
  it('shows the server sentence as is', () => {
    expect(
      subagentErrorLine(t, 'The subagent stopped: the AI provider failed.', MODEL_REPORT),
    ).toBe('The subagent stopped: the AI provider failed.')
  })

  it('never shows raw error text', () => {
    expect(subagentErrorLine(t, 'Error: fetch failed', '')).toBe(
      'This subagent stopped before it finished.',
    )
    expect(subagentErrorLine(t, 'TypeError: x is undefined', '')).toBe(
      'This subagent stopped before it finished.',
    )
  })

  it('treats a failure report with no error key as a failure', () => {
    expect(subagentErrorLine(t, undefined, MODEL_REPORT)).toBe(
      'This subagent stopped before it finished.',
    )
  })

  it('is empty for a run that finished', () => {
    expect(subagentErrorLine(t, undefined, 'Found three call sites in src/api.')).toBe('')
  })
})

describe('spawn_agent card — failure', () => {
  it('shows one line and hides the model-facing report', async () => {
    const container = await renderCall({
      name: 'spawn_agent',
      input: { type: 'explore', task: 'look around' },
      status: 'error',
      output: { error: 'The subagent stopped: the AI provider failed.', report: MODEL_REPORT },
    })
    const text = container.textContent ?? ''
    expect(text).toContain('The subagent stopped: the AI provider failed.')
    expect(text).not.toContain('Treat its part as unfinished')
    expect(text).not.toContain('fetch failed')
  })

  it('a legacy failure with no error key is red with the fallback line, not done', async () => {
    const container = await renderCall({
      name: 'spawn_agent',
      input: { type: 'build', task: 'build it' },
      status: 'done',
      output: { report: MODEL_REPORT },
    })
    const text = container.textContent ?? ''
    expect(text).toContain('This subagent stopped before it finished.')
    expect(text).not.toContain('Treat its part as unfinished')
    const dots = dotsOf(container)
    expect(dots.some((d) => d === '#f04040' || d === 'rgb(240, 64, 64)')).toBe(true)
  })

  it('a restart-interrupted run says so, gray', async () => {
    const container = await renderCall({
      name: 'spawn_agent',
      input: { type: 'explore', task: 'look around' },
      status: 'done',
      output: INTERRUPTED_OUTPUT,
    })
    expect(container.textContent).toContain(
      'This step was interrupted by a restart; its effect is unknown.',
    )
    expect(container.textContent).not.toContain('Check the actual state first')
  })
})
