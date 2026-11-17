// @vitest-environment jsdom

/**
 * A command says what it is FOR: the executor's one-line reason leads the card
 * and the background strip, and the full command is shown wrapped, never as a
 * single line to scroll sideways.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BackgroundTasksStrip } from '../components/BackgroundTasksStrip.js'
import { ToolCallCard } from '../components/ToolCallCard.js'
import { buildThemeProvider } from './theme-test-provider.js'

const COMMAND = 'npx vitest run --reporter=dot packages/api/src/auth.test.ts'

function inProviders(ui: ReactElement): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>{ui}</ThemeProvider>
    </I18nProvider>
  )
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('exec_command card', () => {
  it('leads with the stated purpose instead of the raw command', () => {
    const { container } = render(
      inProviders(
        <ToolCallCard
          id="tc-1"
          name="exec_command"
          status="done"
          input={{ command: COMMAND, description: 'Run the auth tests to confirm the fix' }}
          output={{ stdout: 'ok', stderr: '', exitCode: 0 }}
        />,
      ),
    )
    expect(container.textContent).toContain('Run the auth tests to confirm the fix')
    expect(container.textContent).not.toContain(COMMAND)
  })

  it('falls back to the command when no purpose was given', () => {
    const { container } = render(
      inProviders(
        <ToolCallCard
          id="tc-2"
          name="exec_command"
          status="done"
          input={{ command: COMMAND }}
          output={{ stdout: 'ok', stderr: '', exitCode: 0 }}
        />,
      ),
    )
    expect(container.textContent).toContain('Bash')
  })

  it('shows the whole command and output wrapped when expanded', () => {
    const { container, getByText } = render(
      inProviders(
        <ToolCallCard
          id="tc-3"
          name="exec_command"
          status="done"
          input={{ command: COMMAND, description: 'Run the auth tests' }}
          output={{ stdout: 'line one\nline two', stderr: '', exitCode: 0 }}
        />,
      ),
    )
    fireEvent.click(getByText('Run the auth tests'))
    const panes = Array.from(container.querySelectorAll('pre'))
    expect(panes.map((p) => p.textContent).join('|')).toContain(COMMAND)
    for (const pane of panes) expect(pane.style.whiteSpace).toBe('pre-wrap')
    expect(container.textContent).toContain('Command')
    expect(container.textContent).toContain('Output')
  })
})

describe('BackgroundTasksStrip', () => {
  const tasks = [
    {
      id: 'mol-bg-1',
      command: COMMAND,
      description: 'Run the auth tests',
      status: 'running' as const,
      startedAt: Date.now(),
    },
    {
      id: 'mol-bg-2',
      command: 'npm run build',
      status: 'succeeded' as const,
      startedAt: 0,
      finishedAt: 5000,
    },
  ]

  it('names each task by its purpose, falling back to the command', () => {
    const { container, getByRole } = render(inProviders(<BackgroundTasksStrip tasks={tasks} />))
    // collapsed: the task in flight is named
    expect(container.textContent).toContain('Run the auth tests')
    // The disclosure is the overlay button named by the label span
    // (aria-labelledby); a real click lands on the button, not the span.
    fireEvent.click(getByRole('button', { name: '1 task running in the background' }))
    const rows = container.querySelectorAll('[data-mol-id="chat-background-task"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('Run the auth tests')
    expect(rows[0].textContent).toContain(COMMAND)
    expect(rows[1].textContent).toContain('npm run build')
  })

  it('renders nothing without tasks', () => {
    const { container } = render(inProviders(<BackgroundTasksStrip tasks={[]} />))
    expect(container.textContent).toBe('')
  })
})
