/**
 * The commands running in the sandbox that outlived the tool call that started
 * them — the strip above the composer naming each one, how long it has been
 * running, and how it ended.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `BackgroundTasksStrip` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, the same callbacks. While a command is running a
 * once-a-second tick re-renders the strip so its elapsed time counts up, and
 * the tick is torn down and re-armed whenever the running count changes, the
 * way React's effect re-subscribes. The component is a part (React renders it
 * inside ChatPanel without exporting it), so it lives in `src/parts/`.
 *
 * @module
 */

import {
  computed,
  createTextVNode,
  defineComponent,
  h,
  onUnmounted,
  type PropType,
  ref,
  type VNodeChild,
  watch,
} from 'vue'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { DockStrip, StatusMark, type StatusMarkState } from './DockStrip.js'

/** The translation function `useTranslation()` returns, as React's `t` type stands in. */
type Translate = ReturnType<typeof useTranslation>['t']

/**
 * What a task is for: the executor's own reason, else the command itself.
 *
 * @param task - The background task.
 * @returns The purpose text.
 */
function purpose(task: BackgroundTaskState): string {
  return task.description ?? task.command
}

/**
 * The right-hand status for one command: how long it ran, and how it ended.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param task - The background task to describe.
 * @returns The status text.
 */
function describe(t: Translate, task: BackgroundTaskState): string {
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
  if (task.status === 'cancelled') {
    return t(
      'ide.chat.backgroundCancelledElapsed',
      { elapsed },
      { defaultValue: 'cancelled · {{elapsed}}' },
    )
  }
  return t('ide.chat.backgroundOk', { elapsed }, { defaultValue: 'done · {{elapsed}}' })
}

/**
 * A worker's observed output is useful progress without inventing a total or
 * percentage.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param task - The background task whose output is measured.
 * @returns The progress text, or null when no output has been observed.
 */
function progress(t: Translate, task: BackgroundTaskState): string | null {
  if (task.outputChars == null) return null
  return t(
    'ide.chat.backgroundOutput',
    { count: task.outputChars.toLocaleString() },
    {
      defaultValue: '{{count}} characters produced',
    },
  )
}

/** Props for {@link BackgroundTasksStrip} — the React prop names, React's own contract. */
export interface BackgroundTasksStripProps {
  /** Every background command of the current turn, newest last. */
  tasks: BackgroundTaskState[]
}

/**
 * The strip listing the sandbox's detached commands, or nothing when no task
 * was started. React renders it under the React name `BackgroundTasksStrip`.
 *
 * @param props - See {@link BackgroundTasksStripProps}.
 * @returns The strip, or nothing when no task was started.
 */
export const BackgroundTasksStrip = defineComponent({
  name: 'BackgroundTasksStrip',
  inheritAttrs: false,
  props: {
    /** Every background command of the current turn, newest last. */
    tasks: {
      type: Array as PropType<BackgroundTaskState[]>,
      required: true,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const expanded = ref(false)
    // Re-render once a second so the elapsed time on a running command counts
    // up; the render reads the counter, so each tick redraws every elapsed
    // time the way React's re-render does.
    const tick = ref(0)
    const runningCount = computed(
      () => props.tasks.filter((task) => task.status === 'running').length,
    )
    let timer: ReturnType<typeof setInterval> | undefined
    /** Tears the one-second tick down. */
    const stopTicking = (): void => {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    }
    watch(
      runningCount,
      (count) => {
        // React's effect tears down and re-arms on every running-count change,
        // so a new command restarts the phase from that moment.
        stopTicking()
        if (count === 0) return
        timer = setInterval(() => {
          tick.value++
        }, 1000)
      },
      { immediate: true },
    )
    onUnmounted(stopTicking)

    return (): VNodeChild => {
      const tasks = props.tasks
      void tick.value
      if (tasks.length === 0) return null
      const running = tasks.filter((task) => task.status === 'running')
      const failed = tasks.filter((task) => task.status === 'failed')
      const cancelled = tasks.filter((task) => task.status === 'cancelled')
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
            : cancelled.length === tasks.length
              ? t(
                  'ide.chat.backgroundCancelled',
                  { count: cancelled.length },
                  {
                    defaultValue: '{{count}} background task cancelled',
                  },
                )
              : t(
                  'ide.chat.backgroundDone',
                  { count: tasks.length },
                  { defaultValue: '{{count}} background task finished' },
                )
      // Collapsed, name what the strip is about: the purpose of the task in
      // flight.
      const lead = running[0] ?? failed[0] ?? cancelled[0]
      const leadProgress = lead ? progress(t, lead) : null
      const chip =
        running.length > 0
          ? t('ide.work.running', { count: running.length }, { defaultValue: '{{count}} running' })
          : failed.length > 0
            ? t('ide.work.failed', { count: failed.length }, { defaultValue: '{{count}} failed' })
            : cancelled.length === tasks.length
              ? t(
                  'ide.work.cancelled',
                  { count: cancelled.length },
                  { defaultValue: '{{count}} cancelled' },
                )
              : t(
                  'ide.work.finishedCount',
                  { count: tasks.length },
                  { defaultValue: '{{count}} finished' },
                )
      const headerState: StatusMarkState =
        running.length > 0
          ? 'active'
          : failed.length > 0
            ? 'failed'
            : cancelled.length === tasks.length
              ? 'stopped'
              : 'done'

      return h(
        DockStrip,
        {
          molId: 'chat-background-tasks',
          toggleMolId: 'chat-background-tasks-toggle',
          expanded: expanded.value,
          onToggle: () => {
            expanded.value = !expanded.value
          },
          icon: h(StatusMark, {
            state: headerState,
            size: 14,
          }),
          label: summary,
          chipLabel: createTextVNode(chip),
          chipTitle: lead ? purpose(lead) : undefined,
          hint:
            !expanded.value && lead
              ? createTextVNode(`· ${purpose(lead)}${leadProgress ? ` · ${leadProgress}` : ''}`)
              : undefined,
        },
        {
          default: () => [
            h(
              'ul',
              { style: { listStyle: 'none', margin: '0px', padding: '0px' } },
              tasks.map((task) => {
                const taskProgress = progress(t, task)
                return h(
                  'li',
                  {
                    key: task.id,
                    'data-mol-id': 'chat-background-task',
                    class: cm.textSize('xs'),
                    style: {
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '3px 0px',
                    },
                  },
                  [
                    h(
                      'span',
                      {
                        style: {
                          flexShrink: '0',
                          display: 'inline-flex',
                          paddingTop: '1px',
                        },
                      },
                      [
                        h(StatusMark, {
                          state:
                            task.status === 'running'
                              ? 'active'
                              : task.status === 'failed'
                                ? 'failed'
                                : task.status === 'cancelled'
                                  ? 'stopped'
                                  : 'done',
                          size: 14,
                        }),
                      ],
                    ),
                    h('div', { style: { flex: '1 1 0%', minWidth: '0px' } }, [
                      h('div', [purpose(task)]),
                      taskProgress ? h('div', { class: cm.textMuted }, [taskProgress]) : null,
                      task.description
                        ? h(
                            'code',
                            {
                              class: cm.textMuted,
                              style: {
                                display: 'block',
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'anywhere',
                              },
                            },
                            [task.command],
                          )
                        : null,
                    ]),
                    h(
                      'span',
                      {
                        class: cm.textMuted,
                        style: { flexShrink: '0', whiteSpace: 'nowrap' },
                      },
                      [describe(t, task)],
                    ),
                  ],
                )
              }),
            ),
          ],
        },
      )
    }
  },
})
