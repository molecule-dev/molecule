<!--
  Test host for EditorPanel: sets the theme and editor providers in Svelte
  context during component initialisation (the only place Svelte context is
  legal) and holds `formattingFile` in its own state — `setFormattingFile`
  (exported, so the mount instance exposes it) re-renders the panel in place
  the way React's `rerender` does.
-->
<script lang="ts">
  import type { EditorProvider } from '@molecule/app-code-editor'
  import { setEditorContext, setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import EditorPanel from '../components/EditorPanel.svelte'

  let {
    theme,
    editor,
    formattingFile: initialFormattingFile,
  }: {
    theme: ThemeProvider
    editor: EditorProvider
    formattingFile: string | null
  } = $props()

  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
  // svelte-ignore state_referenced_locally
  setEditorContext(editor)
  // svelte-ignore state_referenced_locally
  let formattingFile = $state<string | null>(initialFormattingFile)

  /**
   * Re-renders the panel with a new `formattingFile` prop, in place.
   *
   * @param next - The next `formattingFile` prop.
   */
  export function setFormattingFile(next: string | null): void {
    formattingFile = next
  }
</script>

<EditorPanel {formattingFile} />
