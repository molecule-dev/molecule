// @vitest-environment jsdom

/**
 * Two results that are not successes and must never read as one: a call a
 * server restart interrupted (its effect is unknown), and a subagent run that
 * failed (one plain line for the person; the model-facing report stays hidden).
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  isInterruptedByRestart,
  subagentErrorLine,
  toolSummary,
} from '../components/tool-call-utilities.js'
import { ToolCallCard } from '../components/ToolCallCard.js'
import type { ToolCallCardProps } from '../types.js'

/** The output the API settles an interrupted write/command with. */
const INTERRUPTED_OUTPUT = {
  status: 'interrupted_by_restart',
  message:
    'The server restarted while this call was running, so whether it took effect is unknown. Check the actual state first.',
}

/** The model-facing report a failed subagent run carries beside its error. */
const MODEL_REPORT =
  'Subagent aborted after a provider error (Error: fetch failed). Treat its part as unfinished and do it yourself.'

/** A minimal light theme so `useThemeMode` resolves. */
function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

/**
 * Wrap a card in the contexts it mounts in.
 *
 * @param children - The card.
 * @returns The wrapped tree.
 */
function wrap(children: ReactNode): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
    </I18nProvider>
  )
}

/**
 * Render one tool call.
 *
 * @param overrides - Props to override.
 * @returns The container.
 */
function renderCall(overrides: Partial<ToolCallCardProps> = {}): HTMLElement {
  const { container } = render(
    wrap(
      <ToolCallCard
        id="tc-1"
        name="exec_command"
        input={{ command: 'npx playwright test' }}
        status="running"
        {...overrides}
      />,
    ),
  )
  return container
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

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
    expect(toolSummary('write_file', INTERRUPTED_OUTPUT, 'done')).toBe('Interrupted')
    expect(toolSummary('exec_command', INTERRUPTED_OUTPUT, 'done')).toBe('Interrupted')
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
    expect(subagentErrorLine('The subagent stopped: the AI provider failed.', MODEL_REPORT)).toBe(
      'The subagent stopped: the AI provider failed.',
    )
  })

  it('never shows raw error text', () => {
    expect(subagentErrorLine('Error: fetch failed', '')).toBe(
      'This subagent stopped before it finished.',
    )
    expect(subagentErrorLine('TypeError: x is undefined', '')).toBe(
      'This subagent stopped before it finished.',
    )
  })

  it('treats a failure report with no error key as a failure', () => {
    expect(subagentErrorLine(undefined, MODEL_REPORT)).toBe(
      'This subagent stopped before it finished.',
    )
  })

  it('is empty for a run that finished', () => {
    expect(subagentErrorLine(undefined, 'Found three call sites in src/api.')).toBe('')
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
