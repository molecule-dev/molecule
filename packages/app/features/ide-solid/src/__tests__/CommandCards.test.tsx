// @vitest-environment jsdom

/**
 * A command says what it is FOR: the executor's one-line reason leads the card
 * and the background strip, and the full command is shown wrapped, never as a
 * single line to scroll sideways.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/CommandCards.test.tsx` with
 * the same test names and the same behavioral assertions, mounted as real Solid
 * roots under the theme provider (the only context these components need).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { ThemeContext, type ThemeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/ToolCallCard.jsx'
import { BackgroundTasksStrip } from '../parts/BackgroundTasksStrip.jsx'

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)

const COMMAND = 'npx vitest run --reporter=dot packages/api/src/auth.test.ts'

/** The root this file last mounted, disposed before the next render. */
let dispose: (() => void) | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  dispose?.()
  dispose = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts one element under the theme provider.
 *
 * @param element - The JSX to mount.
 * @returns The host element.
 */
function mount(element: () => JSX.Element): HTMLElement {
  dispose?.()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  dispose = render(
    () => <ThemeContext.Provider value={themeProvider}>{element()}</ThemeContext.Provider>,
    host,
  )
  return host
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
 * Finds the disclosure button whose accessible name (through its
 * `aria-labelledby` label span, React's form) is the given text.
 *
 * @param text - The accessible name.
 * @returns The button.
 */
function getButtonByLabel(text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (element) => {
      const labelId = element.getAttribute('aria-labelledby')
      return labelId != null && document.getElementById(labelId)?.textContent === text
    },
  )
  if (!button) throw new Error(`no button labelled: ${text}`)
  return button
}

describe('exec_command card', () => {
  it('leads with the stated purpose instead of the raw command', () => {
    const host = mount(() => (
      <ToolCallCard
        id="tc-1"
        name="exec_command"
        status="done"
        input={{ command: COMMAND, description: 'Run the auth tests to confirm the fix' }}
        output={{ stdout: 'ok', stderr: '', exitCode: 0 }}
      />
    ))
    expect(host.textContent).toContain('Run the auth tests to confirm the fix')
    expect(host.textContent).not.toContain(COMMAND)
  })

  it('falls back to the command when no purpose was given', () => {
    const host = mount(() => (
      <ToolCallCard
        id="tc-2"
        name="exec_command"
        status="done"
        input={{ command: COMMAND }}
        output={{ stdout: 'ok', stderr: '', exitCode: 0 }}
      />
    ))
    expect(host.textContent).toContain('Bash')
  })

  it('shows the whole command and output wrapped when expanded', () => {
    const host = mount(() => (
      <ToolCallCard
        id="tc-3"
        name="exec_command"
        status="done"
        input={{ command: COMMAND, description: 'Run the auth tests' }}
        output={{ stdout: 'line one\nline two', stderr: '', exitCode: 0 }}
      />
    ))
    getByText('Run the auth tests').click()
    const panes = Array.from(host.querySelectorAll('pre'))
    expect(panes.map((p) => p.textContent).join('|')).toContain(COMMAND)
    for (const pane of panes) expect(pane.style.whiteSpace).toBe('pre-wrap')
    expect(host.textContent).toContain('Command')
    expect(host.textContent).toContain('Output')
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

  it('names each task by its purpose, falling back to the command', () => {
    const host = mount(() => <BackgroundTasksStrip tasks={tasks} />)
    // collapsed: the task in flight is named
    expect(host.textContent).toContain('Run the auth tests')
    // The disclosure is the overlay button named by the label span
    // (aria-labelledby); a real click lands on the button, not the span.
    getButtonByLabel('1 task running in the background').click()
    const rows = host.querySelectorAll('[data-mol-id="chat-background-task"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.textContent).toContain('Run the auth tests')
    expect(rows[0]?.textContent).toContain(COMMAND)
    expect(rows[1]?.textContent).toContain('npm run build')
  })

  it('renders nothing without tasks', () => {
    const host = mount(() => <BackgroundTasksStrip tasks={[]} />)
    expect(host.textContent).toBe('')
  })
})
