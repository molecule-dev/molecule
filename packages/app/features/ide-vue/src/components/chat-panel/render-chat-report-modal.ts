/**
 * The bug-report modal — React's render section "── Bug-report modal", opened
 * by `/report`, `/bug` and the header's bug button.
 *
 * The modal is one of the two "slots" the outer unit owns: it renders at the
 * chat root when the `chat:popups` slice holds a seed, and its close/submitted
 * handlers come from the render-handlers slice (created fresh each render, as
 * React's inline handlers were).
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { APP_VERSION } from '@molecule/app-ide-panel-logic'

import { ReportModal } from '../ReportModal.js'
import type { ChatCtx } from './context.js'

/**
 * Renders the bug-report modal.
 *
 * @param ctx - The panel context.
 * @returns The modal, or `null` while it is closed.
 */
export function renderChatReportModal(ctx: ChatCtx): VNodeChild {
  const modal = ctx.popups.reportModal.value
  if (!modal) return null

  return h(ReportModal, {
    projectId: ctx.props.projectId,
    conversationId: ctx.env.conversationId.value,
    initialTitle: modal.title,
    productName: ctx.props.productName,
    appVersion: ctx.props.version || APP_VERSION,
    onClose: ctx.renderHandlers.closeReportModal,
    onSubmitted: ctx.renderHandlers.handleReportSubmitted,
  })
}
