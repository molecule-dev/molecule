/**
 * MessageList component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { MessageBubble } from './message-bubble.component.js'
import { hasNodes, hasText, isTemplate, SlotGuard, textOf } from './nodes.js'
import type { MessageData } from './types.js'

/**
 * MessageList component.
 *
 * Vertical list of `<article mol-message-bubble>`s with optional date
 * separators. React's root is the `<div>` when it has messages and the bare
 * `emptyState` when the list is empty, so the host is unwrapped
 * (`data-parity-unwrap`, `display: contents`) and the `<div>` is rendered inside
 * it; the empty state and the list are reconciled against React's branch. The
 * empty state is text, an `ng-template`, or projected `[slot=emptyState]`
 * content; a date separator is an `ng-template` receiving the message as
 * `$implicit` / `a0` and its index as `a1`.
 */
@Component({
  selector: 'mol-message-list',
  standalone: true,
  imports: [NgTemplateOutlet, MessageBubble],
  inputs: ['messages', 'selfAuthorId', 'renderDateSeparator', 'emptyState', 'className'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `<span #empty data-parity-unwrap style="display: contents">@if (emptyTemplate(); as emptyTpl) {<ng-container [ngTemplateOutlet]="emptyTpl" />}@else if (hasText(emptyState)) {{{ textOf(emptyState) }}}<ng-content select="[slot=emptyState]"></ng-content></span><div #list [class]="listClasses()">@for (message of messages; track message.id) {<div [class]="rowClasses()">@if (separatorTemplate(); as separatorTpl) {<ng-container [ngTemplateOutlet]="separatorTpl" [ngTemplateOutletContext]="separatorContext(message, $index)" />}<article mol-message-bubble [message]="message" [isSelf]="message.author.id === selfAuthorId"></article></div>}</div>`,
})
export class MessageList implements AfterViewInit, AfterViewChecked, DoCheck {
  /** The messages to render, in order. */
  messages: MessageData[] = []
  /** When provided, viewer-authored messages flip alignment to the right. */
  selfAuthorId?: string
  /** Optional date separator renderer (React's render prop), as an `ng-template`. */
  renderDateSeparator?: TemplateRef<unknown> | null
  /** Empty-state content when `messages` is empty: text, an `ng-template`, or projected content. */
  emptyState?: TemplateRef<unknown> | string | null
  /** Extra classes. */
  className?: string

  /** The projected empty-state capture point. */
  @ViewChild('empty') private empty?: ElementRef<HTMLElement>
  /** The feed wrapper (detached while the empty state renders instead). */
  @ViewChild('list') private list?: ElementRef<HTMLElement>

  private readonly guard = new SlotGuard(inject(ElementRef), inject(Renderer2))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper's class list (React's `cm.cn(cm.stack(3), className)`).
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(this.cm().stack(3), this.className)
  }

  /**
   * One row's class (`cm.stack(2)`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().stack(2)
  }

  /**
   * The empty state as a template input, when one was passed.
   * @returns The template, or null.
   */
  emptyTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.emptyState) ? this.emptyState : null
  }

  /**
   * The date separator template, when one was passed.
   * @returns The template, or null.
   */
  separatorTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.renderDateSeparator) ? this.renderDateSeparator : null
  }

  /**
   * The context a separator template receives: the message as `$implicit` / `a0`
   * and its index as `a1` (React's `renderDateSeparator(message, i)`).
   *
   * @param message - The row's message.
   * @param index - The row's index.
   * @returns The template context.
   */
  separatorContext(message: MessageData, index: number): Record<string, unknown> {
    return { $implicit: message, a0: message, a1: index, a2: undefined }
  }

  /**
   * Whether a value renders plain text.
   * @param value - The value.
   * @returns True when it is text.
   */
  hasText(value: unknown): boolean {
    return hasText(value)
  }

  /**
   * The text a value renders.
   * @param value - The value.
   * @returns The text, or `''` for a template.
   */
  textOf(value: unknown): string {
    return isTemplate(value) ? '' : textOf(value)
  }

  /**
   * Reconciles the projected empty state and the list wrapper against React's
   * branch once the view queries resolve.
   */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles on later passes, so a props step that empties or refills the
   * list swaps the branch the way React does.
   */
  ngDoCheck(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles after each view update: a node-valued empty state renders into
   * its outlet only during the update, so the branch decision must be read
   * afterwards.
   */
  ngAfterViewChecked(): void {
    this.reconcile()
  }

  /**
   * Applies React's condition: with no messages and an empty state, the empty
   * state renders bare and the list wrapper disappears; otherwise the wrapper
   * renders and the empty state is dropped.
   */
  private reconcile(): void {
    const empty = this.empty?.nativeElement
    const list = this.list?.nativeElement
    const hasEmpty =
      (this.messages?.length ?? 0) === 0 &&
      (isTemplate(this.emptyState) || hasText(this.emptyState) || hasNodes(empty))
    this.guard.toggle(empty, hasEmpty)
    this.guard.toggle(list, !hasEmpty)
  }
}
