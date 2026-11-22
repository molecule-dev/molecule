/**
 * Background-task id → command, as the chat panel publishes it to the cards
 * inside a transcript.
 *
 * The Svelte counterpart of `@molecule/app-ide-react`'s
 * `background-task-context`: a `wait_for_task` call carries only the opaque
 * task id, and the command it waits on lives on the earlier `exec_command`
 * that returned that id. A host sets this context above the transcript;
 * `ToolCallCard` reads it and falls back to an empty map when no host provides
 * one (React's context default).
 *
 * @module
 */

import { createContext } from 'svelte'

/** The Svelte context tuple: read, publish, and test for presence. */
const context = createContext<ReadonlyMap<string, string>>()

/**
 * Reads the task-id → command map the nearest host published. Call during a
 * component's initialisation, only after {@link hasBackgroundTaskCommands}
 * answered true.
 *
 * @returns The map the host published.
 */
export const getBackgroundTaskCommands = context[0]

/**
 * Publishes the task-id → command map to the cards below. Call during a
 * host component's initialisation.
 *
 * @param commands - The map to publish.
 * @returns The published map.
 */
export const setBackgroundTaskCommands = context[1]

/**
 * Whether a host above the caller published a map.
 *
 * @returns True when {@link getBackgroundTaskCommands} may be called.
 */
export const hasBackgroundTaskCommands = context[2]

/**
 * Reads a string field from an unknown value, treating anything that is not an
 * object (or a non-string member) as absent.
 *
 * @param source - The value to read from.
 * @param key - The field name.
 * @returns The string value, or undefined.
 */
function stringField(source: unknown, key: string): string | undefined {
  if (typeof source !== 'object' || source === null) return undefined
  if (!(key in source)) return undefined
  const value = (source as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

/**
 * Collect the commands of every background task started in a transcript.
 *
 * React's `backgroundTaskCommands` in `@molecule/app-ide-react`'s
 * `background-task-context`: a `wait_for_task` call carries only the opaque
 * id, so the panel derives the id → command map from the earlier
 * `exec_command` that returned it.
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
      const taskId = stringField(call.output, 'taskId')
      const command = stringField(call.input, 'command')
      if (taskId !== undefined && command !== undefined && command !== '') {
        commands.set(taskId, command)
      }
    }
  }
  return commands
}
