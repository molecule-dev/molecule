<!--
  Test host for MarkdownContent: holds the text and the streaming flag in its
  own state — `setText` / `setStreaming` (exported, so the mount instance
  exposes them) re-render the message in place the way React's `rerender`
  hands it new props.
-->
<script lang="ts">
  import MarkdownContent from '../parts/MarkdownContent.svelte'

  let {
    text: initialText,
    isStreaming: initialStreaming = false,
  }: { text: string; isStreaming?: boolean } = $props()

  // svelte-ignore state_referenced_locally
  let text = $state(initialText)
  // svelte-ignore state_referenced_locally
  let isStreaming = $state(initialStreaming)

  /**
   * Re-renders with new text, in place.
   *
   * @param next - The next text prop.
   */
  export function setText(next: string): void {
    text = next
  }

  /**
   * Re-renders with a new streaming flag, in place.
   *
   * @param next - The next `isStreaming` prop.
   */
  export function setStreaming(next: boolean): void {
    isStreaming = next
  }
</script>

<MarkdownContent {text} {isStreaming} />
