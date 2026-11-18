/**
 * ChatbotTesterInput component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ChatbotTesterInputProps } from './types.js'

/**
 * ChatbotTesterInput component.
 *
 * Composer row with a send button: Enter sends, Shift+Enter inserts a newline,
 * and the controlled textarea keeps its prop value after every edit — React's
 * controlled-input restore. The host IS the composer row (`div[mol-chatbot-tester-input]`),
 * matching React's root exactly.
 */
@Component({
  selector: 'div[mol-chatbot-tester-input]',
  standalone: true,
  inputs: ['value', 'onChange', 'onSend', 'loading', 'placeholder', 'sendLabel'],
  host: {
    '[class]': 'classes()',
  },
  template: `<textarea
      rows="1"
      [attr.placeholder]="placeholderOf()"
      [attr.disabled]="loading ? '' : null"
      [class]="fieldClasses()"
      [value]="valueText()"
      (input)="handleInput($event)"
      (keydown)="handleKeydown($event)"
    ></textarea>
    <button
      type="button"
      data-mol-id="chatbot-tester-send"
      [attr.disabled]="sendDisabled() ? '' : null"
      [class]="buttonClasses()"
      (click)="callSend($event)"
    >
      {{ sendLabelOf() }}
    </button>`,
})
export class ChatbotTesterInput {
  /** The composer's current text (controlled). */
  value = ''
  /** Called with the field's new text on every edit. */
  onChange?: ChatbotTesterInputProps['onChange']
  /** Called when the user presses Enter (without Shift) or clicks send. */
  onSend?: ChatbotTesterInputProps['onSend']
  /** A reply is in flight: the field and the send button are disabled. */
  loading?: boolean
  /** Placeholder text — an explicit value overrides `t('chatbotTester.placeholder.message')` (`'Type a message…'`). */
  placeholder?: string
  /** Send button label — an explicit value overrides `t('chatbotTester.label.send')` (`'Send'`). */
  sendLabel?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The composer row's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'end', gap: 2 }),
      this.cm().sp('px', 6),
      this.cm().sp('py', 4),
      this.cm().chatbotTesterInputRow,
    )
  }

  /**
   * The textarea's class list.
   * @returns The class string.
   */
  fieldClasses(): string {
    return this.cm().cn(
      this.cm().flex1,
      this.cm().sp('px', 4),
      this.cm().sp('py', 2),
      this.cm().textSize('sm'),
      this.cm().surface,
      this.cm().chatbotTesterInputField,
    )
  }

  /**
   * The send button's class list.
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().cn(
      this.cm().button({ variant: 'solid', color: 'primary', size: 'sm' }),
      this.cm().touchTargetCompact,
    )
  }

  /**
   * The composer's text (React's `value`, an empty string when unset).
   * @returns The text.
   */
  valueText(): string {
    return this.value ?? ''
  }

  /**
   * The placeholder text (React's default parameter reads at render time,
   * through `t()`).
   * @returns The placeholder.
   */
  placeholderOf(): string {
    return this.placeholder === undefined
      ? this.i18n.t('chatbotTester.placeholder.message', undefined, {
          defaultValue: 'Type a message…',
        })
      : this.placeholder
  }

  /**
   * The send label (React's default parameter reads at render time, through
   * `t()`).
   * @returns The label.
   */
  sendLabelOf(): string {
    return this.sendLabel === undefined
      ? this.i18n.t('chatbotTester.label.send', undefined, { defaultValue: 'Send' })
      : this.sendLabel
  }

  /**
   * Whether the send action is disabled (React's `loading || !value.trim()`).
   * @returns True when disabled.
   */
  sendDisabled(): boolean {
    return Boolean(this.loading) || !this.valueText().trim()
  }

  /**
   * Reports the edit, then restores the controlled value exactly as react-dom
   * does after a controlled input's change event.
   * @param event - The native input event.
   */
  handleInput(event: Event): void {
    const field = event.target as HTMLTextAreaElement
    this.onChange?.(field.value)
    const text = this.valueText()
    if (field.value !== text) field.value = text
  }

  /**
   * Enter sends; Shift+Enter is left to the browser (a newline).
   * @param event - The native keydown event.
   */
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      this.onSend?.()
    }
  }

  /**
   * Calls `onSend` with the click event, as React's DOM handler does.
   * @param event - The native click event.
   */
  callSend(event: MouseEvent): void {
    ;(this.onSend as ((event?: MouseEvent) => void) | undefined)?.(event)
  }
}
