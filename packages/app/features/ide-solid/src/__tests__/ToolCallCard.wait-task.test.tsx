// @vitest-environment jsdom

/**
 * A `wait_for_task` card carries only the opaque task id in its input; the
 * command it is waiting on lives on the earlier `exec_command` that returned
 * that id, which the chat panel publishes through the background-task context.
 * This drives the WIRING — context → ToolCallCard label — which is the only
 * place the two ends meet: the pure helpers are covered in the panel logic,
 * but nothing pinned the card reading the map. Without it the card regresses
 * to a bare task id while every helper test still passes.
 *
 * A port of `@molecule/app-ide-react`'s `ToolCallCard.wait-task.test.tsx` with
 * the same test names and the same behavioral assertions, mounted as a real
 * Solid root under the theme provider (the only provider the card needs).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/ToolCallCard.jsx'
import { BackgroundTaskCommandsProvider } from '../context/background-task-commands.js'
import { buildThemeProvider } from './theme-test-provider.js'

const TASK_ID = 'mol-bg-abc-123'
const COMMAND = 'npm run build'

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void; container?: HTMLElement } = {}

/**
 * Render a `wait_for_task` card inside the contexts it mounts in, plus the
 * background-task map.
 *
 * @param commands - The task-id → command map the panel publishes.
 * @param overrides - Prop overrides.
 * @returns The rendered container.
 */
function renderWait(
  commands: ReadonlyMap<string, string>,
  overrides: Partial<ToolCallCardProps> = {},
): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.container = container
  mounted.dispose = render(
    () => (
      <MoleculeProvider theme={buildThemeProvider()}>
        <BackgroundTaskCommandsProvider commands={commands}>
          <ToolCallCard
            id="tc-wait"
            name="wait_for_task"
            input={{ taskId: TASK_ID }}
            status="done"
            output={{ taskId: TASK_ID, exitCode: 0 }}
            {...overrides}
          />
        </BackgroundTaskCommandsProvider>
      </MoleculeProvider>
    ),
    container,
  )
  return container
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
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
