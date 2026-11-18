/**
 * MessageAttachments component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasText, isTemplate, textOf } from './nodes.js'
import type { MessageAttachment } from './types.js'

/**
 * MessageAttachments component.
 *
 * Vertical list of attachment rows below a message body — each row
 * `[icon] [name · size] [action]`. The host IS the outer `<div>`
 * (`div[mol-message-attachments]`), matching React's root exactly. An
 * attachment's `icon` and `action` are `ng-template` references or text.
 */
@Component({
  selector: 'div[mol-message-attachments]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['attachments', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@for (attachment of attachments; track attachment.id) {<div [class]="rowClasses()">@if (iconTemplate(attachment); as iconTpl) {<ng-container [ngTemplateOutlet]="iconTpl" />}@else if (hasText(attachment.icon)) {{{ textOf(attachment.icon) }}}<span [class]="nameClasses()"><span [class]="nameTextClasses()">{{ attachment.name }}</span>@if (attachment.size) {<span [class]="sizeClasses()">{{ attachment.size }}</span>}</span>@if (actionTemplate(attachment); as actionTpl) {<ng-container [ngTemplateOutlet]="actionTpl" />}@else if (hasText(attachment.action)) {{{ textOf(attachment.action) }}}</div>}`,
})
export class MessageAttachments {
  /** The attachments to render, in order. */
  attachments: MessageAttachment[] = []
  /** Extra classes on the outer wrapper. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper's class list (React's `cm.cn(cm.stack(1), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(1), this.className)
  }

  /**
   * One row's class list (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The name/size column's class list (React's `cm.cn(cm.flex1, cm.textSize('sm'))`).
   * @returns The class string.
   */
  nameClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().textSize('sm'))
  }

  /**
   * The name's class (React's `cm.fontWeight('medium')`).
   * @returns The class string.
   */
  nameTextClasses(): string {
    return this.cm().fontWeight('medium')
  }

  /**
   * The size label's class (React's `cm.sp('ml', 2)`).
   * @returns The class string.
   */
  sizeClasses(): string {
    return this.cm().sp('ml', 2)
  }

  /**
   * An attachment's icon as a template, when it carries a node.
   * @param attachment - The attachment.
   * @returns The template, or null.
   */
  iconTemplate(attachment: MessageAttachment): TemplateRef<unknown> | null {
    return isTemplate(attachment.icon) ? attachment.icon : null
  }

  /**
   * An attachment's action as a template, when it carries a node.
   * @param attachment - The attachment.
   * @returns The template, or null.
   */
  actionTemplate(attachment: MessageAttachment): TemplateRef<unknown> | null {
    return isTemplate(attachment.action) ? attachment.action : null
  }

  /**
   * Whether a field renders plain text.
   * @param value - The field value.
   * @returns True when the value is text.
   */
  hasText(value: unknown): boolean {
    return hasText(value)
  }

  /**
   * The text a field renders.
   * @param value - The field value.
   * @returns The text, or `''` for a template.
   */
  textOf(value: unknown): string {
    return textOf(value)
  }
}
