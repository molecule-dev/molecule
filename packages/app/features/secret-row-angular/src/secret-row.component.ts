/**
 * SecretRow component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type OnDestroy, TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import type { SecretRowData } from './types.js'

/**
 * SecretRow component.
 *
 * Secret / credential row for vault UIs. Masked by default; the user toggles
 * reveal, can copy to clipboard, sees an "Expired" tag when
 * `daysUntilRotation` is negative or a "Rotate in {n}d" countdown when it is
 * zero/positive, and a "Last rotated {value}" note when `lastRotatedAt` is
 * set. The Rotate / Delete buttons render only when their handler is passed.
 * The host IS the root `<div>` (`div[mol-secret-row]`), matching React's root
 * exactly. Node-valued `secret` fields are `ng-template` references rendered
 * through `NgTemplateOutlet`; string / number fields render as text.
 *
 * The template's whitespace is semantic: Angular removes whitespace-only text
 * nodes between elements, so the markup is glued where React renders adjacent
 * inline nodes (the `v` before the version and the space before the
 * last-rotated value are explicit interpolations).
 */
@Component({
  selector: 'div[mol-secret-row]',
  standalone: true,
  imports: [Button, NgTemplateOutlet],
  inputs: ['secret', 'onRotate', 'onDelete', 'maskChar', 'className'],
  host: { '[class]': 'classes()' },
  // prettier-ignore
  template: `<div [class]="stackClasses()"><span [class]="keyClass()">{{ secret.key }}</span>@if (secret.description) {<span [class]="descriptionClass()">@if (isNode(secret.description)) {<ng-container [ngTemplateOutlet]="secret.description" />}@else {<ng-container>{{ textOf(secret.description) }}</ng-container>}</span>}@else {<ng-container>{{ textOf(secret.description) }}</ng-container>}</div><code [class]="codeClass()">{{ revealed ? secret.value : masked() }}</code>@if (secret.version) {<span [class]="chipClass()">{{ 'v' }}@if (isNode(secret.version)) {<ng-container [ngTemplateOutlet]="secret.version" />}@else {<ng-container>{{ textOf(secret.version) }}</ng-container>}</span>}@else {<ng-container>{{ textOf(secret.version) }}</ng-container>}@if (expired()) {<span [class]="expiredClass()">{{ expiredText() }}</span>}@if (showCountdown()) {<span [class]="chipClass()">{{ rotateText() }}</span>}@if (showLastRotated()) {<span [class]="mutedClass()">{{ lastRotatedText() + ' ' }}@if (isNode(secret.lastRotatedAt)) {<ng-container [ngTemplateOutlet]="secret.lastRotatedAt" />}@else {<ng-container>{{ textOf(secret.lastRotatedAt) }}</ng-container>}</span>}<button mol-button [variant]="'ghost'" [size]="'sm'" (click)="toggleReveal()">{{ showHideText() }}</button><button mol-button [variant]="'ghost'" [size]="'sm'" (click)="copy()">{{ copyText() }}</button>@if (onRotate) {<button mol-button [variant]="'ghost'" [size]="'sm'" (click)="rotate()">{{ rotateButtonText() }}</button>}@if (onDelete) {<button mol-button [variant]="'ghost'" [size]="'sm'" [color]="'error'" (click)="remove()">{{ deleteButtonText() }}</button>}`,
})
export class SecretRow implements OnDestroy {
  /** The secret to display (required, as in React's props). */
  secret!: SecretRowData
  /** Called when the user clicks Rotate. */
  onRotate?: (secret: SecretRowData) => void
  /** Called when the user clicks Delete. */
  onDelete?: (secret: SecretRowData) => void
  /** Mask character for the hidden value (defaults to `'•'` at read time). */
  maskChar?: string
  /** Extra classes. */
  className?: string

  /** Whether the value is revealed (Show → Hide). */
  revealed = false
  /** Whether the Copy button shows its "Copied!" feedback. */
  copied = false
  /** The pending feedback timer. */
  private timer: ReturnType<typeof setTimeout> | undefined

  /** The translation function, captured in the injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The host (root `<div>`) class list (React's
   * `cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('py', 2),
      this.className,
    )
  }

  /**
   * The key/description column's class (`cm.flex1` + `cm.stack(0)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(0))
  }

  /**
   * The key span's class (`cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  keyClass(): string {
    return this.cm().cn(this.cm().fontWeight('semibold'))
  }

  /**
   * The description span's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  descriptionClass(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The masked-value `<code>` class (`cm.sp('px', 2)`, `cm.sp('py', 1)`,
   * `cm.textSize('xs')`).
   * @returns The class string.
   */
  codeClass(): string {
    return this.cm().cn(this.cm().sp('px', 2), this.cm().sp('py', 1), this.cm().textSize('xs'))
  }

  /**
   * The version / rotation chip class (`cm.textSize('xs')`,
   * `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  chipClass(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The expired-tag class (`cm.textSize('xs')`, `cm.fontWeight('semibold')`,
   * `cm.textTone('error')`).
   * @returns The class string.
   */
  expiredClass(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().fontWeight('semibold'),
      this.cm().textTone('error'),
    )
  }

  /**
   * The last-rotated note's class (`cm.textSize('xs')`, `cm.textMuted`).
   * @returns The class string.
   */
  mutedClass(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().textMuted)
  }

  /**
   * The mask shown while the value is hidden — React's
   * `maskChar.repeat(Math.max(8, Math.min(value.length, 24)))`.
   * @returns The mask string.
   */
  masked(): string {
    const maskChar = this.maskChar === undefined ? '•' : this.maskChar
    return maskChar.repeat(Math.max(8, Math.min(this.secret.value.length, 24)))
  }

  /**
   * Whether the rotation chip is the "Expired" tag (a negative countdown).
   * @returns True when `daysUntilRotation < 0`.
   */
  expired(): boolean {
    return this.secret.daysUntilRotation !== undefined && this.secret.daysUntilRotation < 0
  }

  /**
   * Whether the "Rotate in {n}d" countdown renders (`daysUntilRotation` is
   * zero or positive).
   * @returns True for a non-negative countdown.
   */
  showCountdown(): boolean {
    return this.secret.daysUntilRotation !== undefined && this.secret.daysUntilRotation >= 0
  }

  /**
   * Whether the "Last rotated" note renders (React's `!== undefined &&
   * !== null` check).
   * @returns True when `lastRotatedAt` is set.
   */
  showLastRotated(): boolean {
    return this.secret.lastRotatedAt !== undefined && this.secret.lastRotatedAt !== null
  }

  /**
   * The translated "Expired" label.
   * @returns The label text.
   */
  expiredText(): string {
    return this.i18n.t('secretRow.expired', {}, { defaultValue: 'Expired' })
  }

  /**
   * The translated rotation countdown.
   * @returns The label text.
   */
  rotateText(): string {
    return this.i18n.t(
      'secretRow.rotateIn',
      { days: this.secret.daysUntilRotation ?? 0 },
      { defaultValue: 'Rotate in {{days}}d' },
    )
  }

  /**
   * The translated "Last rotated" label (React renders it then a space then
   * the value).
   * @returns The label text.
   */
  lastRotatedText(): string {
    return this.i18n.t('secretRow.lastRotated', {}, { defaultValue: 'Last rotated' })
  }

  /**
   * The Show / Hide button label.
   * @returns The label text.
   */
  showHideText(): string {
    return this.revealed
      ? this.i18n.t('secretRow.hide', {}, { defaultValue: 'Hide' })
      : this.i18n.t('secretRow.show', {}, { defaultValue: 'Show' })
  }

  /**
   * The Copy / Copied! button label.
   * @returns The label text.
   */
  copyText(): string {
    return this.copied
      ? this.i18n.t('secretRow.copied', {}, { defaultValue: 'Copied!' })
      : this.i18n.t('secretRow.copy', {}, { defaultValue: 'Copy' })
  }

  /**
   * The Rotate button label.
   * @returns The label text.
   */
  rotateButtonText(): string {
    return this.i18n.t('secretRow.rotate', {}, { defaultValue: 'Rotate' })
  }

  /**
   * The Delete button label.
   * @returns The label text.
   */
  deleteButtonText(): string {
    return this.i18n.t('secretRow.delete', {}, { defaultValue: 'Delete' })
  }

  /**
   * Whether a field holds a node (an `ng-template` reference) rather than text.
   * @param value - The secret field.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   * @param value - The secret field.
   * @returns The text, or `''` for a node field.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /** Toggles the revealed state (React's `setRevealed((x) => !x)`). */
  toggleReveal(): void {
    this.revealed = !this.revealed
  }

  /** Copies the value, then shows the "Copied!" feedback for 1.5 s. */
  copy(): void {
    void copyTextWithFallback(this.secret.value).then((didCopy) => {
      if (!didCopy) return
      this.copied = true
      this.timer = setTimeout(() => {
        this.copied = false
      }, 1500)
    })
  }

  /** Calls `onRotate` with the secret (React passes the same object). */
  rotate(): void {
    this.onRotate?.(this.secret)
  }

  /** Calls `onDelete` with the secret (React passes the same object). */
  remove(): void {
    this.onDelete?.(this.secret)
  }

  /** Detaches the feedback timer with the component. */
  ngOnDestroy(): void {
    clearTimeout(this.timer)
  }
}
