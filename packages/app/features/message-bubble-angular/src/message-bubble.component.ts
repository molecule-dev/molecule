/**
 * MessageBubble component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-angular'

import { MessageMeta } from './message-meta.component.js'
import { hasNode, isTemplate, textOf } from './nodes.js'
import type { MessageData } from './types.js'

/**
 * MessageBubble component.
 *
 * One message in a chat thread — avatar, author/timestamp row, body, plus
 * optional attachments/reactions/thread nodes from `message.attachments` /
 * `message.reactions` / `message.thread`. The host IS the `<article>`
 * (`article[mol-message-bubble]`), matching React's root exactly. `isSelf`
 * flips the row direction only — no bubble background/tint is applied. A
 * node-valued message field is an `ng-template`; text renders as text.
 */
@Component({
  selector: 'article[mol-message-bubble]',
  standalone: true,
  imports: [NgTemplateOutlet, Avatar, MessageMeta],
  inputs: ['message', 'isSelf', 'showMeta', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="leadingClasses()"><div mol-avatar [src]="message.author.avatarSrc" [alt]="message.author.name" [name]="message.author.name" [size]="avatarSize()"></div></div><div [class]="bodyColumnClasses()">@if (showsMeta()) {<div mol-message-meta [author]="message.author.name" [timestamp]="message.timestamp"></div>}<div [class]="bodyClasses()">@if (fieldTemplate(message.body); as bodyTpl) {<ng-container [ngTemplateOutlet]="bodyTpl" />}@else if (hasNode(message.body)) {{{ fieldText(message.body) }}}</div>@if (message.attachments) {<div [class]="attachmentClasses()">@if (fieldTemplate(message.attachments); as attachmentsTpl) {<ng-container [ngTemplateOutlet]="attachmentsTpl" />}@else if (hasNode(message.attachments)) {{{ fieldText(message.attachments) }}}</div>}@if (message.reactions) {<div [class]="attachmentClasses()">@if (fieldTemplate(message.reactions); as reactionsTpl) {<ng-container [ngTemplateOutlet]="reactionsTpl" />}@else if (hasNode(message.reactions)) {{{ fieldText(message.reactions) }}}</div>}@if (message.thread) {<div [class]="attachmentClasses()">@if (fieldTemplate(message.thread); as threadTpl) {<ng-container [ngTemplateOutlet]="threadTpl" />}@else if (hasNode(message.thread)) {{{ fieldText(message.thread) }}}</div>}</div>`,
})
export class MessageBubble {
  /** The message to render (required, as in React's props). */
  message!: MessageData
  /** Whether the current viewer is the message author (affects alignment). */
  isSelf?: boolean
  /** Render the author row (avatar + name + time). Defaults to true. */
  showMeta?: boolean
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
   * The row's class list (React's `cm.cn(cm.flex({…}), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({
        align: 'start',
        gap: 'sm',
        direction: this.isSelf ? 'row-reverse' : 'row',
      }),
      this.className,
    )
  }

  /**
   * The leading avatar column's class (`cm.shrink0`).
   * @returns The class string.
   */
  leadingClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The body column's class list (`cm.cn(cm.flex1, cm.stack(1))`).
   * @returns The class string.
   */
  bodyColumnClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1))
  }

  /**
   * The body block's class list (`cm.cn(cm.sp('p', 3))`).
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().sp('p', 3))
  }

  /**
   * One optional row's class (`cm.sp('mt', 1)`).
   * @returns The class string.
   */
  attachmentClasses(): string {
    return this.cm().sp('mt', 1)
  }

  /**
   * The avatar size React passes (`size="sm"`).
   * @returns The size preset.
   */
  avatarSize(): 'sm' {
    return 'sm'
  }

  /**
   * Whether the author row renders (React's `showMeta` default `true`).
   * @returns True when the meta row shows.
   */
  showsMeta(): boolean {
    return this.showMeta ?? true
  }

  /**
   * A message field as a template, when it carries a node.
   * @param value - The field value.
   * @returns The template, or null.
   */
  fieldTemplate(value: unknown): TemplateRef<unknown> | null {
    return isTemplate(value) ? value : null
  }

  /**
   * Whether a field renders anything at all.
   * @param value - The field value.
   * @returns True when React renders the field.
   */
  hasNode(value: unknown): boolean {
    return hasNode(value)
  }

  /**
   * The text a field renders.
   * @param value - The field value.
   * @returns The text, or `''` for a template.
   */
  fieldText(value: unknown): string {
    return isTemplate(value) ? '' : textOf(value)
  }
}
