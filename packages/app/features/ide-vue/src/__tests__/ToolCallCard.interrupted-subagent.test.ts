// @vitest-environment jsdom
/**
 * Two results that are not successes and must never read as one: a call a
 * server restart interrupted (its effect is unknown), and a subagent run that
 * failed (one plain line for the person; the model-facing report stays hidden).
 * A port of `@molecule/app-ide-react`'s
 * `ToolCallCard.interrupted-subagent.test.tsx` with the same test names and the
 * same behavioral assertions, mounted through Vue's own `createApp`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import type { TranslateFunction } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import {
  isInterruptedByRestart,
  subagentErrorLine,
  toolSummary,
} from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { ToolCallCard } from '../components/ToolCallCard.js'
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

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * Render one tool call inside the contexts it mounts in.
 *
 * @param overrides - Props to override.
 * @returns The container.
 */
function renderCall(overrides: Record<string, unknown> = {}): HTMLElement {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild =>
        h(ToolCallCard, {
          id: 'tc-1',
          name: 'exec_command',
          input: { command: 'npx playwright test' },
          status: 'running',
          ...overrides,
        }),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
  return host
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Every status dot's colour in the card — the `<circle>` fills and the
 * subagent header's `aria-hidden` swatch.
 *
 * @param container - The rendered card.
 * @returns The colours found.
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

  it('renders gray with the Interrupted word, never green', () => {
    const container = renderCall({
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
  it('shows one line and hides the model-facing report', () => {
    const container = renderCall({
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

  it('a legacy failure with no error key is red with the fallback line, not done', () => {
    const container = renderCall({
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

  it('a restart-interrupted run says so, gray', () => {
    const container = renderCall({
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
