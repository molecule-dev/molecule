/**
 * JoinCode component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnInit,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { JoinCodeAlphabet, JoinCodeProps } from './types.js'
import { isValidChar, sanitizeInput } from './utils.js'

const DEFAULT_LENGTH = 6

/**
 * Multi-slot join-code input.
 *
 * Renders one single-character `<input>` per slot with auto-advance focus,
 * backspace-to-previous, and paste-to-fill behaviour. The host IS the outer
 * `<div>` (`div[mol-join-code]`), matching React's root exactly.
 *
 * - **Controlled** when `value` is provided; the parent must update it via
 *   `onChange`. The displayed code is clamped to `length` characters.
 * - **Uncontrolled** otherwise; `defaultValue` seeds the initial state.
 *
 * Calls `onComplete(code)` once the code reaches `length` characters and every
 * character matches `alphabet`. The fire is suppressed while `autoSubmit`
 * is `false`.
 *
 * Each slot's text is written the way react-dom writes a controlled field —
 * through both the `value` attribute and the live property — so the DOM reads
 * exactly as React's does, and text is read through the binding's reactive
 * `useTranslation()`, so a locale switch re-renders it.
 */
@Component({
  selector: 'div[mol-join-code]',
  standalone: true,
  inputs: [
    'length',
    'value',
    'defaultValue',
    'onChange',
    'onComplete',
    'autoSubmit',
    'alphabet',
    'disabled',
    'className',
  ],
  host: {
    role: 'group',
    '[attr.aria-label]': 'label()',
    '[class]': 'classes()',
  },
  template: `@for (index of slotIndexes(); track index) {
    <input
      type="text"
      [attr.inputmode]="inputMode()"
      autocomplete="one-time-code"
      maxlength="1"
      [attr.value]="slotValue(index)"
      [attr.disabled]="disabled ? '' : null"
      [attr.aria-label]="slotLabel(index)"
      [attr.data-mol-id]="slotId(index)"
      (input)="handleChange(index, $event)"
      (keydown)="handleKeyDown(index, $event)"
      (paste)="handlePaste(index, $event)"
      (focus)="handleFocus($event)"
      [class]="inputClasses()"
      [style.width]="'3rem'"
    />
  }`,
})
export class JoinCode implements OnInit, DoCheck, AfterViewChecked {
  /** Number of slots / characters in the code (defaults to `6` at read time). */
  length?: number
  /** Controlled value (React's `value` input); omitting it makes the field uncontrolled. */
  value?: string
  /** Initial value when uncontrolled; ignored once `value` is set. */
  defaultValue?: string
  /** Called with the whole current code whenever it changes (React's `onChange`). */
  onChange?: JoinCodeProps['onChange']
  /** Called once per full-and-valid code (React's `onComplete`). */
  onComplete?: JoinCodeProps['onComplete']
  /** Whether a full code notifies automatically (defaults to `true` at read time). */
  autoSubmit?: boolean
  /** Allowed character set (defaults to `'alphanumeric'` at read time). */
  alphabet?: JoinCodeAlphabet
  /** Whether every slot is disabled. */
  disabled?: boolean
  /** Extra classes on the outer wrapper (the host element). */
  className?: string

  /** The host element (React's root `<div>`). */
  private readonly el = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale notifications, so the view re-renders the labels on a switch.
   */
  private readonly i18n = useTranslation()

  /** Uncontrolled state (React's `useState` value). */
  private internalValue = ''

  /** The last full-and-valid code `onComplete` fired for (React's `completedForRef`). */
  private completedFor: string | null = null

  /**
   * Seeds the uncontrolled state from `defaultValue`, once, as React's lazy
   * `useState` initializer does.
   */
  ngOnInit(): void {
    this.internalValue = sanitizeInput(this.defaultValue ?? '', this.alphabetOf()).slice(
      0,
      this.slotCount(),
    )
  }

  /**
   * Writes each slot's text through the live property as well as the bound
   * attribute: react-dom restores a controlled field after every input event,
   * and a binding that did not change writes no attribute.
   */
  ngDoCheck(): void {
    const inputs = this.slotInputs()
    inputs.forEach((input, index) => {
      const text = this.slotValue(index)
      if (input.value !== text) input.value = text
      if (input.getAttribute('value') !== text) input.setAttribute('value', text)
    })
  }

  /**
   * Fires `onComplete` after the view has been checked, which is where React's
   * `useEffect` runs. The `completedFor` guard makes repeated passes no-ops.
   */
  ngAfterViewChecked(): void {
    this.checkComplete()
  }

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The outer wrapper's class list (React's `cm.cn(cm.flex({ align: 'center',
   * gap: 'sm' }), className)`).
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.className)
  }

  /**
   * The slot inputs' shared class list (React's `cm.cn(cm.input({ size: 'lg' }),
   * cm.textCenter, cm.fontWeight('bold'), cm.textSize('2xl'))`).
   *
   * @returns The class string.
   */
  inputClasses(): string {
    return this.cm().cn(
      this.cm().input({ size: 'lg' }),
      this.cm().textCenter,
      this.cm().fontWeight('bold'),
      this.cm().textSize('2xl'),
    )
  }

  /**
   * The group's accessible name (React's `t('joinCode.label')`).
   *
   * @returns The label text.
   */
  label(): string {
    return this.i18n.t('joinCode.label', undefined, { defaultValue: 'Join code' })
  }

  /**
   * One slot's accessible name (React's `t('joinCode.slotAriaLabel')`).
   *
   * @param index - Slot index.
   * @returns The label text.
   */
  slotLabel(index: number): string {
    return this.i18n.t(
      'joinCode.slotAriaLabel',
      { position: index + 1 },
      { defaultValue: 'Join code character {{position}}' },
    )
  }

  /**
   * One slot's `data-mol-id`.
   *
   * @param index - Slot index.
   * @returns The attribute value.
   */
  slotId(index: number): string {
    return `join-code-slot-${index}`
  }

  /**
   * The configured slot count (React's `length = DEFAULT_LENGTH` default).
   *
   * @returns The slot count.
   */
  slotCount(): number {
    return this.length ?? DEFAULT_LENGTH
  }

  /**
   * The allowed character set (React's `alphabet = 'alphanumeric'` default).
   *
   * @returns The alphabet name.
   */
  alphabetOf(): JoinCodeAlphabet {
    return this.alphabet ?? 'alphanumeric'
  }

  /**
   * Whether a full code notifies automatically (React's `autoSubmit = true`
   * default).
   *
   * @returns `true` when `onComplete` fires on completion.
   */
  autoSubmits(): boolean {
    return this.autoSubmit ?? true
  }

  /**
   * Whether the parent owns the value (React's `value !== undefined`).
   *
   * @returns `true` for controlled mode.
   */
  isControlled(): boolean {
    return this.value !== undefined
  }

  /**
   * The code the slots display: sanitized and clamped, as React's `useMemo`
   * computes it.
   *
   * @returns The displayed code.
   */
  currentValue(): string {
    const raw = this.isControlled() ? (this.value ?? '') : this.internalValue
    return sanitizeInput(raw, this.alphabetOf()).slice(0, this.slotCount())
  }

  /**
   * The text one slot shows.
   *
   * @param index - Slot index.
   * @returns The slot's character, or an empty string.
   */
  slotValue(index: number): string {
    return this.currentValue()[index] ?? ''
  }

  /**
   * The slot indices the template renders.
   *
   * @returns The indices, in order.
   */
  slotIndexes(): number[] {
    return Array.from({ length: this.slotCount() }, (_, index) => index)
  }

  /**
   * The `inputmode` every slot carries (React's `alphabet === 'numeric'`).
   *
   * @returns `'numeric'` or `'text'`.
   */
  inputMode(): string {
    return this.alphabetOf() === 'numeric' ? 'numeric' : 'text'
  }

  /**
   * The live slot inputs, in DOM order.
   *
   * @returns The slot inputs.
   */
  slotInputs(): HTMLInputElement[] {
    return Array.from((this.el.nativeElement as HTMLElement).querySelectorAll('input'))
  }

  /**
   * The code the slots display once `next` has been committed — React's
   * post-render value (a controlled parent may not have re-rendered yet).
   *
   * @param next - The code just committed.
   * @returns The displayed code after the commit.
   */
  renderedAfterCommit(next: string): string {
    return this.isControlled()
      ? sanitizeInput(this.value ?? '', this.alphabetOf()).slice(0, this.slotCount())
      : next
  }

  /**
   * Write one slot's text into its input the way react-dom restores a
   * controlled field: through the live property and the `value` attribute.
   *
   * @param index - Slot index.
   * @param next - The code just committed.
   */
  syncSlot(index: number, next: string): void {
    const input = this.slotInputs()[index]
    if (!input) return
    const text = this.renderedAfterCommit(next)[index] ?? ''
    if (input.value !== text) input.value = text
    if (input.getAttribute('value') !== text) input.setAttribute('value', text)
  }

  /**
   * Move keyboard focus to the input at the given index, if any.
   *
   * @param index - Slot index.
   */
  focusSlot(index: number): void {
    const target = this.slotInputs()[index]
    if (target) {
      target.focus()
      target.select?.()
    }
  }

  /**
   * Commit a new code value to controlled/uncontrolled state and notify the
   * parent.
   *
   * @param next - Sanitized, length-clamped code to commit.
   */
  commit(next: string): void {
    if (!this.isControlled()) this.internalValue = next
    this.onChange?.(next)
  }

  /**
   * Fire `onComplete` once per full-and-valid code (React's `useEffect`: no
   * reset when `autoSubmit` is off or a character is invalid, and no second
   * fire for the code already notified).
   */
  checkComplete(): void {
    if (!this.autoSubmits()) return
    const code = this.currentValue()
    if (code.length !== this.slotCount()) {
      this.completedFor = null
      return
    }
    if (!Array.from(code).every((character) => isValidChar(character, this.alphabetOf()))) return
    if (this.completedFor === code) return
    this.completedFor = code
    this.onComplete?.(code)
  }

  /**
   * Handle a single-slot change event. Any multi-character value is treated as
   * a paste-style fill starting at this slot.
   *
   * @param index - The slot that fired the change.
   * @param event - The native input event.
   */
  handleChange(index: number, event: Event): void {
    const incoming = sanitizeInput((event.target as HTMLInputElement).value, this.alphabetOf())
    const before = this.currentValue().slice(0, index)
    const after = this.currentValue().slice(index + 1)
    const next = (before + incoming + after).slice(0, this.slotCount())
    this.commit(next)
    this.syncSlot(index, next)
    // Move focus forward to the slot after the last character we wrote.
    const advanceTo = Math.min(before.length + incoming.length, this.slotCount() - 1)
    if (incoming.length > 0) this.focusSlot(advanceTo)
  }

  /**
   * Handle keyboard navigation: backspace on an empty slot focuses the
   * previous one; arrow-left / arrow-right move focus.
   *
   * @param index - Slot index.
   * @param event - The native keyboard event.
   */
  handleKeyDown(index: number, event: KeyboardEvent): void {
    const current = this.currentValue()
    if (event.key === 'Backspace') {
      if ((current[index] ?? '') === '' && index > 0) {
        // Empty slot — clear previous and move back.
        event.preventDefault()
        this.commit((current.slice(0, index - 1) + current.slice(index)).slice(0, this.slotCount()))
        this.focusSlot(index - 1)
      }
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      this.focusSlot(index - 1)
    } else if (event.key === 'ArrowRight' && index < this.slotCount() - 1) {
      event.preventDefault()
      this.focusSlot(index + 1)
    }
  }

  /**
   * Handle paste into any slot — sanitize and fill from the current slot
   * forward.
   *
   * @param index - The slot that received the paste.
   * @param event - The native clipboard event.
   */
  handlePaste(index: number, event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? ''
    if (!text) return
    event.preventDefault()
    const incoming = sanitizeInput(text, this.alphabetOf())
    const before = this.currentValue().slice(0, index)
    const next = (before + incoming).slice(0, this.slotCount())
    this.commit(next)
    this.syncSlot(index, next)
    const advanceTo = Math.min(before.length + incoming.length, this.slotCount() - 1)
    this.focusSlot(advanceTo)
  }

  /**
   * Select the focused slot's character, as React's `onFocus` does.
   *
   * @param event - The native focus event.
   */
  handleFocus(event: Event): void {
    ;(event.target as HTMLInputElement).select?.()
  }
}
