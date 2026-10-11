import { type JSX, useEffect, useState } from 'react'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import { DockStrip, StatusMark } from './DockStrip.js'

/**
 * The commands running in the sandbox that outlived the tool call that started
 * them.
 *
 * `exec_command` with `run_in_background` returns a handle immediately, so the
 * tool call's own card goes green while the command is still running — a test
 * suite can be four minutes from its verdict with nothing on screen saying so.
 * This strip is the one place that state is visible: what each one is for, how
 * long it has been running, and how it ended.
 *
 * @param props - Component props.
 * @param props.tasks - Every background command of the current turn, newest last.
 * @returns The strip, or nothing when no task was started.
 */
export function BackgroundTasksStrip({
  tasks,
}: {
  tasks: BackgroundTaskState[]
}): JSX.Element | null {
  const cm = getClassMap()
  const [expanded, setExpanded] = useState(false)
  // Re-render once a second so the elapsed time on a running command counts up.
  const [, tick] = useState(0)
  const running = tasks.filter((task) => task.status === 'running')
  useEffect(() => {
    if (running.length === 0) return
    const timer = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [running.length])

  if (tasks.length === 0) return null

  const failed = tasks.filter((task) => task.status === 'failed')
  const summary =
    running.length > 0
      ? t(
          'ide.chat.backgroundRunning',
          { count: running.length },
          { defaultValue: '{{count}} task running in the background' },
        )
      : failed.length > 0
        ? t(
            'ide.chat.backgroundFailed',
            { count: failed.length },
            { defaultValue: '{{count}} background task failed' },
          )
        : t(
            'ide.chat.backgroundDone',
            { count: tasks.length },
            { defaultValue: '{{count}} background task finished' },
          )

  // Collapsed, name what the strip is about: the purpose of the task in flight.
  const lead = running[0] ?? failed[0]

  return (
    <DockStrip
      molId="chat-background-tasks"
      toggleMolId="chat-background-tasks-toggle"
      expanded={expanded}
      onToggle={() => setExpanded((open) => !open)}
      icon={
        <StatusMark
          state={running.length > 0 ? 'active' : failed.length > 0 ? 'failed' : 'done'}
          size={14}
        />
      }
      label={summary}
      hint={!expanded && lead ? `· ${purpose(lead)}` : undefined}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            data-mol-id="chat-background-task"
            className={cm.textSize('xs')}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 0' }}
          >
            <span style={{ flexShrink: 0, display: 'inline-flex', paddingTop: 1 }}>
              <StatusMark
                state={
                  task.status === 'running'
                    ? 'active'
                    : task.status === 'failed'
                      ? 'failed'
                      : 'done'
                }
                size={14}
              />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>{purpose(task)}</div>
              {task.description ? (
                <code
                  className={cm.textMuted}
                  style={{ display: 'block', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {task.command}
                </code>
              ) : null}
            </div>
            <span className={cm.textMuted} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              {describe(task)}
            </span>
          </li>
        ))}
      </ul>
    </DockStrip>
  )
}

/** What a task is for: the executor's own reason, else the command itself. */
function purpose(task: BackgroundTaskState): string {
  return task.description ?? task.command
}

/** The right-hand status for one command: how long it ran, and how it ended. */
function describe(task: BackgroundTaskState): string {
  const seconds = Math.max(0, Math.round(((task.finishedAt ?? Date.now()) - task.startedAt) / 1000))
  const elapsed = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  if (task.status === 'running') {
    return t('ide.chat.backgroundElapsed', { elapsed }, { defaultValue: 'running · {{elapsed}}' })
  }
  if (task.status === 'failed') {
    return t(
      'ide.chat.backgroundExit',
      { code: task.exitCode ?? 1, elapsed },
      { defaultValue: 'exit {{code}} · {{elapsed}}' },
    )
  }
  return t('ide.chat.backgroundOk', { elapsed }, { defaultValue: 'done · {{elapsed}}' })
}
