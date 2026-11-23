<!--
  React's section “── Share-link modal” (ChatPanel.tsx): the `/share` link
  dialog, opened by that command and by the header's share button, and
  rendered at the chat root.

  The seed (`{ role }`), the host's grant (`canManage`), the links toggle and
  the refresh signal all come from the panel's context, and the host's own
  sections render inside the dialog. Closing clears the popup state through the
  `chat:render-handlers` slice. The timeline card a created link publishes is
  the `chat:system-cards` slice's `addSystemCard`, exactly as React's inline
  `onCreated` does.
-->
<script lang="ts">
  import { buildShareUrl, type ShareLinkResult } from '@molecule/app-ide-panel-logic'

  import ShareModal from '../ShareModal.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  /**
   * Publishes the timeline card React's inline `onCreated` adds: the role
   * label and the public URL, so the link persists after the modal closes.
   *
   * @param result - The created link.
   */
  function handleShareCreated(result: ShareLinkResult): void {
    ctx.systemCards.addSystemCard(
      ctx.env.t(
        'ide.chat.share.created',
        { role: result.role },
        { defaultValue: 'Created a {{role}} share link.' },
      ),
      {
        action: {
          label: ctx.env.t('ide.chat.share.openLink', undefined, {
            defaultValue: 'Open link',
          }),
          href: buildShareUrl(result, typeof window !== 'undefined' ? window.location.origin : ''),
        },
      },
    )
  }
</script>

{#if ctx.popups.shareModal}
  <ShareModal
    projectId={ctx.props.projectId}
    initialRole={ctx.popups.shareModal.role}
    canManage={ctx.env.shareAllowed}
    showLinks={ctx.props.shareLinksAllowed ?? ctx.env.shareAllowed}
    refreshSignal={ctx.props.shareLinksRefreshSignal}
    onClose={ctx.renderHandlers.closeShareModal}
    onCreated={handleShareCreated}
  >
    {#if ctx.props.shareModalContent}
      {@render ctx.props.shareModalContent?.()}
    {/if}
  </ShareModal>
{/if}
