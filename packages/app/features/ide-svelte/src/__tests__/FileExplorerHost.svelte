<!--
  Test host for FileExplorer: sets the theme provider in Svelte context during
  component initialisation (the only place Svelte context is legal) and renders
  the explorer with the files a test hands it.
-->
<script lang="ts">
  import type { FileNode } from '@molecule/app-ide-panel-logic'
  import type { ThemeProvider } from '@molecule/app-svelte'
  import { setThemeContext } from '@molecule/app-svelte'

  import FileExplorer from '../components/FileExplorer.svelte'

  let {
    theme,
    files,
    onFileSelect,
  }: { theme: ThemeProvider; files: FileNode[]; onFileSelect: (path: string) => void } = $props()

  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
</script>

<FileExplorer {files} {onFileSelect} />
