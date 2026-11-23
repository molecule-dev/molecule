/**
 * React's section “Drag overlay — covers entire chat area” (ChatPanel.tsx lines
 * 5204–5235): the dashed blue wash a file drag paints over the whole chat, with
 * the “Drop files here” label tinted for the active theme.
 *
 * React renders the overlay only while `isDragOver` is true, so the host element
 * — React's own root `<div>`, the first child of the inner chat's root — is the
 * overlay while a drag hovers and out of the DOM while React renders nothing
 * (`useHostPresence`).
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import { useHostPresence } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ChatAttachments } from './chat-attachments.slice.js'
import { ChatInnerState } from './chat-inner-state.js'

/** React's inline style for the overlay box while a drag hovers. */
const ROOT_STYLE = styleText({
  position: 'absolute',
  inset: 0,
  zIndex: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(64,112,224,0.2)',
  border: '2px dashed rgba(64,112,224,0.5)',
  borderRadius: '6px',
  pointerEvents: 'none',
})

/**
 * React's “Drag overlay — covers entire chat area” section: the drop target
 * shown while a file drag hovers the chat.
 */
@Component({
  selector: 'div[mol-chat-drag-overlay]',
  standalone: true,
  host: {
    '[attr.style]': 'rootStyle',
  },
  // prettier-ignore
  template: `@if (open()) {<span [attr.class]="labelClass" [attr.style]="labelStyle()">{{ label() }}</span>}`,
})
export class ChatDragOverlay {
  /** The shared state, read for the env (ClassMap, theme and translator). */
  private readonly state = inject(ChatInnerState)

  /** The attachments slice: whether a drag is hovering the chat. */
  private readonly attachments = inject(ChatAttachments)

  /** The overlay box's inline style while it is shown. */
  protected readonly rootStyle: string | null = ROOT_STYLE

  /** The label's ClassMap classes. */
  protected readonly labelClass: string

  /** Resolves the ClassMap once, and keeps the host in the page only while a drag hovers. */
  constructor() {
    const cm: UIClassMap = this.state.env.cm
    this.labelClass = cm.textSize('sm')
    useHostPresence(() => this.open())
  }

  /**
   * Whether React would render the overlay: a drag is hovering the chat.
   *
   * @returns Whether the overlay is shown.
   */
  protected open(): boolean {
    return this.attachments.isDragOver()
  }

  /**
   * The label's inline style, tinted for the active theme.
   *
   * @returns The `style` attribute text.
   */
  protected labelStyle(): string | null {
    const dark = this.state.env.themeMode() === 'dark'
    return styleText({
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: 600,
      background: dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)',
      color: dark ? '#1a1a1a' : '#fff',
      boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
    })
  }

  /**
   * The label text.
   *
   * @returns The translated label.
   */
  protected label(): string {
    // Follows a locale switch, the way React's whole-component re-render does.
    void this.state.env.locale()
    return this.state.env.t('ide.chat.dropFilesHere', undefined, {
      defaultValue: 'Drop files here',
    })
  }
}
