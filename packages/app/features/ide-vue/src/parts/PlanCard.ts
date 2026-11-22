/**
 * The working plan, one of the strips above the composer. It is not part of
 * the transcript: every `update_task_list` call re-draws this one strip
 * instead of adding a new card to the chat.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `PlanCard` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input. The rows render over the shared `DockStrip` chrome with the
 * shared `StatusMark` icon — a check circle when done, the platform's
 * molecule spinner while the turn is running and the step is in progress, a
 * still ring that says why the work stopped when it is not (a question mark
 * while the person has to answer, a dash when it simply stopped), an empty
 * ring while still to do. Done rows dim and strike through. The strip's
 * detail collapses through its own disclosure toggle; while collapsed and a
 * step is in flight the header hints the step's content. The component is a
 * part (React renders it inside ChatPanel without exporting it), so it lives
 * in `src/parts/`.
 *
 * @module
 */

import { createTextVNode, defineComponent, h, type PropType, ref, type VNodeChild } from 'vue'

import { normalizeTaskListInput, type TaskListRow } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { DockStrip, StatusMark, type StatusMarkState } from './DockStrip.js'

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
    const calls = messages[m].toolCalls ?? []
    for (let c = calls.length - 1; c >= 0; c--) {
      if (calls[c].name !== 'update_task_list') continue
      const rows = normalizeTaskListInput(calls[c].input)
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
export const PlanCard = defineComponent({
  name: 'PlanCard',
  inheritAttrs: false,
  props: {
    /** The latest task list. */
    todos: {
      type: Array as PropType<ReadonlyArray<TaskListRow>>,
      required: true,
    },
    /** Whether a turn is running. A step still "in progress" with no turn running is not progressing. */
    live: { type: Boolean, required: false, default: true },
    /** Whether the turn is paused on a question to the person. */
    awaitingUser: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const expanded = ref(true)

    return (): VNodeChild => {
      const todos = props.todos
      if (todos.length === 0) return null
      const completed = todos.filter((todo) => todo.status === 'completed').length
      const current = todos.find((todo) => todo.status === 'in_progress')
      const stuckMark = inProgressMark(props.live, props.awaitingUser)
      const stuckNote = props.live
        ? undefined
        : props.awaitingUser
          ? t('ide.work.waiting', undefined, { defaultValue: 'Waiting for your answer' })
          : t('ide.work.stopped', undefined, { defaultValue: 'Stopped before finishing' })

      return h(
        DockStrip,
        {
          molId: 'task-list-card',
          toggleMolId: 'task-list-toggle',
          expanded: expanded.value,
          onToggle: () => {
            expanded.value = !expanded.value
          },
          label: t('ide.chat.taskListTitle', undefined, { defaultValue: 'Working plan' }),
          hint: !expanded.value && current ? createTextVNode(`· ${current.content}`) : undefined,
          chipLabel: createTextVNode(
            t(
              'ide.work.plan',
              { done: completed, total: todos.length },
              { defaultValue: 'Plan {{done}}/{{total}}' },
            ),
          ),
          chipTitle: current ? [current.content, stuckNote].filter(Boolean).join(' — ') : undefined,
          icon: h(StatusMark, {
            state: current ? stuckMark : completed === todos.length ? 'done' : 'todo',
            size: 14,
          }),
        },
        () => [
          h('div', { style: { maxHeight: '168px', overflowY: 'auto' } }, [
            ...todos.map((todo, i) =>
              h(
                'div',
                {
                  key: i,
                  'data-mol-id': 'task-list-row',
                  class: cm.textSize('xs'),
                  style: {
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '3px 0',
                    ...(todo.status === 'completed' ? { opacity: '0.55' } : {}),
                  },
                },
                [
                  h(
                    'span',
                    { style: { flexShrink: '0', display: 'inline-flex', paddingTop: '1px' } },
                    [
                      h(StatusMark, {
                        state: todo.status === 'in_progress' ? stuckMark : MARK[todo.status],
                      }),
                    ],
                  ),
                  h(
                    'span',
                    {
                      style: {
                        flex: '1',
                        minWidth: '0px',
                        ...(todo.status === 'completed' ? { textDecoration: 'line-through' } : {}),
                      },
                    },
                    [
                      todo.content,
                      todo.status === 'in_progress' && stuckNote
                        ? h('span', { class: cm.textMuted }, [` — ${stuckNote}`])
                        : null,
                    ],
                  ),
                ],
              ),
            ),
          ]),
        ],
      )
    }
  },
})
