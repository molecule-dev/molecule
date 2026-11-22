/**
 * The share-link modal — React's render section "── Share-link modal", opened
 * by `/share` and the header's share button.
 *
 * Creating a link surfaces it in the timeline through the system-cards slice so
 * it persists after the modal closes — the role label and the public URL are
 * both shown, exactly as React's `onCreated` does.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { buildShareUrl, type ShareLinkResult } from '@molecule/app-ide-panel-logic'

import { ShareModal } from '../ShareModal.js'
import type { ChatCtx } from './context.js'

/**
 * Renders the share-link modal.
 *
 * @param ctx - The panel context.
 * @returns The modal, or `null` while it is closed.
 */
export function renderChatShareModal(ctx: ChatCtx): VNodeChild {
  const modal = ctx.popups.shareModal.value
  if (!modal) return null

  const t = ctx.env.t
  const shareAllowed = ctx.env.shareAllowed.value
  const content = ctx.props.shareModalContent

  return h(
    ShareModal,
    {
      projectId: ctx.props.projectId,
      initialRole: modal.role,
      canManage: shareAllowed,
      showLinks: ctx.props.shareLinksAllowed ?? shareAllowed,
      refreshSignal: ctx.props.shareLinksRefreshSignal,
      onClose: ctx.renderHandlers.closeShareModal,
      onCreated: (result: ShareLinkResult) => {
        // Surface the created link in the timeline so it persists after the
        // modal closes — the role label and the public URL are both shown.
        ctx.systemCards.addSystemCard(
          t(
            'ide.chat.share.created',
            { role: result.role },
            { defaultValue: 'Created a {{role}} share link.' },
          ),
          {
            action: {
              label: t('ide.chat.share.openLink', undefined, { defaultValue: 'Open link' }),
              href: buildShareUrl(
                result,
                typeof window !== 'undefined' ? window.location.origin : '',
              ),
            },
          },
        )
      },
    },
    content !== undefined ? { default: () => content } : undefined,
  )
}
