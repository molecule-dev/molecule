// @vitest-environment jsdom
/**
 * A command says what it is FOR: the executor's one-line reason leads the card
 * and the background strip, and the full command is shown wrapped, never as a
 * single line to scroll sideways — the Vue port of
 * `@molecule/app-ide-react/src/__tests__/CommandCards.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through Vue's own
 * `createApp`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type Component, createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { ToolCallCard } from '../components/ToolCallCard.js'
import { BackgroundTasksStrip } from '../parts/BackgroundTasksStrip.js'
import { buildThemeProvider } from './theme-test-provider.js'

const COMMAND = 'npx vitest run --reporter=dot packages/api/src/auth.test.ts'

const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * Mounts one component inside the contexts it renders in.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The host element.
 */
function mount(component: Component, props: Record<string, unknown> = {}): HTMLElement {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(component, props),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
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
 * Finds a button by its accessible name (React Testing Library's
 * `getByRole('button', { name })`): the `aria-labelledby` targets' text, else
 * `aria-label`, else the button's own text.
 *
 * @param container - The element to search.
 * @param name - The accessible name.
 * @returns The matching button.
 */
function getButtonByName(container: HTMLElement, name: string): HTMLButtonElement {
  for (const button of Array.from(container.querySelectorAll<HTMLButtonElement>('button'))) {
    const labelledBy = button.getAttribute('aria-labelledby')
    const accessibleName =
      labelledBy !== null
        ? labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent ?? '')
            .join(' ')
        : (button.getAttribute('aria-label') ?? button.textContent ?? '')
    if (accessibleName.trim() === name) return button
  }
  throw new Error(`no button named: ${name}`)
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
})

describe('exec_command card', () => {
  it('leads with the stated purpose instead of the raw command', () => {
    const container = mount(ToolCallCard, {
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
    const container = mount(ToolCallCard, {
      id: 'tc-2',
      name: 'exec_command',
      status: 'done',
      input: { command: COMMAND },
      output: { stdout: 'ok', stderr: '', exitCode: 0 },
    })
    expect(container.textContent).toContain('Bash')
  })

  it('shows the whole command and output wrapped when expanded', async () => {
    const container = mount(ToolCallCard, {
      id: 'tc-3',
      name: 'exec_command',
      status: 'done',
      input: { command: COMMAND, description: 'Run the auth tests' },
      output: { stdout: 'line one\nline two', stderr: '', exitCode: 0 },
    })
    getByText('Run the auth tests').click()
    await nextTick()
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

  it('names each task by its purpose, falling back to the command', async () => {
    const container = mount(BackgroundTasksStrip, { tasks })
    // collapsed: the task in flight is named
    expect(container.textContent).toContain('Run the auth tests')
    // The disclosure is the overlay button named by the label span
    // (aria-labelledby); a real click lands on the button, not the span.
    getButtonByName(container, '1 task running in the background').click()
    await nextTick()
    const rows = container.querySelectorAll('[data-mol-id="chat-background-task"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('Run the auth tests')
    expect(rows[0].textContent).toContain(COMMAND)
    expect(rows[1].textContent).toContain('npm run build')
  })

  it('renders nothing without tasks', () => {
    const container = mount(BackgroundTasksStrip, { tasks: [] })
    expect(container.textContent).toBe('')
  })
})
