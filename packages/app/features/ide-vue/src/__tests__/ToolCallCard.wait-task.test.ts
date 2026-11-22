// @vitest-environment jsdom
/**
 * A `wait_for_task` card carries only the opaque task id in its input; the
 * command it is waiting on lives on the earlier `exec_command` that returned
 * that id, which the chat panel publishes through
 * {@link backgroundTaskCommandsKey}. This drives the WIRING — context →
 * ToolCallCard label. A port of `@molecule/app-ide-react`'s
 * `ToolCallCard.wait-task.test.tsx` with the same test names and the same
 * behavioral assertions, mounted through Vue's own `createApp`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, provide, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { ToolCallCard } from '../components/ToolCallCard.js'
import { backgroundTaskCommandsKey } from '../context/background-task-commands.js'
import { buildThemeProvider } from './theme-test-provider.js'

const TASK_ID = 'mol-bg-abc-123'
const COMMAND = 'npm run build'

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * Render a `wait_for_task` card inside the contexts it mounts in, with the
 * background-task map the panel publishes.
 *
 * @param commands - The task-id → command map the panel publishes.
 * @param overrides - Prop overrides.
 * @returns The rendered container.
 */
function renderWait(
  commands: ReadonlyMap<string, string>,
  overrides: Record<string, unknown> = {},
): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      setup() {
        provide(backgroundTaskCommandsKey, commands)
        return (): VNodeChild =>
          h(ToolCallCard, {
            id: 'tc-wait',
            name: 'wait_for_task',
            input: { taskId: TASK_ID },
            status: 'done',
            output: { taskId: TASK_ID, exitCode: 0 },
            ...overrides,
          })
      },
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

describe('ToolCallCard — wait_for_task names the command from the transcript map', () => {
  it('names the background command the wait is for, not just its task id', () => {
    const container = renderWait(new Map([[TASK_ID, COMMAND]]))

    expect(container.textContent).toContain('Wait for')
    expect(container.textContent).toContain(COMMAND)
    // The id is the fallback, not the answer, once the command is known.
    expect(container.textContent).not.toContain(TASK_ID)
  })

  it('falls back to the task id when the starting command is not in the transcript', () => {
    // A wait whose `exec_command` predates the loaded transcript window: the
    // id is then the only thing the card can honestly say.
    const container = renderWait(new Map())

    expect(container.textContent).toContain(TASK_ID)
    expect(container.textContent).not.toContain(COMMAND)
  })
})
