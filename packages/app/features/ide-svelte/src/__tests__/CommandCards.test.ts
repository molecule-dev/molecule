// @vitest-environment jsdom

/**
 * A command says what it is FOR: the executor's one-line reason leads the card
 * and the background strip, and the full command is shown wrapped, never as a
 * single line to scroll sideways — a port of
 * `@molecule/app-ide-react/src/__tests__/CommandCards.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through Svelte 5's own
 * `mount`/`flushSync`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import BackgroundTasksStripHost from './BackgroundTasksStripHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'
import ToolCallCardHost from './ToolCallCardHost.svelte'

const COMMAND = 'npx vitest run --reporter=dot packages/api/src/auth.test.ts'

/** The mounts alive right now, torn down before the next test. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

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
 * Mounts one tool-call card.
 *
 * @param props - The card's props.
 * @returns The container the card mounted into.
 */
function renderCard(props: Omit<ComponentProps<typeof ToolCallCardHost>, 'theme'>): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(ToolCallCardHost, {
    target: container,
    props: { theme: buildThemeProvider(), ...props },
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

describe('exec_command card', () => {
  it('leads with the stated purpose instead of the raw command', () => {
    const container = renderCard({
      id: 'tc-1',
      name: 'exec_command',
      status: 'done',
      input: { command: COMMAND, description: 'Run the auth tests to confirm the fix' },
      output: { stdout: 'ok', stderr: '', exitCode: 0 },
    })
    expect(container.textContent).toContain('Run the auth tests to confirm the fix')
    expect(container.textContent).not.toContain(COMMAND)
  })

  it('falls back to the command when no purpose was given', () => {
    const container = renderCard({
      id: 'tc-2',
      name: 'exec_command',
      status: 'done',
      input: { command: COMMAND },
      output: { stdout: 'ok', stderr: '', exitCode: 0 },
    })
    expect(container.textContent).toContain('Bash')
  })

  it('shows the whole command and output wrapped when expanded', () => {
    const container = renderCard({
      id: 'tc-3',
      name: 'exec_command',
      status: 'done',
      input: { command: COMMAND, description: 'Run the auth tests' },
      output: { stdout: 'line one\nline two', stderr: '', exitCode: 0 },
    })
    getByText('Run the auth tests').click()
    flushSync()
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

  /**
   * Mounts the strip.
   *
   * @param list - The tasks it renders.
   * @returns The container the strip mounted into.
   */
  function renderStrip(list: BackgroundTaskState[]): HTMLElement {
    document.body.innerHTML = ''
    const container = document.createElement('div')
    document.body.appendChild(container)
    const instance = mount(BackgroundTasksStripHost, {
      target: container,
      props: { theme: buildThemeProvider(), tasks: list },
    }) as Record<string, unknown>
    flushSync()
    mounted.push({ instance, container })
    return container
  }

  it('names each task by its purpose, falling back to the command', () => {
    const container = renderStrip(tasks)
    // collapsed: the task in flight is named
    expect(container.textContent).toContain('Run the auth tests')
    // The disclosure is the overlay button named by the label span
    // (aria-labelledby); a real click lands on the button, not the span.
    const toggle = container.querySelector<HTMLElement>(
      '[data-mol-id="chat-background-tasks-toggle"]',
    )
    if (!toggle) throw new Error('the background-tasks disclosure is missing')
    expect(toggle.getAttribute('aria-labelledby')).not.toBeNull()
    toggle.click()
    flushSync()
    const rows = container.querySelectorAll('[data-mol-id="chat-background-task"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('Run the auth tests')
    expect(rows[0].textContent).toContain(COMMAND)
    expect(rows[1].textContent).toContain('npm run build')
  })

  it('renders nothing without tasks', () => {
    const container = renderStrip([])
    expect(container.textContent).toBe('')
  })
})
