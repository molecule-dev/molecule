<!--
  Test host for MessageItem: holds the part's `msg` in its own state — `setMsg`
  (exported, so the mount instance exposes it) re-renders the part in place the
  way React's `rerender` does, keeping the part's internal state.
-->
<script lang="ts">
  import type { ChatMessage } from '@molecule/app-ai-chat'

  import MessageItem from '../parts/MessageItem.svelte'

  let { msg: initialMsg }: { msg: ChatMessage } = $props()

  // svelte-ignore state_referenced_locally
  let msg = $state(initialMsg)

  /**
   * Re-renders the part with a new `msg` prop, in place.
   *
   * @param next - The next `msg` prop.
   */
  export function setMsg(next: ChatMessage): void {
    msg = next
  }
</script>

<MessageItem {msg} isLight={false} />
