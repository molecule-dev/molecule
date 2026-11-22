<!--
  React's section “── Bug-report modal” (ChatPanel.tsx): the `/report` and
  `/bug` form, opened by those commands and by the header's bug button, and
  rendered at the chat root.

  The seed (`{ title }`) and the close/submitted handlers all come from the
  panel's context: React's inline handlers live in the `chat:render-handlers`
  slice, so the modal uses them exactly as React's section does. The
  confirmation card a successful submission publishes is the
  `chat:system-cards` slice's `addSystemCard`.
-->
<script lang="ts">
  import { APP_VERSION } from '@molecule/app-ide-panel-logic'

  import ReportModal from '../ReportModal.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()
</script>

{#if ctx.popups.reportModal}
  <ReportModal
    projectId={ctx.props.projectId}
    conversationId={ctx.env.conversationId}
    initialTitle={ctx.popups.reportModal.title}
    productName={ctx.productName}
    appVersion={ctx.props.version || APP_VERSION}
    onClose={ctx.renderHandlers.closeReportModal}
    onSubmitted={ctx.renderHandlers.handleReportSubmitted}
  />
{/if}
