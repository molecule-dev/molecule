import { createContext } from 'react'

/**
 * Background task id → the command that was started in the background. A
 * `wait_for_task` call carries only the opaque id; the command is on the
 * earlier `exec_command` that returned it, so the chat panel provides this map
 * and the Wait card can say what it is actually waiting for.
 */
export const BackgroundTaskCommandsContext = createContext<ReadonlyMap<string, string>>(new Map())

/**
 * Collect the commands of every background task started in a transcript.
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
