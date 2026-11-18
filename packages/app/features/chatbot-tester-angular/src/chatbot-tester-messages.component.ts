/**
 * ChatbotTesterMessages component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  ElementRef,
  inject,
  Renderer2,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasNodes, nodeTruthy, SlotGuard, textOf } from './slot-dom.js'
import type { TesterMessage } from './types.js'

/**
 * ChatbotTesterMessages component.
 *
 * Scrollable transcript with left-aligned (assistant) and right-aligned (user)
 * bubbles plus the typing indicator. React's root is one of two `<div>`s — the
 * empty-state wrapper or the transcript pane — so the host is transparent
 * (`data-parity-unwrap`, `display: contents`) and the two roots are reconciled
 * against React's branch by {@link ChatbotTesterMessages.ngAfterViewInit} /
 * {@link ChatbotTesterMessages.ngAfterViewChecked}. The empty state is
 * projected content (`[slot=emptyState]`) or a template input.
 */
@Component({
  selector: 'mol-chatbot-tester-messages',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['messages', 'loading', 'emptyState'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `<div #emptyRoot [class]="emptyClasses()"><span #emptySlot data-parity-unwrap style="display: contents">@if (emptyTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (hasEmptyText()) {<ng-container>{{ textOf(emptyState) }}</ng-container>}<ng-content select="[slot=emptyState]"></ng-content></span></div>
<div #listRoot [class]="listClasses()"><div [class]="stackClasses()">@for (msg of messagesOf(); track msg.id) {<div [class]="rowClasses(msg)"><div [class]="bubbleClasses(msg)">{{ msg.content }}@if (msg.timestamp) {<div [class]="timeClasses(msg)">{{ msg.timestamp }}</div>}</div></div>}@if (loading) {<div [class]="typingClasses()">...</div>}<div></div></div></div>`,
})
export class ChatbotTesterMessages implements AfterViewInit, AfterViewChecked {
  /** The transcript, in display order. */
  messages: TesterMessage[] = []
  /** A reply is in flight: the typing indicator is appended. */
  loading?: boolean
  /** Empty-state content — a template reference or `[slot=emptyState]` content. */
  emptyState?: unknown

  /** The empty-state wrapper (React's first root). */
  @ViewChild('emptyRoot') private emptyRoot?: ElementRef<HTMLElement>
  /** The transcript pane (React's second root). */
  @ViewChild('listRoot') private listRoot?: ElementRef<HTMLElement>
  /** The projected empty-state capture point. */
  @ViewChild('emptySlot') private emptySlot?: ElementRef<HTMLElement>

  private readonly guard = new SlotGuard(inject(ElementRef), inject(Renderer2))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The transcript, tolerating an unset input.
   * @returns The messages.
   */
  messagesOf(): TesterMessage[] {
    return this.messages ?? []
  }

  /**
   * The empty-state wrapper's class list (React's `cm.cn(cm.flex1, cm.flex({…}))`).
   * @returns The class string.
   */
  emptyClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().flex({ align: 'center', justify: 'center' }))
  }

  /**
   * The transcript pane's class list.
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(
      this.cm().flex1,
      this.cm().sp('px', 6),
      this.cm().sp('py', 4),
      this.cm().chatbotTesterMessageList,
    )
  }

  /**
   * The bubble stack's class list (`cm.stack(3)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(3)
  }

  /**
   * One message row's class list (React's alignment by role).
   * @param msg - The message.
   * @returns The class string.
   */
  rowClasses(msg: TesterMessage): string {
    return this.cm().flex({ justify: msg.role === 'user' ? 'end' : 'start' })
  }

  /**
   * One bubble's class list (React's shared bubble + side-specific tokens).
   * @param msg - The message.
   * @returns The class string.
   */
  bubbleClasses(msg: TesterMessage): string {
    const cm = this.cm()
    const isUser = msg.role === 'user'
    return cm.cn(
      cm.sp('px', 4),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.chatbotTesterMessageBubble,
      isUser ? cm.chatbotTesterMessageBubbleUser : cm.chatbotTesterMessageBubbleBot,
    )
  }

  /**
   * One timestamp's class list (React's side-specific time tokens).
   * @param msg - The message.
   * @returns The class string.
   */
  timeClasses(msg: TesterMessage): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('xs'),
      cm.sp('mt', 1),
      msg.role === 'user' ? cm.chatbotTesterMessageTimeUser : cm.chatbotTesterMessageTimeBot,
    )
  }

  /**
   * The typing indicator's class list.
   * @returns The class string.
   */
  typingClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().chatbotTesterTypingIndicator)
  }

  /**
   * The empty state as an input template (a node passed as a prop rather than
   * projected as `[slot=emptyState]`), when there is one.
   * @returns The empty-state template, or null.
   */
  emptyTemplate(): TemplateRef<unknown> | null {
    return this.emptyState instanceof TemplateRef ? this.emptyState : null
  }

  /**
   * Whether the empty-state input itself carries text (React's `{emptyState}`
   * for a string or number node).
   * @returns True for a truthy string or number.
   */
  hasEmptyText(): boolean {
    return typeof this.emptyState === 'string' || typeof this.emptyState === 'number'
      ? nodeTruthy(this.emptyState)
      : false
  }

  /**
   * Renders a text value the way React renders a node string.
   * @param value - The prop value.
   * @returns The text.
   */
  textOf(value: unknown): string {
    return textOf(value)
  }

  /** Reconciles the two roots once the view queries resolve. */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles after each view update: a node-valued empty state that
   * arrives through an input renders into its outlet only during the update,
   * so the branch decision must be read afterwards.
   */
  ngAfterViewChecked(): void {
    this.reconcile()
  }

  /**
   * Applies React's condition: with no messages, nothing loading and an empty
   * state, the empty wrapper renders; otherwise the transcript pane does.
   */
  private reconcile(): void {
    const emptySlot = this.emptySlot?.nativeElement
    const hasEmpty =
      !this.loading &&
      this.messagesOf().length === 0 &&
      (this.emptyTemplate() !== null || this.hasEmptyText() || hasNodes(emptySlot))
    this.guard.toggle(this.emptyRoot?.nativeElement, hasEmpty)
    this.guard.toggle(this.listRoot?.nativeElement, !hasEmpty)
  }
}
