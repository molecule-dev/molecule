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

/**
 * The working plan, one of the strips above the composer. It is not part of the
 * transcript: every `update_task_list` call re-draws this one strip instead of
 * adding a new card to the chat.
 * @param props - Component props.
 * @param props.todos - The latest task list.
 * @returns The plan strip, or nothing when the list is empty.
 */
export function PlanCard({ todos }: { todos: ReadonlyArray<TaskListRow> }): JSX.Element | null {
  const cm = getClassMap()
  const [expanded, setExpanded] = useState(true)
  if (todos.length === 0) return null

  const completed = todos.filter((todo) => todo.status === 'completed').length
  const current = todos.find((todo) => todo.status === 'in_progress')

  return (
    <DockStrip
      molId="task-list-card"
      toggleMolId="task-list-toggle"
      expanded={expanded}
      onToggle={() => setExpanded((open) => !open)}
      label={t('ide.chat.taskListTitle', undefined, { defaultValue: 'Working plan' })}
      hint={!expanded && current ? `· ${current.content}` : undefined}
      actions={
        <span className={cm.cn(cm.textMuted, cm.textSize('xs'))} style={{ whiteSpace: 'nowrap' }}>
          {t(
            'ide.chat.taskListProgress',
            { done: completed, total: todos.length },
            { defaultValue: '{{done}} of {{total}} done' },
          )}
        </span>
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
              <StatusMark state={MARK[todo.status]} />
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                ...(todo.status === 'completed' ? { textDecoration: 'line-through' } : {}),
              }}
            >
              {todo.content}
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
