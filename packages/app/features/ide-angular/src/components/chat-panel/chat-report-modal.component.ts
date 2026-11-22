/**
 * React's render section “── Bug-report modal” (ChatPanel.tsx lines 8817–8828):
 * the `/report` / `/bug` modal slot, rendered after the composer at the chat
 * root.
 *
 * The section is a fragment in React — nothing while the modal is closed, one
 * `ReportModal` while it is open — so its host element is a
 * `display: contents` wrapper marked `data-parity-unwrap`; the conformance
 * normalizer drops it and the modal lands where React puts it. The open seed
 * (`{ title }`) comes from the `chat:popups` slice, and the modal's close and
 * submit handlers are the `chat:render-handlers` slice's — exactly the
 * `onClose` / `onSubmitted` props React passes there.
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import { DEFAULT_PRODUCT_NAME } from '@molecule/app-angular'
import { APP_VERSION } from '@molecule/app-ide-panel-logic'

import { ReportModal } from '../report-modal.component.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatRenderHandlers } from './chat-render-handlers.slice.js'

/**
 * The bug-report modal slot: renders React's `ReportModal` while the popups
 * slice holds a seed.
 */
@Component({
  selector: 'div[mol-chat-report-modal]',
  standalone: true,
  imports: [ReportModal],
  // prettier-ignore
  host: { 'data-parity-unwrap': '', style: 'display: contents' },
  // prettier-ignore
  template: `@if (popups.reportModal(); as seed) {<div mol-report-modal [projectId]="projectId()" [conversationId]="conversationId()" [initialTitle]="seed.title" [productName]="productName()" [appVersion]="appVersion()" [onClose]="handlers.closeReportModal" [onSubmitted]="handlers.handleReportSubmitted"></div>}`,
})
export class ChatReportModal {
  /** The shared panel state (the props and the derived conversation facts). */
  private readonly state = inject(ChatInnerState)

  /** The `chat:popups` slice: the modal seed. */
  private readonly popups = inject(ChatPopups)

  /** The `chat:render-handlers` slice: React's `onClose` / `onSubmitted`. */
  protected readonly handlers = inject(ChatRenderHandlers)

  /**
   * The project the report is about.
   * @returns The project id.
   */
  protected projectId(): string {
    return this.state.props().projectId
  }

  /**
   * The conversation to attach for context (React's derived endpoint id).
   * @returns The conversation id, or null.
   */
  protected conversationId(): string | null {
    return this.state.env.conversationId()
  }

  /**
   * The product's name (React's resolved `productName` prop).
   * @returns The product name.
   */
  protected productName(): string {
    return this.state.props().productName ?? DEFAULT_PRODUCT_NAME
  }

  /**
   * The build version reported with diagnostics (React's `version || APP_VERSION`).
   * @returns The app version.
   */
  protected appVersion(): string {
    return this.state.props().version || APP_VERSION
  }
}
