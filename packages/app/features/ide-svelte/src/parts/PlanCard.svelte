<!--
  The working plan, one of the strips above the composer. It is not part of
  the transcript: every `update_task_list` call re-draws this one strip
  instead of adding a new card to the chat.

  Svelte counterpart of `@molecule/app-ide-react`'s `PlanCard` (see that file
  for the design notes): the same props (React names), the same DOM for the
  same input. The rows render over the shared `DockStrip` chrome with the
  shared `StatusMark` icon — a check circle when done, the platform's
  molecule spinner while the turn is running and the step is in progress, a
  still ring that says why the work stopped when it is not (a question mark
  while the person has to answer, a dash when it simply stopped), an empty
  ring while still to do. Done rows dim and strike through. The strip's
  detail collapses through its own disclosure toggle; while collapsed and a
  step is in flight the header hints the step's content. The `each` block is
  unkeyed (React keys its rows by index), so a new list re-binds the same
  nodes instead of re-creating them. The component is a part (React renders
  it inside ChatPanel without exporting it), so it lives in `src/parts/`.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout
  the ClassMap can't express.
-->
<script module lang="ts">
  import type { TaskListRow } from '@molecule/app-ide-panel-logic/panels'

  import type { StatusMarkState } from './StatusMark.svelte'

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

  /** Props for `PlanCard` — the React prop names, React's own contract. */
  export interface PlanCardProps {
    /** The latest task list. */
    todos: ReadonlyArray<TaskListRow>
    /** Whether a turn is running. A step still "in progress" with no turn running is not progressing. */
    live?: boolean
    /** Whether the turn is paused on a question to the person. */
    awaitingUser?: boolean
  }

  /** The status icon each row's status draws: done, active, or the empty ring. */
  const MARK: Record<TaskListRow['status'], StatusMarkState> = {
    completed: 'done',
    in_progress: 'active',
    pending: 'todo',
  }
</script>

<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import DockStrip from './DockStrip.svelte'
  import StatusMark from './StatusMark.svelte'

  let { todos, live = true, awaitingUser = false }: PlanCardProps = $props()

  let expanded = $state(true)

  const cm = getClassMap()
  const { t } = useTranslation()

  const completed = $derived(todos.filter((todo) => todo.status === 'completed').length)
  const current = $derived(todos.find((todo) => todo.status === 'in_progress'))
  const stuckMark = $derived(inProgressMark(live, awaitingUser))
  const stuckNote = $derived(
    live
      ? undefined
      : awaitingUser
        ? t('ide.work.waiting', undefined, { defaultValue: 'Waiting for your answer' })
        : t('ide.work.stopped', undefined, { defaultValue: 'Stopped before finishing' }),
  )
  const headerMark = $derived(
    current ? stuckMark : completed === todos.length ? ('done' as const) : ('todo' as const),
  )
  const label = $derived(t('ide.chat.taskListTitle', undefined, { defaultValue: 'Working plan' }))
  const chipLabel = $derived(
    t(
      'ide.work.plan',
      { done: completed, total: todos.length },
      { defaultValue: 'Plan {{done}}/{{total}}' },
    ),
  )
  const chipTitle = $derived(
    current ? [current.content, stuckNote].filter(Boolean).join(' — ') : undefined,
  )
</script>

{#if todos.length > 0}
  <DockStrip
    molId="task-list-card"
    toggleMolId="task-list-toggle"
    {expanded}
    onToggle={() => (expanded = !expanded)}
    {label}
    hint={!expanded && current ? `· ${current.content}` : undefined}
    {chipLabel}
    {chipTitle}
  >
    {#snippet icon()}
      <StatusMark state={headerMark} size={14} />
    {/snippet}
    <div style="max-height: 168px; overflow-y: auto">
      {#each todos as todo, i (i)}
        <div
          data-mol-id="task-list-row"
          class={cm.textSize('xs')}
          style={`display: flex; align-items: flex-start; gap: 8px; padding: 3px 0;${todo.status === 'completed' ? ' opacity: 0.55;' : ''}`}
        >
          <span style="flex-shrink: 0; display: inline-flex; padding-top: 1px">
            <StatusMark state={todo.status === 'in_progress' ? stuckMark : MARK[todo.status]} />
          </span>
          <span
            style={`flex: 1; min-width: 0px;${todo.status === 'completed' ? ' text-decoration: line-through;' : ''}`}
          >
            {todo.content}{#if todo.status === 'in_progress' && stuckNote}<span class={cm.textMuted}
                >{` — ${stuckNote}`}</span
              >{/if}
          </span>
        </div>
      {/each}
    </div>
  </DockStrip>
{/if}
