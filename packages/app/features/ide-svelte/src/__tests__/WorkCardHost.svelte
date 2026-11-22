<!--
  Test host for WorkCard: sets the theme provider in Svelte context during
  component initialisation (the only place Svelte context is legal), then
  renders the work tray with one strip, or the strip alone (with the action
  button React's first case passes, when asked), or the tray holding the plan
  and the background tasks React's third case holds.
-->
<script lang="ts">
  import type { BackgroundTaskState } from '@molecule/app-ai-chat'
  import type { TestItem, TestsRunState } from '@molecule/app-ide-panel-logic'
  import { EMPTY_RUN_STATE } from '@molecule/app-ide-panel-logic'
  import type { TaskListRow } from '@molecule/app-ide-panel-logic/panels'
  import { setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import BackgroundTasksStrip from '../parts/BackgroundTasksStrip.svelte'
  import DockStrip from '../parts/DockStrip.svelte'
  import PlanCard from '../parts/PlanCard.svelte'
  import TestStatusBar from '../parts/TestStatusBar.svelte'
  import WorkCard from '../parts/WorkCard.svelte'

  let {
    theme,
    mode = 'strip',
    withAction = false,
    onToggle = () => {},
    todos = [],
    tasks = [],
    run = EMPTY_RUN_STATE,
    tests = [],
    onOpen = () => {},
    onStop = () => {},
  }: {
    theme: ThemeProvider
    /** What to render: the strip alone, the tray around it, or the full frame. */
    mode?: 'strip' | 'tray' | 'action' | 'frame' | 'bar'
    /** Give the standalone strip the action button React's first case passes. */
    withAction?: boolean
    /** The strip's recorded toggle. */
    onToggle?: () => void
    /** The plan rows for the frame. */
    todos?: ReadonlyArray<TaskListRow>
    /** The background tasks for the frame. */
    tasks?: BackgroundTaskState[]
    /** The tests bar's run state (mode 'bar'). */
    run?: TestsRunState
    /** The tests bar's discovered tests (mode 'bar'). */
    tests?: TestItem[]
    /** The tests bar's open callback (mode 'bar'). */
    onOpen?: () => void
    /** The tests bar's stop callback (mode 'bar'). */
    onStop?: () => void
  } = $props()

  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
</script>

{#snippet commitAction()}
  <button type="button">Commit 2 files</button>
{/snippet}

{#if mode === 'frame'}
  <WorkCard>
    <PlanCard {todos} />
    <BackgroundTasksStrip {tasks} />
  </WorkCard>
{:else if mode === 'bar'}
  <WorkCard>
    <TestStatusBar {run} {tests} {onOpen} {onStop} />
  </WorkCard>
{:else if mode === 'tray'}
  <WorkCard>
    <DockStrip molId="info" toggleMolId="info-toggle" expanded={false} label="Info" {onToggle} />
  </WorkCard>
{:else}
  <DockStrip
    molId={mode === 'action' ? 'files' : 'info'}
    toggleMolId={mode === 'action' ? 'files-toggle' : 'info-toggle'}
    expanded={false}
    label={mode === 'action' ? 'Files' : 'Info'}
    hideLabel={mode === 'action'}
    {onToggle}
    actions={withAction ? commitAction : undefined}
  />
{/if}
