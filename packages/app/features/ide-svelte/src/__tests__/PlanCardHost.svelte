<!--
  Test host for PlanCard: sets the theme provider in Svelte context during
  component initialisation (the only place Svelte context is legal) and
  renders the plan in the work tray with the props it was given. The React
  reference wraps its card in a ThemeProvider the same way. `withOther` mounts
  the second section the React test's BackgroundTasksStrip provides (the
  strip's port has not landed here yet), so the tray has another section to
  open.
-->
<script lang="ts">
  import type { TaskListRow } from '@molecule/app-ide-panel-logic/panels'
  import { setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import DockStrip from '../parts/DockStrip.svelte'
  import PlanCard from '../parts/PlanCard.svelte'
  import WorkCard from '../parts/WorkCard.svelte'

  let {
    theme,
    todos,
    live = true,
    awaitingUser = false,
    withOther = false,
  }: {
    theme: ThemeProvider
    todos: ReadonlyArray<TaskListRow>
    live?: boolean
    awaitingUser?: boolean
    withOther?: boolean
  } = $props()

  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
</script>

<WorkCard>
  <PlanCard {todos} {live} {awaitingUser} />
  {#if withOther}
    <DockStrip
      molId="chat-background-tasks"
      toggleMolId="chat-background-tasks-toggle"
      expanded={false}
      label="1 running"
      onToggle={() => {}}
    >
      <div>npm test</div>
    </DockStrip>
  {/if}
</WorkCard>
