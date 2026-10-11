import type { JSX } from 'react'
import { useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import { DockStrip, StatusMark } from './DockStrip.js'
import { normalizeTaskListInput, type TaskListRow } from './tool-call-utilities.js'

const MARK: Record<TaskListRow['status'], 'done' | 'active' | 'todo'> = {
  completed: 'done',
  in_progress: 'active',
  pending: 'todo',
}

/** The mark for a step still in progress: a spinner only while a turn is actually running. */
function inProgressMark(live: boolean, awaitingUser: boolean): 'active' | 'waiting' | 'stopped' {
  return live ? 'active' : awaitingUser ? 'waiting' : 'stopped'
}

/**
 * The working plan, one of the strips above the composer. It is not part of the
 * transcript: every `update_task_list` call re-draws this one strip instead of
 * adding a new card to the chat.
 * @param props - Component props.
 * @param props.todos - The latest task list.
 * @returns The plan strip, or nothing when the list is empty.
 */
export function PlanCard({
  todos,
  live = true,
  awaitingUser = false,
}: {
  todos: ReadonlyArray<TaskListRow>
  /** Whether a turn is running. A step still "in progress" with no turn running is not progressing. */
  live?: boolean
  /** Whether the turn is paused on a question to the person. */
  awaitingUser?: boolean
}): JSX.Element | null {
  const cm = getClassMap()
  const [expanded, setExpanded] = useState(true)
  if (todos.length === 0) return null

  const completed = todos.filter((todo) => todo.status === 'completed').length
  const current = todos.find((todo) => todo.status === 'in_progress')
  const stuckMark = inProgressMark(live, awaitingUser)
  const stuckNote = live
    ? undefined
    : awaitingUser
      ? t('ide.work.waiting', undefined, { defaultValue: 'Waiting for your answer' })
      : t('ide.work.stopped', undefined, { defaultValue: 'Stopped before finishing' })

  return (
    <DockStrip
      molId="task-list-card"
      toggleMolId="task-list-toggle"
      expanded={expanded}
      onToggle={() => setExpanded((open) => !open)}
      label={t('ide.chat.taskListTitle', undefined, { defaultValue: 'Working plan' })}
      hint={!expanded && current ? `· ${current.content}` : undefined}
      chipLabel={t(
        'ide.work.plan',
        { done: completed, total: todos.length },
        { defaultValue: 'Plan {{done}}/{{total}}' },
      )}
      chipTitle={current ? [current.content, stuckNote].filter(Boolean).join(' — ') : undefined}
      icon={
        <StatusMark
          state={current ? stuckMark : completed === todos.length ? 'done' : 'todo'}
          size={14}
        />
      }
    >
      <div style={{ maxHeight: '168px', overflowY: 'auto' }}>
        {todos.map((todo, i) => (
          <div
            key={i}
            data-mol-id="task-list-row"
            className={cm.textSize('xs')}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '3px 0',
              ...(todo.status === 'completed' ? { opacity: 0.55 } : {}),
            }}
          >
            <span style={{ flexShrink: 0, display: 'inline-flex', paddingTop: 1 }}>
              <StatusMark state={todo.status === 'in_progress' ? stuckMark : MARK[todo.status]} />
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                ...(todo.status === 'completed' ? { textDecoration: 'line-through' } : {}),
              }}
            >
              {todo.content}
              {todo.status === 'in_progress' && stuckNote ? (
                <span className={cm.textMuted}>{` — ${stuckNote}`}</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </DockStrip>
  )
}

/**
 * The latest plan in a transcript: the most recent `update_task_list` call's
 * task list, which replaces the earlier ones.
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
