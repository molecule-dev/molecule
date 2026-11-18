/**
 * MessageComposer component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, signal, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Textarea } from '@molecule/app-ui-angular'

import { hasText, isTemplate, textOf } from './nodes.js'

/**
 * MessageComposer component.
 *
 * Message input row — text area + optional leading/trailing slots + submit
 * button. The host IS the outer `<div>` (`div[mol-message-composer]`), matching
 * React's root exactly. The composer submits on the Send button or
 * Ctrl/Cmd+Enter (`submitOnEnter`), NOT plain Enter; it trims and clears on
 * submit and blocks empty sends. `leading` and `trailing` are text,
 * `ng-template`s, or projected `[slot=leading]` / `[slot=trailing]` content.
 */
@Component({
  selector: 'div[mol-message-composer]',
  standalone: true,
  imports: [NgTemplateOutlet, Button, Textarea],
  inputs: [
    'onSubmit',
    'placeholder',
    'submitOnEnter',
    'leading',
    'trailing',
    'disabled',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@if (leadingTemplate(); as leadTpl) {<ng-container [ngTemplateOutlet]="leadTpl" />}@else if (hasText(leading)) {{{ textOf(leading) }}}<ng-content select="[slot=leading]"></ng-content><div mol-textarea [className]="cm().flex1" [value]="value()" (change)="onInput($event)" [placeholder]="placeholderText()" [disabled]="!!disabled" (keydown)="onKey($event)"></div>@if (trailingTemplate(); as trailTpl) {<ng-container [ngTemplateOutlet]="trailTpl" />}@else if (hasText(trailing)) {{{ textOf(trailing) }}}<ng-content select="[slot=trailing]"></ng-content><button mol-button type="button" (click)="submit()" [disabled]="disabled || !value().trim()">{{ sendText() }}</button>`,
})
export class MessageComposer {
  /** Called when the user submits (React's `onSubmit`). */
  onSubmit?: (value: string) => void
  /** Optional placeholder. */
  placeholder?: string
  /** Whether Ctrl/Cmd-Enter submits (React's default `true`, applied at read time). */
  submitOnEnter?: boolean
  /** Optional leading slot: text, an `ng-template`, or projected content. */
  leading?: TemplateRef<unknown> | string | null
  /** Optional trailing slot: text, an `ng-template`, or projected content. */
  trailing?: TemplateRef<unknown> | string | null
  /** Disable input + submit. */
  disabled?: boolean
  /** Extra classes. */
  className?: string

  /** The composer's own draft (React's `useState`). */
  protected readonly value = signal('')

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The row's class list (React's `cm.cn(cm.flex({…}), cm.sp('p', 2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'end', gap: 'sm' }),
      this.cm().sp('p', 2),
      this.className,
    )
  }

  /**
   * The textarea's placeholder (React's `placeholder ?? t('composer.placeholder')`).
   * @returns The placeholder text.
   */
  placeholderText(): string {
    return (
      this.placeholder ??
      this.i18n.t('composer.placeholder', {}, { defaultValue: 'Write a message…' })
    )
  }

  /**
   * The Send button's label (React's `t('composer.send')`).
   * @returns The label text.
   */
  sendText(): string {
    return this.i18n.t('composer.send', {}, { defaultValue: 'Send' })
  }

  /**
   * The leading slot as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  leadingTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.leading) ? this.leading : null
  }

  /**
   * The trailing slot as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  trailingTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.trailing) ? this.trailing : null
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
   * Adopts the typed draft (React's controlled `onChange`).
   * @param event - The native input event.
   */
  onInput(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value)
  }

  /**
   * Submits on Ctrl/Cmd+Enter when `submitOnEnter` allows it, as React does.
   * @param event - The keyboard event.
   */
  onKey(event: KeyboardEvent): void {
    if ((this.submitOnEnter ?? true) && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      this.submit()
    }
  }

  /** Trims the current value and calls onSubmit, then resets the textarea. */
  submit(): void {
    const current = this.value().trim()
    if (!current) return
    this.onSubmit?.(current)
    this.value.set('')
  }
}
