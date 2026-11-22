/**
 * React's render section “── Share-link modal” (ChatPanel.tsx lines 8830–8862):
 * the `/share` modal slot, rendered after the report slot at the chat root.
 *
 * A fragment in React — nothing while closed, one `ShareModal` while open —
 * so the host element is a `display: contents` wrapper marked
 * `data-parity-unwrap`; the conformance normalizer drops it and the modal
 * lands where React puts it. The open seed (`{ role }`) and the capability
 * flags come from the shared env, the host's own sections are projected into
 * the dialog, the slot closes through the `chat:render-handlers` slice's
 * `closeShareModal`, and a created link publishes React's confirmation card
 * through the `chat:system-cards` slice's `addSystemCard` (role label + public
 * URL) so it outlives the dialog.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, inject, type TemplateRef } from '@angular/core'

import type { ShareLinkResult } from '@molecule/app-ide-panel-logic'
import { buildShareUrl } from '@molecule/app-ide-panel-logic'
import type { AddSystemCardOptions } from '@molecule/app-ide-panel-logic/panels'

import { ShareModal } from '../share-modal.component.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatRenderHandlers } from './chat-render-handlers.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'

/**
 * The share-link modal slot: renders React's `ShareModal` while the popups
 * slice holds a seed, projecting the host's sections inside it.
 */
@Component({
  selector: 'div[mol-chat-share-modal]',
  standalone: true,
  imports: [ShareModal, NgTemplateOutlet],
  // prettier-ignore
  host: { 'data-parity-unwrap': '', style: 'display: contents' },
  // prettier-ignore
  template: `@if (popups.shareModal(); as seed) {<div mol-share-modal [projectId]="projectId()" [initialRole]="seed.role" [canManage]="shareAllowed()" [showLinks]="linksShown()" [refreshSignal]="refreshSignal()" [onClose]="handlers.closeShareModal" [onCreated]="created"><ng-container [ngTemplateOutlet]="content()"></ng-container></div>}`,
})
export class ChatShareModal {
  /** The shared panel state (the props, the derived conversation facts and the env). */
  private readonly state = inject(ChatInnerState)

  /** The `chat:popups` slice: the modal seed. */
  private readonly popups = inject(ChatPopups)

  /** The `chat:render-handlers` slice: React's `onClose`. */
  protected readonly handlers = inject(ChatRenderHandlers)

  /** The `chat:system-cards` slice: React's `addSystemCard` for a created link. */
  private readonly systemCards = inject(ChatSystemCards)

  /**
   * The project whose public link the dialog manages.
   * @returns The project id.
   */
  protected projectId(): string {
    return this.state.props().projectId
  }

  /**
   * Whether the caller may manage share links at all (React's `shareAllowed`).
   * @returns Whether the share surfaces are available.
   */
  protected shareAllowed(): boolean {
    return this.state.env.shareAllowed()
  }

  /**
   * Whether the dialog renders its links (React's `shareLinksAllowed ??
   * shareAllowed`).
   * @returns Whether the links section shows.
   */
  protected linksShown(): boolean {
    return this.state.props().shareLinksAllowed ?? this.shareAllowed()
  }

  /**
   * The host's re-fetch counter for the dialog's links.
   * @returns The refresh signal.
   */
  protected refreshSignal(): number | undefined {
    return this.state.props().shareLinksRefreshSignal
  }

  /**
   * The host's own sections inside the dialog (React's children).
   * @returns The template to project, or null when the host passes none.
   */
  protected content(): TemplateRef<unknown> | null {
    return this.state.props().shareModalContent ?? null
  }

  /**
   * React's inline `onCreated`: publishes the created link as a system card so
   * it outlives the dialog (role label + public URL).
   * @param result - The created share link.
   */
  protected readonly created = (result: ShareLinkResult): void => {
    const text = this.state.env.t(
      'ide.chat.share.created',
      { role: result.role },
      { defaultValue: 'Created a {{role}} share link.' },
    )
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const action: AddSystemCardOptions['action'] = {
      label: this.state.env.t('ide.chat.share.openLink', undefined, {
        defaultValue: 'Open link',
      }),
      href: buildShareUrl(result, origin),
    }
    this.systemCards.addSystemCard(text, { action })
  }
}
