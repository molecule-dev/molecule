/**
 * MessageMeta component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { isTemplate, textOf } from './nodes.js'

/**
 * MessageMeta component.
 *
 * Small `[author · timestamp]` row rendered above a message body. The host IS
 * the outer `<div>` (`div[mol-message-meta]`), matching React's root exactly.
 * Each node-valued field is either projected content (`[slot=author]`,
 * `[slot=timestamp]`), an `ng-template` input, or plain text.
 */
@Component({
  selector: 'div[mol-message-meta]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['author', 'timestamp', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<span [class]="cm().fontWeight('semibold')">@if (authorTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else {{{ textOf(author) }}}<ng-content select="[slot=author]"></ng-content></span><span>@if (timestampTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else {{{ textOf(timestamp) }}}<ng-content select="[slot=timestamp]"></ng-content></span>`,
})
export class MessageMeta {
  /** Author display name: text, an `ng-template`, or projected `[slot=author]` content. */
  author?: TemplateRef<unknown> | string | null
  /** Timestamp display: text, an `ng-template`, or projected `[slot=timestamp]` content. */
  timestamp?: TemplateRef<unknown> | string | null
  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The row's class list (React's `cm.cn(cm.flex({…}), cm.textSize('xs'), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'baseline', gap: 'sm' }),
      this.cm().textSize('xs'),
      this.className,
    )
  }

  /**
   * The author as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  authorTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.author) ? this.author : null
  }

  /**
   * The timestamp as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  timestampTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.timestamp) ? this.timestamp : null
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   * @param value - The field value.
   * @returns The text, or `''` for a template.
   */
  textOf(value: unknown): string {
    return isTemplate(value) ? '' : textOf(value)
  }
}
