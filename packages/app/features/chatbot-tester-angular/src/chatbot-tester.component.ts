/**
 * ChatbotTester component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ChatbotTesterInput } from './chatbot-tester-input.component.js'
import { ChatbotTesterMessages } from './chatbot-tester-messages.component.js'
import { applyReactSelectSelection, nodeTruthy, textOf } from './dom.js'
import type { TesterBotOption, TesterMessage } from './types.js'

/**
 * ChatbotTester component.
 *
 * Composed sandbox UI: optional bot picker + messages thread + composer row +
 * error region. The host IS React's root `<div>` (`div[mol-chatbot-tester]`),
 * matching its classes exactly. Node props are projected content
 * (`[slot=error]`, `[slot=emptyState]`, `[slot=botPickerLabel]`) or template
 * references; each is reconciled against React's DOM by the placement function
 * registered in the constructor.
 * The composer text is the component's own state, and the bot picker is a
 * controlled `<select>` whose selection follows `botId` exactly as react-dom
 * updates it.
 */
@Component({
  selector: 'div[mol-chatbot-tester]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet, ChatbotTesterInput, ChatbotTesterMessages],
  inputs: [
    'messages',
    'loading',
    'onSend',
    'bots',
    'botId',
    'onBotChange',
    'error',
    'emptyState',
    'botPickerLabel',
    'inputPlaceholder',
    'sendLabel',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div #botBar [class]="botBarClasses()"><label for="chatbot-tester-bot-select" [class]="botLabelClasses()">@if (botLabelTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (hasBotLabelText()) {<ng-container>{{ textOf(botPickerLabel) }}</ng-container>} @else {<span #botLabelDefault>{{ botLabelDefaultText() }}</span><span #botLabelSlot><ng-content select="[slot=botPickerLabel]"></ng-content></span>}</label><select #botSelect id="chatbot-tester-bot-select" (change)="handleBotChange($event)" [class]="selectClasses()">@for (bot of botsOf(); track bot.id) {<option [value]="bot.id">{{ bot.name || bot.id }}</option>}</select></div>
<mol-chatbot-tester-messages [messages]="messages" [loading]="loading" [emptyState]="emptyState"><ng-container ngProjectAs="[slot=emptyState]"><ng-content select="[slot=emptyState]"></ng-content></ng-container></mol-chatbot-tester-messages>
<p #errorRow role="alert" [class]="errorClasses()"><span #errorSlot>@if (errorTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (hasErrorText()) {<ng-container>{{ textOf(error) }}</ng-container>}<ng-content select="[slot=error]"></ng-content></span></p>
<div mol-chatbot-tester-input [value]="input" [onChange]="setInput" [onSend]="handleSend" [loading]="loading" [placeholder]="inputPlaceholder" [sendLabel]="sendLabel"></div>`,
})
export class ChatbotTester {
  /** The transcript, in display order. */
  messages: TesterMessage[] = []
  /** A reply is in flight: the composer and its send action are disabled. */
  loading?: boolean
  /** Called with the trimmed composer text when the user sends. */
  onSend?: (text: string) => void | Promise<void>
  /** Optional bot list — when length >= 2, a picker is rendered. */
  bots?: TesterBotOption[]
  /** The selected bot id (controlled). */
  botId?: string
  /** Called with the newly selected bot id. */
  onBotChange?: (id: string) => void
  /** Last error message, as `[slot=error]` content or a template reference. */
  error?: unknown
  /** Empty-state content, as `[slot=emptyState]` content or a template reference. */
  emptyState?: unknown
  /** The bot picker's label, as `[slot=botPickerLabel]` content or a template reference — an explicit value overrides `t('chatbotTester.label.testBot')` (`'Test bot'`). */
  botPickerLabel?: unknown
  /** Composer placeholder — an explicit value overrides `t('chatbotTester.placeholder.message')` (`'Type a message…'`). */
  inputPlaceholder?: string
  /** Send button label — an explicit value overrides `t('chatbotTester.label.send')` (`'Send'`). */
  sendLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The composer's text (this component's own state, as in React). */
  input = ''

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The bot picker bar (React renders it only for 2+ bots). */
  @ViewChild('botBar') private botBar?: ElementRef<HTMLElement>
  /** The picker's default label text. */
  @ViewChild('botLabelDefault') private botLabelDefault?: ElementRef<HTMLElement>
  /** The picker label's projected-node capture point. */
  @ViewChild('botLabelSlot') private botLabelSlot?: ElementRef<HTMLElement>
  /** The picker's `<select>` (React's controlled selection). */
  @ViewChild('botSelect') private botSelect?: ElementRef<HTMLSelectElement>
  /** The error paragraph (React renders it only for a truthy `error`). */
  @ViewChild('errorRow') private errorRow?: ElementRef<HTMLElement>
  /** The error's projected-node capture point. */
  @ViewChild('errorSlot') private errorSlot?: ElementRef<HTMLElement>

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The host's class list (React's root classes).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ direction: 'col' }),
      this.cm().flex1,
      this.cm().minW(0),
      this.className,
    )
  }

  /**
   * The bot picker bar's class list.
   * @returns The class string.
   */
  botBarClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center' }),
      this.cm().sp('px', 6),
      this.cm().sp('py', 3),
      this.cm().chatbotTesterBotBar,
    )
  }

  /**
   * The picker label's class list.
   * @returns The class string.
   */
  botLabelClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('bold'))
  }

  /**
   * The picker select's class list.
   * @returns The class string.
   */
  selectClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().chatbotTesterBotSelect)
  }

  /**
   * The error paragraph's class list.
   * @returns The class string.
   */
  errorClasses(): string {
    return this.cm().cn(
      this.cm().textSize('sm'),
      this.cm().sp('px', 6),
      this.cm().sp('py', 2),
      this.cm().textError,
    )
  }

  /**
   * The transcript, tolerating an unset input.
   * @returns The messages.
   */
  messagesOf(): TesterMessage[] {
    return this.messages ?? []
  }

  /**
   * The bot list React renders (its `bots ?? []`).
   * @returns The bot options.
   */
  botsOf(): TesterBotOption[] {
    return this.bots ?? []
  }

  /**
   * The picker label as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  botLabelTemplate(): TemplateRef<unknown> | null {
    return this.botPickerLabel instanceof TemplateRef ? this.botPickerLabel : null
  }

  /**
   * Whether the label input itself carries text (React's `{label}` for a string).
   * @returns True for a truthy string or number.
   */
  hasBotLabelText(): boolean {
    return (
      (typeof this.botPickerLabel === 'string' || typeof this.botPickerLabel === 'number') &&
      nodeTruthy(this.botPickerLabel)
    )
  }

  /**
   * The error as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  errorTemplate(): TemplateRef<unknown> | null {
    return this.error instanceof TemplateRef ? this.error : null
  }

  /**
   * Whether the error input itself carries text (React's `{error}` for a string).
   * @returns True for a truthy string or number.
   */
  hasErrorText(): boolean {
    return (
      (typeof this.error === 'string' || typeof this.error === 'number') && nodeTruthy(this.error)
    )
  }

  /**
   * Renders a text value the way React renders a node string.
   * @param value - The prop value.
   * @returns The text.
   */
  textOf(value: unknown): string {
    return textOf(value)
  }

  /**
   * The picker label's default text (React's `botPickerLabel = 'Test bot'`
   * default, through `t()`), rendered when nothing was passed or projected.
   * @returns The label text.
   */
  botLabelDefaultText(): string {
    return this.i18n.t('chatbotTester.label.testBot', undefined, { defaultValue: 'Test bot' })
  }

  /**
   * Writes the composer text from the input row (React's `setInput`).
   * @param next - The field's new text.
   */
  setInput = (next: string): void => {
    this.input = next
  }

  /** Sends the trimmed composer text and clears the field. */
  handleSend = async (): Promise<void> => {
    const text = this.input.trim()
    if (!text) return
    this.input = ''
    await this.onSend?.(text)
  }

  /**
   * Reports the selected bot, then restores the controlled selection the way
   * react-dom does after a controlled select's change event.
   * @param event - The native change event.
   */
  handleBotChange(event: Event): void {
    this.onBotChange?.((event.target as HTMLSelectElement).value)
    this.applySelection()
  }

  /** Applies react-dom's controlled-select selection. */
  private applySelection(): void {
    applyReactSelectSelection(this.botSelect?.nativeElement, this.botId ?? '')
  }

  /**
   * Applies React's conditions: the picker for 2+ bots, the error paragraph
   * for a truthy error, and the label's default text only when nothing was
   * projected into the label.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const botLabelDefault = this.botLabelDefault?.nativeElement
    const botLabelSlot = this.botLabelSlot?.nativeElement
    const errorSlot = this.errorSlot?.nativeElement
    setElementPresent(this.botBar?.nativeElement, this.botsOf().length > 1)
    setElementPresent(
      this.errorRow?.nativeElement,
      this.errorTemplate() !== null || this.hasErrorText() || hasContent(errorSlot),
    )
    // Each capture's content renders exactly where the capture stood, and the capture
    // itself leaves the page (React renders the label text and the error node bare).
    const showsDefault = !hasContent(botLabelSlot)
    if (showsDefault) placeContentBefore(botLabelDefault, botLabelDefault)
    // Back inside the capture, so it leaves the page with it.
    else placeContent(botLabelDefault, null)
    setElementPresent(botLabelDefault, false)
    placeContentBefore(botLabelSlot, botLabelSlot)
    setElementPresent(botLabelSlot, false)
    placeContentBefore(errorSlot, errorSlot)
    setElementPresent(errorSlot, false)
    this.applySelection()
  }
}
