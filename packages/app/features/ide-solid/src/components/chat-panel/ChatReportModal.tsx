/**
 * The bug-report modal slot (`/report`, `/bug`, the header bug button).
 *
 * Solid counterpart of `@molecule/app-ide-react`'s ChatPanel report slot (see
 * that file for the design notes): when `chat:popups` holds a report seed it
 * renders the shared {@link ReportModal} with that title, the conversation the
 * endpoint names and the host's product name / version; the modal closes and
 * reports through `chat:render-handlers`. When the popup is closed the slot
 * renders nothing, exactly as React's `reportModal && …`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { APP_VERSION } from '@molecule/app-ide-panel-logic'

import { ReportModal } from '../ReportModal.jsx'
import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatReportModal}. */
export interface ChatReportModalProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the bug-report modal when the popup is open.
 * @param props - The inner ctx.
 * @returns The modal, or nothing while it is closed.
 */
export function ChatReportModal(props: ChatReportModalProps): JSX.Element {
  const ctx = props.ctx

  return (
    <Show when={ctx.popups.reportModal()}>
      {(modal) => (
        <ReportModal
          projectId={ctx.props.projectId}
          conversationId={ctx.env.conversationId()}
          initialTitle={modal().title}
          productName={ctx.props.productName}
          appVersion={ctx.props.version || APP_VERSION}
          onClose={ctx.renderHandlers.closeReportModal}
          onSubmitted={ctx.renderHandlers.handleReportSubmitted}
        />
      )}
    </Show>
  )
}
