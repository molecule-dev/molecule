<!--
  Test host for FileExplorer's prop-driven state: sets the theme provider in
  Svelte context during component initialisation (the only place Svelte
  context is legal) and renders the explorer from a store of its inputs —
  updating the store re-renders the SAME explorer with new `files` /
  `activeFile` / `persistKey`, the way React's `rerender` does.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import type { FileNode } from '@molecule/app-ide-panel-logic'
  import { setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import FileExplorer from '../components/FileExplorer.svelte'

  /** The explorer's inputs, as one store value. */
  interface ExplorerState {
    /** The tree to render. */
    files: FileNode[]
    /** The active file whose ancestors open. */
    activeFile?: string
    /** The bonded expand-state key. */
    persistKey?: string
    /** Opens a file. */
    onFileSelect: (path: string) => void
  }

  let {
    theme,
    source,
  }: {
    theme: ThemeProvider
    source: Readable<ExplorerState | null>
  } = $props()

  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
</script>

{#if $source}
  <FileExplorer
    files={$source.files}
    activeFile={$source.activeFile}
    persistKey={$source.persistKey}
    onFileSelect={$source.onFileSelect}
  />
{/if}
