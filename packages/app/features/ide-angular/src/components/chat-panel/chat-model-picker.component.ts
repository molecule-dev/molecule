/**
 * React's section “JSX from `{modelPicker &&`” (ChatPanel.tsx lines 6270–6287):
 * the `/model` picker popup shell.
 *
 * The popup renders only while the picker is open AND it has something to show
 * (`modelsLoading || visibleModels.length > 0 || deprecatedModels.length > 0`).
 * While it renders, the host IS React's popup `<div>` — its ClassMap classes and
 * inline style, capped by `popupMaxHeight` — and it composes the header, the
 * scrolling list (or the loading line) and the BYO footer seam in React's order.
 * While it is closed, React renders nothing, so the host carries
 * `data-parity-unwrap` and `display: contents` and the conformance normalizer
 * drops it, exactly as `ChatTimestamp` does for a fragment root.
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatModelPickerByo } from './chat-model-picker-byo.component.js'
import { ChatModelPickerHeader } from './chat-model-picker-header.component.js'
import { ChatModelPickerRows } from './chat-model-picker-rows.component.js'
import { ChatModels } from './chat-models.slice.js'
import { ChatPickers } from './chat-pickers.slice.js'

/** React's inline style for a picker row's loading line. */
const LOADING_STYLE = styleText({ padding: 12 })

/** The closed state: React renders nothing, so the host unwraps to nothing. */
const UNWRAP_STYLE = styleText({ display: 'contents' })

/**
 * React's “JSX from `{modelPicker &&`” section: the `/model` picker popup, or
 * nothing while it is closed (or has nothing to list).
 */
@Component({
  selector: 'div[mol-chat-model-picker]',
  standalone: true,
  imports: [ChatModelPickerByo, ChatModelPickerHeader, ChatModelPickerRows],
  host: {
    '[attr.data-parity-unwrap]': 'rendered() ? null : ""',
    '[attr.class]': 'rendered() ? rootClass : null',
    '[attr.style]': 'rendered() ? rootStyle() : unwrapStyle',
  },
  // prettier-ignore
  template: `@if (rendered()) {<div mol-chat-model-picker-header></div>@if (loading()) {<div [attr.class]="loadingClass" [attr.style]="loadingStyle">{{ loadingText() }}</div>} @else {<div mol-chat-model-picker-rows></div>}<button mol-chat-model-picker-byo></button>}`,
})
export class ChatModelPicker {
  /** The shared state, read for the env (the ClassMap and the translator). */
  private readonly state = inject(ChatInnerState)

  /** The composer slice: the open picker's state (its presence is the gate). */
  private readonly composer = inject(ChatComposer)

  /** The models slice: whether the catalog is still loading. */
  private readonly models = inject(ChatModels)

  /** The pickers slice: the visible and deprecated model lists. */
  private readonly pickers = inject(ChatPickers)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly cm: UIClassMap

  /** The popup's ClassMap classes while it is shown. */
  protected readonly rootClass: string

  /** The loading line's ClassMap classes. */
  protected readonly loadingClass: string

  /** The loading line's inline style. */
  protected readonly loadingStyle: string | null = LOADING_STYLE

  /** The closed state's inline style (the host unwraps away). */
  protected readonly unwrapStyle: string | null = UNWRAP_STYLE

  /** Resolves the ClassMap and the static classes once, at construction. */
  constructor() {
    this.cm = this.state.env.cm
    this.rootClass = this.cm.cn(this.cm.surface, this.cm.borderAll)
    this.loadingClass = this.cm.cn(this.cm.textSize('sm'), this.cm.textMuted)
  }

  /**
   * Whether React renders the popup: open and with something to show.
   *
   * @returns Whether the popup is shown.
   */
  protected rendered(): boolean {
    if (!this.composer.modelPicker()) return false
    return (
      this.models.modelsLoading() ||
      this.pickers.visibleModels().length > 0 ||
      this.pickers.deprecatedModels().length > 0
    )
  }

  /**
   * Whether the catalog is still loading (the loading line branch).
   *
   * @returns Whether the picker shows its loading line.
   */
  protected loading(): boolean {
    return this.models.modelsLoading()
  }

  /**
   * React's popup inline style, capped by the one popup height.
   *
   * @returns The `style` attribute text.
   */
  protected rootStyle(): string | null {
    return styleText({
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      marginBottom: 0,
      borderRadius: '6px 6px 0 0',
      zIndex: 100,
      boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: this.state.env.popupMaxHeight(),
    })
  }

  /**
   * The loading line's text, translated (a locale switch re-renders it).
   *
   * @returns The translated loading text.
   */
  protected loadingText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.modelsLoading', undefined, {
      defaultValue: 'Loading models…',
    })
  }
}
