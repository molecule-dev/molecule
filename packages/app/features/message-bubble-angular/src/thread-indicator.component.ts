/**
 * ThreadIndicator component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, type TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasText, isTemplate, textOf } from './nodes.js'

/**
 * ThreadIndicator component.
 *
 * `"3 replies · last Monday"` button rendered below a message bubble. The host
 * IS the `<button>` (`button[mol-thread-indicator]`), matching React's root
 * exactly. `lastReplyAt` is text, an `ng-template`, or projected
 * `[slot=lastReplyAt]` content; React renders its `· ` separator span only when
 * the value is truthy, so an always-mounted capture point renders its content
 * in its own place and leaves the page, and the separator span is detached
 * when nothing renders.
 */
@Component({
  selector: 'button[mol-thread-indicator]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet],
  inputs: ['replyCount', 'lastReplyAt', 'onOpen', 'className'],
  host: {
    type: 'button',
    '[class]': 'classes()',
    '(click)': 'open($event)',
  },
  // prettier-ignore
  template: `<span [class]="cm().fontWeight('semibold')">{{ replies() }}</span><span #lastReply>{{ '· ' }}@if (lastReplyTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (hasText(lastReplyAt)) {{{ textOf(lastReplyAt) }}}<span #lastProjected><ng-content select="[slot=lastReplyAt]"></ng-content></span></span>`,
})
export class ThreadIndicator {
  /** Number of replies. */
  replyCount = 0
  /** Last-reply timestamp display: text, an `ng-template`, or projected content. */
  lastReplyAt?: TemplateRef<unknown> | string | null
  /** Called when clicked (React's `onOpen`). */
  onOpen?: (event: Event) => void
  /** Extra classes. */
  className?: string

  /** The separator span (detached when React would not render it). */
  @ViewChild('lastReply') private lastReply?: ElementRef<HTMLElement>
  /** The `[slot=lastReplyAt]` capture point. */
  @ViewChild('lastProjected') private lastProjected?: ElementRef<HTMLElement>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the label on a locale switch.
   */
  private readonly i18n = useTranslation()

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
   * The button's class list (React's `cm.cn(...)` chain).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs' }),
      this.cm().textSize('xs'),
      this.cm().link,
      this.className,
    )
  }

  /**
   * The pluralized reply label (React's `t('thread.replies', { count }, { count, … })`).
   * @returns The label text.
   */
  replies(): string {
    return this.i18n.t(
      'thread.replies',
      { count: this.replyCount },
      {
        count: this.replyCount,
        defaultValue: '{{count}} replies',
        defaultValue_one: '{{count}} reply',
      },
    )
  }

  /**
   * The `lastReplyAt` template, when the caller passed a node.
   * @returns The template, or null.
   */
  lastReplyTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.lastReplyAt) ? this.lastReplyAt : null
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
   * Reports the click (React's `onClick={onOpen}` passes the event).
   * @param event - The click event.
   */
  open(event: Event): void {
    this.onOpen?.(event)
  }

  /**
   * Applies React's `lastReplyAt && <span>…</span>` condition.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const span = this.lastReply?.nativeElement
    const projected = this.lastProjected?.nativeElement
    const shows = isTemplate(this.lastReplyAt) || hasText(this.lastReplyAt) || hasContent(projected)
    // The capture's content renders exactly where the capture stood, and the capture
    // itself leaves the page.
    placeContentBefore(projected, projected)
    setElementPresent(projected, false)
    setElementPresent(span, shows)
  }
}
