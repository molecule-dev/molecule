/**
 * The commands running in the sandbox that outlived the tool call that started
 * them — the strip above the composer naming each one, how long it has been
 * running, and how it ended.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `BackgroundTasksStrip` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, the same callbacks. While a command is running a
 * once-a-second tick re-renders the strip so its elapsed time counts up, and
 * the tick is torn down and re-armed whenever the running count changes, the
 * way React's effect re-subscribes. The component is a part (React renders it
 * inside ChatPanel without exporting it), so it lives in `src/parts/`.
 *
 * React keys each row by its task id, so a re-passed or re-ordered `tasks`
 * keeps each row's DOM node; the strip iterates the KEYS (`For` compares
 * strings by value, so an unchanged key keeps its node) and reads the latest
 * task for that key so the rendered content still updates reactively — the
 * same mechanism the sibling components keep as stable per-key records.
 *
 * @module
 */

import type { Accessor, JSX } from 'solid-js'
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { DockStrip, StatusMark, type StatusMarkState } from './DockStrip.jsx'

/** The translation function `useTranslation()` returns, as React's `t` stands in. */
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
 * A React-keyed view of the task list: the keys to iterate and the latest
 * task per key. Solid's `For` keys by object identity, so the strip iterates
 * the KEYS (`For` compares strings by value, so an unchanged key keeps its
 * DOM node and its state) while the lookup memo maps every key to its latest
 * task so the rendered content still updates reactively.
 *
 * @template T - The item type.
 * @template K - The key type.
 * @param items - The list, as a reactive accessor.
 * @param keyOf - The key React assigns each item (`key={…}`).
 * @returns The keys to iterate and the item lookup to read.
 */
function createKeyedList<T, K extends string>(
  items: Accessor<T[]>,
  keyOf: (item: T) => K,
): { keys: Accessor<K[]>; get: (key: K) => T | undefined } {
  const keys = createMemo(() => items().map((item) => keyOf(item)))
  const byKey = createMemo(() => {
    const latest = new Map<K, T>()
    items().forEach((item) => latest.set(keyOf(item), item))
    return latest
  })
  return { keys, get: (key) => byKey().get(key) }
}

/**
 * The strip listing the sandbox's detached commands, or nothing when no task
 * was started. React renders it under the React name `BackgroundTasksStrip`.
 *
 * @param props - See {@link BackgroundTasksStripProps}.
 * @returns The strip, or nothing when no task was started.
 */
export function BackgroundTasksStrip(props: BackgroundTasksStripProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [expanded, setExpanded] = createSignal(false)
  // Re-render once a second so the elapsed time on a running command counts
  // up; the strip's memos read the counter, so each tick redraws every
  // elapsed time the way React's re-render does.
  const [tick, setTick] = createSignal(0)
  // The list, read through the tick: every derived value below re-computes on
  // a tick the way React's whole render does.
  const tasks = createMemo(() => {
    void tick()
    return props.tasks
  })
  // React's effect tears down and re-arms the interval on every running-count
  // change, so a new command restarts the phase from that moment.
  createEffect(() => {
    const runningCount = tasks().filter((task) => task.status === 'running').length
    if (runningCount === 0) return
    const timer = setInterval(() => setTick((n) => n + 1), 1000)
    onCleanup(() => clearInterval(timer))
  })

  const running = createMemo(() => tasks().filter((task) => task.status === 'running'))
  const failed = createMemo(() => tasks().filter((task) => task.status === 'failed'))
  const cancelled = createMemo(() => tasks().filter((task) => task.status === 'cancelled'))
  const summary = createMemo(() =>
    running().length > 0
      ? t(
          'ide.chat.backgroundRunning',
          { count: running().length },
          { defaultValue: '{{count}} task running in the background' },
        )
      : failed().length > 0
        ? t(
            'ide.chat.backgroundFailed',
            { count: failed().length },
            { defaultValue: '{{count}} background task failed' },
          )
        : cancelled().length === tasks().length
          ? t(
              'ide.chat.backgroundCancelled',
              { count: cancelled().length },
              {
                defaultValue: '{{count}} background task cancelled',
              },
            )
          : t(
              'ide.chat.backgroundDone',
              { count: tasks().length },
              { defaultValue: '{{count}} background task finished' },
            ),
  )
  // Collapsed, name what the strip is about: the purpose of the task in flight.
  const lead = createMemo(() => running()[0] ?? failed()[0] ?? cancelled()[0])
  const chip = createMemo(() =>
    running().length > 0
      ? t('ide.work.running', { count: running().length }, { defaultValue: '{{count}} running' })
      : failed().length > 0
        ? t('ide.work.failed', { count: failed().length }, { defaultValue: '{{count}} failed' })
        : cancelled().length === tasks().length
          ? t(
              'ide.work.cancelled',
              { count: cancelled().length },
              { defaultValue: '{{count}} cancelled' },
            )
          : t(
              'ide.work.finishedCount',
              { count: tasks().length },
              { defaultValue: '{{count}} finished' },
            ),
  )
  const headerState = createMemo<StatusMarkState>(() =>
    running().length > 0
      ? 'active'
      : failed().length > 0
        ? 'failed'
        : cancelled().length === tasks().length
          ? 'stopped'
          : 'done',
  )
  const chipTitle = createMemo(() => {
    const first = lead()
    return first ? purpose(first) : undefined
  })
  const hint = createMemo(() => {
    const first = lead()
    if (expanded() || !first) return undefined
    const leadProgress = progress(t, first)
    return `· ${purpose(first)}${leadProgress ? ` · ${leadProgress}` : ''}`
  })

  // React keys each row by its task id, so the strip iterates the keys and
  // reads the latest task through the lookup.
  const rows = createKeyedList(tasks, (task) => task.id)

  return (
    <Show when={tasks().length > 0}>
      <DockStrip
        molId="chat-background-tasks"
        toggleMolId="chat-background-tasks-toggle"
        expanded={expanded()}
        onToggle={() => setExpanded((open) => !open)}
        icon={<StatusMark state={headerState()} size={14} />}
        label={summary()}
        chipLabel={chip()}
        chipTitle={chipTitle()}
        hint={hint()}
      >
        <ul style={{ 'list-style': 'none', margin: '0px', padding: '0px' }}>
          <For each={rows.keys()}>
            {(key) => {
              const taskFor = (): BackgroundTaskState => rows.get(key)!
              const markState = (): StatusMarkState =>
                taskFor().status === 'running'
                  ? 'active'
                  : taskFor().status === 'failed'
                    ? 'failed'
                    : taskFor().status === 'cancelled'
                      ? 'stopped'
                      : 'done'
              const taskProgress = (): string | null => progress(t, taskFor())
              return (
                <li
                  data-mol-id="chat-background-task"
                  class={cm.textSize('xs')}
                  style={{
                    display: 'flex',
                    'align-items': 'flex-start',
                    gap: '8px',
                    padding: '3px 0px',
                  }}
                >
                  <span
                    style={{
                      'flex-shrink': '0',
                      display: 'inline-flex',
                      'padding-top': '1px',
                    }}
                  >
                    <StatusMark state={markState()} size={14} />
                  </span>
                  <div style={{ flex: '1 1 0%', 'min-width': '0px' }}>
                    <div>{purpose(taskFor())}</div>
                    {taskProgress() ? <div class={cm.textMuted}>{taskProgress()}</div> : null}
                    {taskFor().description ? (
                      <code
                        class={cm.textMuted}
                        style={{
                          display: 'block',
                          'white-space': 'pre-wrap',
                          'overflow-wrap': 'anywhere',
                        }}
                      >
                        {taskFor().command}
                      </code>
                    ) : null}
                  </div>
                  <span
                    class={cm.textMuted}
                    style={{ 'flex-shrink': '0', 'white-space': 'nowrap' }}
                  >
                    {describe(t, taskFor())}
                  </span>
                </li>
              )
            }}
          </For>
        </ul>
      </DockStrip>
    </Show>
  )
}
