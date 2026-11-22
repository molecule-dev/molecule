/**
 * The share-link modal slot (`/share`, the header share button).
 *
 * Solid counterpart of `@molecule/app-ide-react`'s ChatPanel share slot (see
 * that file for the design notes): when `chat:popups` holds a share seed it
 * renders the shared {@link ShareModal} with that role, gated by the viewer's
 * share capability and showing the host's `shareModalContent` below the links.
 * A created link is announced as a persistent system card that links to the
 * public URL, exactly as React does; the modal closes through
 * `chat:render-handlers`. When the popup is closed the slot renders nothing.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import type { ShareLinkResult } from '@molecule/app-ide-panel-logic'
import { buildShareUrl } from '@molecule/app-ide-panel-logic'

import { ShareModal } from '../ShareModal.jsx'
import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatShareModal}. */
export interface ChatShareModalProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the share-link modal when the popup is open.
 * @param props - The inner ctx.
 * @returns The modal, or nothing while it is closed.
 */
export function ChatShareModal(props: ChatShareModalProps): JSX.Element {
  const ctx = props.ctx
  const t = ctx.env.t

  // Surface the created link in the timeline so it persists after the modal
  // closes — the role label and the public URL are both shown.
  const handleCreated = (result: ShareLinkResult): void => {
    ctx.systemCards.addSystemCard(
      t(
        'ide.chat.share.created',
        { role: result.role },
        { defaultValue: 'Created a {{role}} share link.' },
      ),
      {
        action: {
          label: t('ide.chat.share.openLink', undefined, { defaultValue: 'Open link' }),
          href: buildShareUrl(result, typeof window !== 'undefined' ? window.location.origin : ''),
        },
      },
    )
  }

  return (
    <Show when={ctx.popups.shareModal()}>
      {(modal) => (
        <ShareModal
          projectId={ctx.props.projectId}
          initialRole={modal().role}
          canManage={ctx.env.shareAllowed()}
          showLinks={ctx.props.shareLinksAllowed ?? ctx.env.shareAllowed()}
          refreshSignal={ctx.props.shareLinksRefreshSignal}
          onClose={ctx.renderHandlers.closeShareModal}
          onCreated={handleCreated}
        >
          {ctx.props.shareModalContent}
        </ShareModal>
      )}
    </Show>
  )
}
