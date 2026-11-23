/**
 * React's section “Host-provided seam to the BYO” (“bring your own AI”)
 * management surface (ChatPanel.tsx lines 7053–7107).
 *
 * An ANCHORED footer action bar OUTSIDE the scrolling model list (the popup's
 * column layout pins it with `flexShrink: 0`, so it stays visible at any scroll
 * position). Rendered only when the host passes `onManageCustomModels`; its click
 * resolves the mode the host's provider modal should target (the picker's scope
 * when that is a conversation mode, else the live conversation mode), closes the
 * picker, clears the composer and invokes the callback. The primary-colour tint
 * is the same idiom as the per-row "current" pill, using a `color-mix` over the
 * theme token (the hex is only the `var()` fallback).
 *
 * The host IS React's root `<button>`; while the host passes no callback React
 * renders nothing, so the host is out of the DOM then (`useHostPresence`).
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import { useHostPresence } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ChatChat } from './chat-chat.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatPickers } from './chat-pickers.slice.js'

/** The footer's selected-state background tint (the keyboard-highlighted row). */
const SELECTED_BG = 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'

/** The footer's resting background tint. */
const RESTING_BG = 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 12%, transparent)'

/** The hover background tint. */
const HOVER_BG = SELECTED_BG

/**
 * React's “Host-provided seam to the BYO” section: the anchored "Add or manage
 * your own models…" footer, or nothing when the host passes no callback.
 */
@Component({
  selector: 'button[mol-chat-model-picker-byo]',
  standalone: true,
  host: {
    type: 'button',
    '[attr.class]': 'rootClass',
    '[attr.style]': 'rootStyle()',
    '[attr.data-mol-id]': '"chat-model-manage-custom"',
    '(click)': 'onClick()',
    '(mouseenter)': 'onEnter($event)',
    '(mouseleave)': 'onLeave($event)',
  },
  // prettier-ignore
  template: `@if (shown()) {{{ label() }}}`,
})
export class ChatModelPickerByo {
  /** The shared state, read for the props (the host's callback) and the env. */
  private readonly state = inject(ChatInnerState)

  /** The composer slice: the open picker and its writer/clear. */
  private readonly composer = inject(ChatComposer)

  /** The pickers slice: the visible list (the footer's last keyboard index). */
  private readonly pickers = inject(ChatPickers)

  /** The chat slice: the live conversation mode. */
  private readonly chat = inject(ChatChat)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly cm: UIClassMap

  /** The footer's ClassMap classes while it is shown. */
  protected readonly rootClass: string

  /** Resolves the ClassMap and the static classes once, and keeps the host in the page only while shown. */
  constructor() {
    this.cm = this.state.env.cm
    this.rootClass = this.cm.cn(
      this.cm.textSize('xs'),
      this.cm.fontWeight('medium'),
      this.cm.w('full'),
    )
    useHostPresence(() => this.shown())
  }

  /**
   * Whether React renders the footer: the host passed the seam callback.
   *
   * @returns Whether the footer is shown.
   */
  protected shown(): boolean {
    return Boolean(this.state.props().onManageCustomModels)
  }

  /**
   * React's footer inline style: the resting or selected tint.
   *
   * @returns The `style` attribute text.
   */
  protected rootStyle(): string | null {
    return styleText({
      flexShrink: 0,
      padding: '9px 12px',
      border: 'none',
      borderTop: '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
      color: 'var(--mol-color-primary, #6366f1)',
      cursor: 'pointer',
      textAlign: 'center',
      background: this.selected() ? SELECTED_BG : RESTING_BG,
    })
  }

  /**
   * Whether the footer is the picker's keyboard highlight (the last arrow index).
   *
   * @returns Whether the selected tint applies.
   */
  private selected(): boolean {
    const picker = this.composer.modelPicker()
    return picker !== null && picker.selectedIdx === this.pickers.visibleModels().length
  }

  /**
   * The footer's label, translated.
   *
   * @returns The label text.
   */
  protected label(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.manageCustomModels', undefined, {
      defaultValue: 'Add or manage your own models…',
    })
  }

  /** Closes the picker, clears the composer, and invokes the host's seam. */
  protected onClick(): void {
    const picker = this.composer.modelPicker()
    const manageMode =
      picker?.mode === 'plan' || picker?.mode === 'execute'
        ? picker.mode
        : this.chat.liveModelMode()
    this.composer.setModelPicker(null)
    this.composer.setInputValue('')
    this.state.props().onManageCustomModels?.({ mode: manageMode })
  }

  /**
   * The hover tint (React's `onMouseEnter` direct style write).
   *
   * @param event - The mouse event (its currentTarget is the button).
   */
  protected onEnter(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.background = HOVER_BG
  }

  /**
   * Restores the resting/selected tint on leave (React's `onMouseLeave`).
   *
   * @param event - The mouse event (its currentTarget is the button).
   */
  protected onLeave(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.background = this.selected()
      ? SELECTED_BG
      : RESTING_BG
  }
}
