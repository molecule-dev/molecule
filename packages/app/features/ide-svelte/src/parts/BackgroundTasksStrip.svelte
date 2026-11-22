<!--
  The commands running in the sandbox that outlived the tool call that started
  them — the strip above the composer naming each one, how long it has been
  running, and how it ended.

  Svelte counterpart of `@molecule/app-ide-react`'s `BackgroundTasksStrip` (see
  that file for the design notes): the same props (React names), the same DOM
  for the same input, the same callbacks. While a command is running a
  once-a-second tick re-renders the strip so its elapsed time counts up, and
  the tick is torn down and re-armed whenever the running count changes, the
  way React's effect re-subscribes. The component is a part (React renders it
  inside ChatPanel without exporting it), so it lives in `src/parts/`. React
  keys each row by its task id, so the `{#each}` is keyed by id — a re-passed
  or re-ordered list keeps each row the way React's `key` does.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express.
-->
<script module lang="ts">
  import type { BackgroundTaskState } from '@molecule/app-ai-chat'
  import type { InterpolationValues, TranslateOptions } from '@molecule/app-i18n'

  /** The translation function `useTranslation()` returns, as React's `t` stands in. */
  type Translate = (key: string, values?: InterpolationValues, options?: TranslateOptions) => string

  /** Props for `BackgroundTasksStrip` — the React prop names, React's own contract. */
  export interface BackgroundTasksStripProps {
    /** Every background command of the current turn, newest last. */
    tasks: BackgroundTaskState[]
  }

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
    const seconds = Math.max(
      0,
      Math.round(((task.finishedAt ?? Date.now()) - task.startedAt) / 1000),
    )
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
</script>

<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import DockStrip from './DockStrip.svelte'
  import StatusMark from './StatusMark.svelte'

  let { tasks }: BackgroundTasksStripProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())

  let expanded = $state(false)
  // Re-render once a second so the elapsed time on a running command counts
  // up; the rows read the counter, so each tick redraws every elapsed time
  // the way React's re-render does.
  let tick = $state(0)

  const running = $derived(tasks.filter((task) => task.status === 'running'))
  const failed = $derived(tasks.filter((task) => task.status === 'failed'))
  const cancelled = $derived(tasks.filter((task) => task.status === 'cancelled'))
  // The list, read through the tick: the rows below re-compute on a tick the
  // way React's whole render does.
  const tickedList = $derived.by(() => {
    void tick
    return tasks
  })
  const summary = $derived(
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
            ),
  )
  // Collapsed, name what the strip is about: the purpose of the task in flight.
  const lead = $derived(running[0] ?? failed[0] ?? cancelled[0])
  const chip = $derived(
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
            ),
  )
  const headerState = $derived(
    running.length > 0
      ? 'active'
      : failed.length > 0
        ? 'failed'
        : cancelled.length === tasks.length
          ? 'stopped'
          : 'done',
  )
  const chipTitle = $derived(lead ? purpose(lead) : undefined)
  const hint = $derived.by(() => {
    if (expanded || !lead) return undefined
    const leadProgress = progress(t, lead)
    return `· ${purpose(lead)}${leadProgress ? ` · ${leadProgress}` : ''}`
  })

  // React's effect tears down and re-arms the interval on every running-count
  // change, so a new command restarts the phase from that moment.
  $effect(() => {
    const runningCount = tasks.filter((task) => task.status === 'running').length
    if (runningCount === 0) return
    const timer = setInterval(() => {
      tick++
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  })
</script>

{#if tasks.length > 0}
  {#snippet headerIcon()}
    <StatusMark state={headerState} size={14} />
  {/snippet}
  <DockStrip
    molId="chat-background-tasks"
    toggleMolId="chat-background-tasks-toggle"
    {expanded}
    onToggle={() => (expanded = !expanded)}
    icon={headerIcon}
    label={summary}
    chipLabel={chip}
    {chipTitle}
    {hint}
  >
    <ul style="list-style: none; margin: 0px; padding: 0px">
      {#each tickedList as task (task.id)}
        <li
          data-mol-id="chat-background-task"
          class={cm.textSize('xs')}
          style="display: flex; align-items: flex-start; gap: 8px; padding: 3px 0px"
        >
          <span style="flex-shrink: 0; display: inline-flex; padding-top: 1px">
            <StatusMark
              state={task.status === 'running'
                ? 'active'
                : task.status === 'failed'
                  ? 'failed'
                  : task.status === 'cancelled'
                    ? 'stopped'
                    : 'done'}
              size={14}
            />
          </span>
          <div style="flex: 1 1 0%; min-width: 0px">
            <div>{purpose(task)}</div>
            {#if progress(t, task)}
              <div class={cm.textMuted}>{progress(t, task)}</div>
            {/if}
            {#if task.description}
              <code
                class={cm.textMuted}
                style="display: block; white-space: pre-wrap; overflow-wrap: anywhere"
              >
                {task.command}
              </code>
            {/if}
          </div>
          <span class={cm.textMuted} style="flex-shrink: 0; white-space: nowrap">
            {describe(t, task)}
          </span>
        </li>
      {/each}
    </ul>
  </DockStrip>
{/if}
