/**
 * Background-task id → command, as the chat panel publishes it to the cards
 * inside a transcript.
 *
 * The Solid counterpart of `@molecule/app-ide-react`'s
 * `background-task-context`: a `wait_for_task` call carries only the opaque
 * task id, and the command it waits on lives on the earlier `exec_command`
 * that returned that id. A component provides this map above the transcript;
 * `ToolCallCard` reads it.
 *
 * @module
 */

import { createComponent, createContext, type JSX, type ParentProps, useContext } from 'solid-js'

/** Task id → the command that was started in the background. */
const BackgroundTaskCommandsContext = createContext<ReadonlyMap<string, string>>(new Map())

/**
 * Collect the commands of every background task started in a transcript.
 *
 * The Solid counterpart of `@molecule/app-ide-react`'s `backgroundTaskCommands`:
 * a `wait_for_task` call carries only the opaque task id, and the command it
 * waits on lives on the earlier `exec_command` that returned that id.
 *
 * @param messages - The transcript's messages (only their tool calls are read).
 * @returns Task id → command, for each `exec_command` that returned a `taskId`.
 */
export function backgroundTaskCommands(
  messages: ReadonlyArray<{
    toolCalls?: ReadonlyArray<{ name?: string; input?: unknown; output?: unknown }>
  }>,
): Map<string, string> {
  const commands = new Map<string, string>()
  for (const message of messages) {
    for (const call of message.toolCalls ?? []) {
      if (call.name !== 'exec_command') continue
      const taskId = (call.output as { taskId?: unknown } | null | undefined)?.taskId
      const command = (call.input as { command?: unknown } | null | undefined)?.command
      if (typeof taskId === 'string' && typeof command === 'string' && command !== '')
        commands.set(taskId, command)
    }
  }
  return commands
}

/**
 * Publishes the transcript's background-task commands to the cards below it.
 *
 * @param props - The task-id → command map, and the tree that reads it.
 * @returns The provided subtree.
 */
export function BackgroundTaskCommandsProvider(
  props: ParentProps<{ commands: ReadonlyMap<string, string> }>,
): JSX.Element {
  // `createComponent` instead of JSX keeps this module a `.ts` file; the
  // getters keep the provided map and children reactive.
  return createComponent(BackgroundTaskCommandsContext.Provider, {
    get value() {
      return props.commands
    },
    get children() {
      return props.children
    },
  })
}

/**
 * The background-task commands published above this component (an empty map
 * when no provider is mounted).
 *
 * @returns Task id → the command started in the background.
 */
export function useBackgroundTaskCommands(): ReadonlyMap<string, string> {
  return useContext(BackgroundTaskCommandsContext)
}
