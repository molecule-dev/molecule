<!--
  Test host for ToolCallCard: sets the theme provider — and, when the test
  supplies one, the background-task map — in Svelte context during component
  initialisation (the only place Svelte context is legal), then renders the
  card with the props it was given. The React reference wraps its card in a
  ThemeProvider and a BackgroundTaskCommandsContext.Provider the same way; the
  i18n provider is process-global.
-->
<script lang="ts">
  import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
  import { setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import ToolCallCard from '../components/ToolCallCard.svelte'
  import { setBackgroundTaskCommands } from '../context/background-task-commands.js'

  let {
    theme,
    backgroundCommands,
    ...rest
  }: ToolCallCardProps & {
    theme: ThemeProvider
    backgroundCommands?: ReadonlyMap<string, string>
  } = $props()

  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
  // svelte-ignore state_referenced_locally
  setBackgroundTaskCommands(backgroundCommands ?? new Map<string, string>())
</script>

<ToolCallCard {...rest} />
