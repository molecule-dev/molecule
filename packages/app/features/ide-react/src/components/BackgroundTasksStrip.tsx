import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-react'
import { type JSX, useEffect, useState } from 'react'

/**
 * The commands running in the sandbox that outlived the tool call that started
 * them.
 *
 * `exec_command` with `run_in_background` returns a handle immediately, so the
 * tool call's own card goes green while the command is still running — a test
 * suite can be four minutes from its verdict with nothing on screen saying so.
 * This strip is the one place that state is visible: what is running, how long
 * it has been running, and how each one ended.
 */
export function BackgroundTasksStrip({
  tasks,
}: {
  /** Every background command of the current turn, newest last. */
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

  return (
    <div
      data-mol-id="chat-background-tasks"
      className={cm.cn(cm.shrink0, cm.borderT)}
      style={{ padding: '6px 12px', fontSize: 12 }}
    >
      <button
        type="button"
        data-mol-id="chat-background-tasks-toggle"
        onClick={() => setExpanded((open) => !open)}
        className={cm.cn(cm.button({ color: 'secondary', size: 'sm' }), cm.touchTargetCompact)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
      >
        <Icon
          name={running.length > 0 ? 'sync' : failed.length > 0 ? 'x-circle' : 'check-circle'}
          size={14}
          className={
            running.length > 0 ? cm.textMuted : failed.length > 0 ? cm.textError : cm.textSuccess
          }
        />
        <span className={cm.textMuted}>{summary}</span>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          className={cm.textMuted}
          style={{ marginLeft: 'auto' }}
        />
      </button>

      {expanded && (
        <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
          {tasks.map((task) => (
            <li
              key={task.id}
              data-mol-id="chat-background-task"
              style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '2px 0' }}
            >
              <Icon
                name={task.kind === 'agent' ? 'search' : 'chevron-right'}
                size={11}
                className={cm.textMuted}
              />
              <code
                className={cm.textMuted}
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={task.command}
              >
                {task.command}
              </code>
              <span className={cm.textMuted}>{describe(task)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
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
