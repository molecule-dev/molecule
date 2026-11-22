/**
 * Background-task id → command, as the chat panel publishes it to the cards
 * inside a transcript.
 *
 * The Angular counterpart of `@molecule/app-ide-react`'s
 * `background-task-context`: a `wait_for_task` call carries only the opaque
 * task id, and the command it waits on lives on the earlier `exec_command`
 * that returned that id. A component provides this token above the transcript;
 * `ToolCallCard` injects it. The default is an empty map, so a card mounted
 * without a panel still renders (it falls back to the task id).
 *
 * {@link backgroundTaskCommands} is React's collector — the same walk over the
 * transcript's tool calls — and {@link BackgroundTaskCommandStore} is the live
 * map the panel publishes through the token and rewrites as the transcript
 * grows.
 *
 * This directory is outside the package barrels on purpose: React does not
 * export the context either, so the public surface stays the same.
 *
 * @module
 */

import { InjectionToken } from '@angular/core'

/** A transcript row, read only for its tool calls (React's structural input). */
interface TranscriptRow {
  toolCalls?: ReadonlyArray<{ name?: string; input?: unknown; output?: unknown }>
}

/**
 * Collect the commands of every background task started in a transcript.
 * @param messages - The transcript's messages (only their tool calls are read).
 * @returns Task id → command, for each `exec_command` that returned a `taskId`.
 */
export function backgroundTaskCommands(
  messages: ReadonlyArray<TranscriptRow>,
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
 * The live task-command map the chat panel owns: a `ReadonlyMap` for every
 * card that injects {@link BACKGROUND_TASK_COMMANDS}, rewritten in place as
 * the transcript changes (React's `useMemo` value, whose identity a child sees
 * fresh on each render).
 */
export class BackgroundTaskCommandStore implements ReadonlyMap<string, string> {
  /** The current map (replaced whole on each transcript change). */
  private current: ReadonlyMap<string, string> = new Map<string, string>()

  /**
   * Replaces the published map.
   * @param next - The map derived from the current transcript.
   */
  replace(next: ReadonlyMap<string, string>): void {
    this.current = next
  }

  /**
   * The number of known tasks.
   * @returns How many task ids the transcript knows.
   */
  get size(): number {
    return this.current.size
  }

  /**
   * Looks up one task.
   * @param key - The task id.
   * @returns The command that started the task, when known.
   */
  get(key: string): string | undefined {
    return this.current.get(key)
  }

  /**
   * Whether the transcript knows a task.
   * @param key - The task id.
   * @returns True when the transcript knows the task.
   */
  has(key: string): boolean {
    return this.current.has(key)
  }

  /**
   * Iterates the known task ids.
   * @returns The task ids, in insertion order.
   */
  keys(): MapIterator<string> {
    return this.current.keys()
  }

  /**
   * Iterates the known commands.
   * @returns The commands, in insertion order.
   */
  values(): MapIterator<string> {
    return this.current.values()
  }

  /**
   * Iterates the known entries.
   * @returns The entries, in insertion order.
   */
  entries(): MapIterator<[string, string]> {
    return this.current.entries()
  }

  /**
   * Visits every entry.
   * @param callbackfn - The visitor.
   * @param thisArg - The visitor's `this`.
   */
  forEach(
    callbackfn: (value: string, key: string, map: ReadonlyMap<string, string>) => void,
    thisArg?: unknown,
  ): void {
    this.current.forEach((value, key) => callbackfn.call(thisArg, value, key, this))
  }

  /**
   * Makes the store iterable.
   * @returns An iterator over the entries.
   */
  [Symbol.iterator](): MapIterator<[string, string]> {
    return this.current.entries()
  }

  /**
   * The debug label.
   * @returns The debug label.
   */
  get [Symbol.toStringTag](): string {
    return 'BackgroundTaskCommandStore'
  }
}

/** The live store the chat panel rewrites (the handle behind the token). */
export const BACKGROUND_TASK_COMMANDS_STORE = new InjectionToken<BackgroundTaskCommandStore>(
  'backgroundTaskCommandsStore',
  {
    providedIn: 'root',
    factory: (): BackgroundTaskCommandStore => new BackgroundTaskCommandStore(),
  },
)

/** Task id → the command that was started in the background. */
export const BACKGROUND_TASK_COMMANDS = new InjectionToken<ReadonlyMap<string, string>>(
  'backgroundTaskCommands',
  {
    providedIn: 'root',
    factory: (): ReadonlyMap<string, string> => new Map<string, string>(),
  },
)
