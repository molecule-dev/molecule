<!--
  Test fixture: the controlled wrapper of the React suite's "lets a controlled
  wrapper update the rendered snippet on change" case, holding its own state
  and passing it as `values` + `onChange`.
-->
<script lang="ts">
  import EmbedSnippet from '../../EmbedSnippet.svelte'
  import type { EmbedSnippetValues } from '../../types.js'

  const TEMPLATE =
    '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

  let values = $state<EmbedSnippetValues>({ width: 640, height: 480, theme: 'light' })
</script>

<EmbedSnippet
  template={TEMPLATE}
  controls={{ width: true, height: true, theme: true }}
  {values}
  onChange={(next) => (values = next)}
/>
