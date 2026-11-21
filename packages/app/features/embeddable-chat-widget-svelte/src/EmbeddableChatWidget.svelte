<!--
  EmbeddableChatWidget: the Svelte counterpart of
  `@molecule/app-embeddable-chat-widget`'s `EmbeddableChatWidget` — drop-in
  floating chat widget: a collapsed launcher in the configured corner;
  clicking expands the 360x540px panel. Same props (React names), same DOM
  for the same input.
-->
<script lang="ts">
  import EmbeddableChatLauncher from './EmbeddableChatLauncher.svelte'
  import EmbeddableChatPanel from './EmbeddableChatPanel.svelte'
  import type { EmbeddableChatWidgetProps } from './types.js'

  let { config, defaultOpen = false }: EmbeddableChatWidgetProps = $props()

  // svelte-ignore state_referenced_locally
  // React seeds `open` from the `defaultOpen` PROP VALUE once (later prop
  // writes never reopen the panel), so capturing the initial value is the
  // point, not an oversight.
  let open = $state(defaultOpen)

  const position = $derived(config.position ?? 'bottom-right')
</script>

<EmbeddableChatLauncher
  visible={!open}
  onOpen={() => (open = true)}
  {position}
  theme={config.theme}
/>
<EmbeddableChatPanel visible={open} onClose={() => (open = false)} {position} {config} />
