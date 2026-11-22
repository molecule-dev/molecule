/**
 * The pure part of `PlanCard`: which task list the transcript currently holds.
 * It is the transcript scanner of `@molecule/app-ide-react`'s
 * `PlanCard.tsx`, kept in plain TypeScript so the card's module type-checks
 * without Svelte tooling.
 *
 * @module
 */

import { normalizeTaskListInput, type TaskListRow } from '@molecule/app-ide-panel-logic/panels'

/**
 * The plan the transcript's LAST `update_task_list` call carries — searched
 * from the end so a later update wins over the first, in the messages' own
 * order. The panel pins one card instead of repeating each update.
 *
 * @param messages - The transcript, oldest first.
 * @returns The most recent non-empty task list, or `[]` when there is none.
 */
export function latestPlan(
  messages: ReadonlyArray<{
    toolCalls?: ReadonlyArray<{ name?: string; input?: unknown }>
  }>,
): TaskListRow[] {
  for (let m = messages.length - 1; m >= 0; m--) {
    const calls = messages[m].toolCalls ?? []
    for (let c = calls.length - 1; c >= 0; c--) {
      if (calls[c].name !== 'update_task_list') continue
      const rows = normalizeTaskListInput(calls[c].input)
      if (rows.length > 0) return rows
    }
  }
  return []
}
