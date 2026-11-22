<!--
  Test host for KeyboardShortcutsPanel: sets the theme provider in Svelte
  context during component initialisation (the only place Svelte context is
  legal), holds the panel's `shortcuts` in its own state — `setShortcuts`
  (exported, so the mount instance exposes it) re-renders the panel in place
  the way React's `rerender` does — and renders it with them.
-->
<script lang="ts">
  import type { ShortcutEntry } from '@molecule/app-ide-panel-logic'
  import { setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import KeyboardShortcutsPanel from '../components/KeyboardShortcutsPanel.svelte'

  let {
    theme,
    shortcuts: initialShortcuts,
    onDismiss,
  }: {
    theme: ThemeProvider
    shortcuts: ShortcutEntry[]
    onDismiss: () => void
  } = $props()

  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
  // svelte-ignore state_referenced_locally
  let shortcuts = $state(initialShortcuts)

  /**
   * Re-renders the panel with a new `shortcuts` prop, in place.
   *
   * @param next - The next `shortcuts` prop.
   */
  export function setShortcuts(next: ShortcutEntry[]): void {
    shortcuts = next
  }
</script>

<KeyboardShortcutsPanel {shortcuts} {onDismiss} />
