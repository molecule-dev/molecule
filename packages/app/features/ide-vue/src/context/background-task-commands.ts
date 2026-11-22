/**
 * Background-task id → command, as the chat panel publishes it to the cards
 * inside a transcript.
 *
 * The Vue counterpart of `@molecule/app-ide-react`'s `background-task-context`:
 * a `wait_for_task` call carries only the opaque task id, and the command it
 * waits on lives on the earlier `exec_command` that returned that id. A
 * component provides this key above the transcript; `ToolCallCard` injects it.
 *
 * @module
 */

import type { InjectionKey } from 'vue'

/** Task id → the command that was started in the background. */
export const backgroundTaskCommandsKey: InjectionKey<ReadonlyMap<string, string>> =
  Symbol('backgroundTaskCommands')

/**
 * Collect the commands of every background task started in a transcript.
 *
 * The Vue counterpart of `@molecule/app-ide-react`'s `backgroundTaskCommands`:
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
