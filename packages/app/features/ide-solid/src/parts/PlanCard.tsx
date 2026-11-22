/**
 * The working plan, one of the strips above the composer. It is not part of
 * the transcript: every `update_task_list` call re-draws this one strip
 * instead of adding a new card to the chat.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `PlanCard` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input. The rows render over the shared `DockStrip` chrome with the
 * shared `StatusMark` icon — a check circle when done, the platform's
 * molecule spinner while the turn is running and the step is in progress, a
 * still ring that says why the work stopped when it is not (a question mark
 * while the person has to answer, a dash when it simply stopped), an empty
 * ring while still to do. Done rows dim and strike through. The strip's
 * detail collapses through its own disclosure toggle; while collapsed and a
 * step is in flight the header hints the step's content. Rows are tracked by
 * position (`<Index>`, React keys them by index), so a new list re-binds the
 * same nodes instead of re-creating them. The component is a part (React
 * renders it inside ChatPanel without exporting it), so it lives in
 * `src/parts/`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createSignal, Index, Show } from 'solid-js'

import type { TaskListRow } from '@molecule/app-ide-panel-logic/panels'
import { normalizeTaskListInput } from '@molecule/app-ide-panel-logic/panels'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { DockStrip, StatusMark, type StatusMarkState } from './DockStrip.jsx'

/** The status icon each row's status draws: done, active, or the empty ring. */
const MARK: Record<TaskListRow['status'], StatusMarkState> = {
  completed: 'done',
  in_progress: 'active',
  pending: 'todo',
}

/**
 * The mark for a step still in progress: a spinner only while a turn is
 * actually running.
 *
 * @param live - Whether a turn is running.
 * @param awaitingUser - Whether the turn is paused on a question.
 * @returns The mark's state.
 */
function inProgressMark(live: boolean, awaitingUser: boolean): StatusMarkState {
  return live ? 'active' : awaitingUser ? 'waiting' : 'stopped'
}

/**
 * The latest plan in a transcript: the most recent `update_task_list` call's
 * task list, which replaces the earlier ones.
 *
 * @param messages - The transcript's messages (only their tool calls are read).
 * @returns The latest task list, or an empty list when there is none.
 */
export function latestPlan(
  messages: ReadonlyArray<{
    toolCalls?: ReadonlyArray<{ name?: string; input?: unknown }>
  }>,
): TaskListRow[] {
  for (let m = messages.length - 1; m >= 0; m--) {
    const calls = messages[m]?.toolCalls ?? []
    for (let c = calls.length - 1; c >= 0; c--) {
      const call = calls[c]
      if (!call || call.name !== 'update_task_list') continue
      const rows = normalizeTaskListInput(call.input)
      if (rows.length > 0) return rows
    }
  }
  return []
}

/** Props for {@link PlanCard} — the React prop names, React's own contract. */
export interface PlanCardProps {
  /** The latest task list. */
  todos: ReadonlyArray<TaskListRow>
  /** Whether a turn is running. A step still "in progress" with no turn running is not progressing. */
  live?: boolean
  /** Whether the turn is paused on a question to the person. */
  awaitingUser?: boolean
}

/**
 * The working plan, redrawn in place on every `update_task_list` call. React
 * renders it inside ChatPanel under the React name `PlanCard`.
 *
 * @param props - See {@link PlanCardProps}.
 * @returns The plan strip, or nothing when the list is empty.
 */
export function PlanCard(props: PlanCardProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [expanded, setExpanded] = createSignal(true)

  /** How many steps are done (the chip's tally). */
  const completed = (): number => props.todos.filter((todo) => todo.status === 'completed').length
  /** The step in flight, or undefined when none is. */
  const current = (): TaskListRow | undefined =>
    props.todos.find((todo) => todo.status === 'in_progress')
  /** Whether a turn is running (React's `live = true` default). */
  const live = (): boolean => props.live ?? true
  /** Whether the turn is paused on a question (React's `awaitingUser = false` default). */
  const awaitingUser = (): boolean => props.awaitingUser ?? false
  /** The mark for the step in flight under the current turn state. */
  const stuckMark = (): StatusMarkState => inProgressMark(live(), awaitingUser())
  /**
   * Why the work is not progressing, when it is not: a question is waiting,
   * or the work simply stopped. Undefined while the turn runs.
   */
  const stuckNote = (): string | undefined =>
    live()
      ? undefined
      : awaitingUser()
        ? t('ide.work.waiting', undefined, { defaultValue: 'Waiting for your answer' })
        : t('ide.work.stopped', undefined, { defaultValue: 'Stopped before finishing' })

  return (
    <Show when={props.todos.length > 0}>
      <DockStrip
        molId="task-list-card"
        toggleMolId="task-list-toggle"
        expanded={expanded()}
        onToggle={() => setExpanded((open) => !open)}
        label={t('ide.chat.taskListTitle', undefined, { defaultValue: 'Working plan' })}
        hint={!expanded() && current() ? `· ${current()?.content}` : undefined}
        chipLabel={t(
          'ide.work.plan',
          { done: completed(), total: props.todos.length },
          { defaultValue: 'Plan {{done}}/{{total}}' },
        )}
        chipTitle={
          current() ? [current()?.content, stuckNote()].filter(Boolean).join(' — ') : undefined
        }
        icon={
          <StatusMark
            state={current() ? stuckMark() : completed() === props.todos.length ? 'done' : 'todo'}
            size={14}
          />
        }
      >
        <div style={{ 'max-height': '168px', 'overflow-y': 'auto' }}>
          <Index each={props.todos}>
            {(todo) => (
              <div
                data-mol-id="task-list-row"
                class={cm.textSize('xs')}
                style={{
                  display: 'flex',
                  'align-items': 'flex-start',
                  gap: '8px',
                  padding: '3px 0px',
                  ...(todo().status === 'completed' ? { opacity: '0.55' } : {}),
                }}
              >
                <span style={{ 'flex-shrink': '0', display: 'inline-flex', 'padding-top': '1px' }}>
                  <StatusMark
                    state={todo().status === 'in_progress' ? stuckMark() : MARK[todo().status]}
                  />
                </span>
                <span
                  style={{
                    flex: '1 1 0%',
                    'min-width': '0px',
                    ...(todo().status === 'completed' ? { 'text-decoration': 'line-through' } : {}),
                  }}
                >
                  {todo().content}
                  {todo().status === 'in_progress' && stuckNote() ? (
                    <span class={cm.textMuted}>{` — ${stuckNote()}`}</span>
                  ) : null}
                </span>
              </div>
            )}
          </Index>
        </div>
      </DockStrip>
    </Show>
  )
}
