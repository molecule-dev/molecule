<!--
  A colored context ring with progressive context, session and allowance
  details — the Svelte counterpart of `@molecule/app-ide-react`'s
  `ContextUsageIndicator` (see that file for the design notes): the same props
  (React names), the same DOM for the same input, the same callbacks and
  service calls.

  React's export re-keys its stateful view per conversation
  (`key={project}:{conversation}`), so navigation discards the open preview,
  the modal and the in-flight request; this wrapper re-creates its view child
  on the same key, which re-initializes it the same way. The view itself —
  the hover preview, the modal and the session-usage fetch — is
  ContextUsageIndicatorView beside this file.

  The component is a part (React renders it inside ChatPanel without
  exporting it), so it lives in `src/parts/`.
-->

<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type ContextUsageIndicatorProps = types.ContextUsageIndicatorProps
</script>

<script lang="ts">
  import ContextUsageIndicatorView from './ContextUsageIndicatorView.svelte'

  let {
    usage,
    history = [],
    compactions = [],
    projectId = undefined,
    conversationId = undefined,
    onOpenSettings = undefined,
  }: ContextUsageIndicatorProps = $props()

  // Navigation must discard totals and in-flight requests from the old session.
  const sessionKey = $derived(`${projectId ?? ''}:${conversationId ?? ''}`)
</script>

{#key sessionKey}
  <ContextUsageIndicatorView
    {usage}
    {history}
    {compactions}
    {projectId}
    {conversationId}
    {onOpenSettings}
  />
{/key}
