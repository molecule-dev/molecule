// @vitest-environment jsdom
/**
 * A `wait_for_task` card carries only the opaque task id in its input; the
 * command it is waiting on lives on the earlier `exec_command` that returned
 * that id, which the chat panel publishes through the background-task context.
 * This drives the WIRING — context → ToolCallCard label — which is the only
 * place the two ends meet: the pure helpers are covered in
 * `background-task-context.test.ts`, but nothing pinned the card reading the
 * map. Without it the card regresses to a bare task id while every helper test
 * still passes.
 *
 * A port of
 * `@molecule/app-ide-react/src/__tests__/ToolCallCard.wait-task.test.tsx` with
 * the same test names and the same assertions, mounted through Svelte 5's own
 * `mount`/`flushSync`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { buildThemeProvider } from './theme-test-provider.js'
import ToolCallCardHost from './ToolCallCardHost.svelte'

const TASK_ID = 'mol-bg-abc-123'
const COMMAND = 'npm run build'

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
 * Render a `wait_for_task` card.
 *
 * @param commands - The task-id → command map the panel publishes.
 * @param overrides - Prop overrides.
 * @returns The rendered container.
 */
function renderWait(
  commands: ReadonlyMap<string, string>,
  overrides: Partial<ToolCallCardProps> = {},
): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(ToolCallCardHost, {
    target: container,
    props: {
      theme: buildThemeProvider(),
      backgroundCommands: commands,
      id: 'tc-wait',
      name: 'wait_for_task',
      input: { taskId: TASK_ID },
      status: 'done',
      output: { taskId: TASK_ID, exitCode: 0 },
      ...overrides,
    },
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

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
