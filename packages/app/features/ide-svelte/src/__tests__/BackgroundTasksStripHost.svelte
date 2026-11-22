<!--
  Test host for BackgroundTasksStrip: sets the theme provider in Svelte
  context during component initialisation (the only place Svelte context is
  legal), holds the strip's `tasks` in its own state — `setTasks` (exported,
  so the mount instance exposes it) re-renders the strip in place the way
  React's `rerender` does, keeping the strip's internal state — and renders
  the strip with them.
-->
<script lang="ts">
  import type { BackgroundTaskState } from '@molecule/app-ai-chat'
  import type { ThemeProvider } from '@molecule/app-svelte'
  import { setThemeContext } from '@molecule/app-svelte'

  import BackgroundTasksStrip from '../parts/BackgroundTasksStrip.svelte'

  let {
    theme,
    tasks: initialTasks,
  }: {
    theme: ThemeProvider
    tasks: BackgroundTaskState[]
  } = $props()

  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
  // svelte-ignore state_referenced_locally
  let tasks = $state(initialTasks)

  /**
   * Re-renders the strip with a new `tasks` prop, in place.
   *
   * @param next - The next `tasks` prop.
   */
  export function setTasks(next: BackgroundTaskState[]): void {
    tasks = next
  }
</script>

<BackgroundTasksStrip {tasks} />
