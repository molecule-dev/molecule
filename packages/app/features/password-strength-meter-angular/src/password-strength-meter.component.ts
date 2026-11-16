/**
 * PasswordStrengthMeter component (React parity).
 *
 * @module
 */

import { Component, type OnChanges, type OnInit, type SimpleChanges } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { I18nProvider } from '@molecule/app-i18n'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { PasswordChecklist, PasswordScore } from './scorer.js'
import { scorePassword } from './scorer.js'

/** All five score buckets in order — used to derive segment fill state. */
const SCORE_BUCKETS: ReadonlyArray<PasswordScore> = [0, 1, 2, 3, 4]

/** Ordered checklist rules shown when `showChecklist` is enabled. */
const CHECKLIST_FIELDS: ReadonlyArray<keyof PasswordChecklist> = [
  'length',
  'upper',
  'lower',
  'digit',
  'symbol',
  'noCommon',
]

/** The `t` function the meter reads from `useTranslation()`. */
type TranslateFn = I18nProvider['t']

/**
 * Maps a score to a CSS color variable from molecule's design system.
 *
 * @param score - The score to map.
 * @returns A `var(--mol-color-*)` reference for the matching segment.
 */
function colorForScore(score: PasswordScore): string {
  switch (score) {
    case 0:
      return 'var(--mol-color-error, #dc2626)'
    case 1:
      return 'var(--mol-color-error, #dc2626)'
    case 2:
      return 'var(--mol-color-warning, #f59e0b)'
    case 3:
      return 'var(--mol-color-info, #3b82f6)'
    case 4:
      return 'var(--mol-color-success, #16a34a)'
  }
}

/**
 * Localized textual label for a score bucket.
 *
 * One literal `t()` call per score: a key assembled at runtime
 * (`passwordStrengthMeter.label.${score}`) is invisible to the i18n parity
 * gate, so a missing key would leave every non-English locale on English with
 * nothing reporting it.
 *
 * @param score - The score whose label is needed.
 * @param translate - The translation function from `useTranslation()`.
 * @returns The translated label text (e.g. "Strong").
 */
function labelTextForScore(score: PasswordScore, translate: TranslateFn): string {
  switch (score) {
    case 0:
      return translate('passwordStrengthMeter.label.0', undefined, { defaultValue: 'Very weak' })
    case 1:
      return translate('passwordStrengthMeter.label.1', undefined, { defaultValue: 'Weak' })
    case 2:
      return translate('passwordStrengthMeter.label.2', undefined, { defaultValue: 'Fair' })
    case 3:
      return translate('passwordStrengthMeter.label.3', undefined, { defaultValue: 'Good' })
    case 4:
      return translate('passwordStrengthMeter.label.4', undefined, { defaultValue: 'Strong' })
  }
}

/**
 * Localized label for one checklist rule.
 *
 * One literal `t()` call per rule — keys are never assembled at runtime, for
 * the same parity-gate reason as {@link labelTextForScore}.
 *
 * @param field - The checklist rule whose label is needed.
 * @param translate - The translation function from `useTranslation()`.
 * @returns The translated rule label.
 */
function ruleLabelForField(field: keyof PasswordChecklist, translate: TranslateFn): string {
  switch (field) {
    case 'length':
      return translate('passwordStrengthMeter.rule.length', undefined, {
        defaultValue: 'At least 12 characters',
      })
    case 'upper':
      return translate('passwordStrengthMeter.rule.upper', undefined, {
        defaultValue: 'Contains an uppercase letter',
      })
    case 'lower':
      return translate('passwordStrengthMeter.rule.lower', undefined, {
        defaultValue: 'Contains a lowercase letter',
      })
    case 'digit':
      return translate('passwordStrengthMeter.rule.digit', undefined, {
        defaultValue: 'Contains a digit',
      })
    case 'symbol':
      return translate('passwordStrengthMeter.rule.symbol', undefined, {
        defaultValue: 'Contains a symbol',
      })
    case 'noCommon':
      return translate('passwordStrengthMeter.rule.noCommon', undefined, {
        defaultValue: 'Not a common password',
      })
  }
}

/**
 * Real-time password strength meter.
 *
 * Renders a 5-segment colored bar (red → green) plus an optional textual label
 * and rule checklist. The host IS the outer `<div>`
 * (`div[mol-password-strength-meter]`), matching React's root exactly. Scoring
 * is performed by an in-package lightweight scorer (no zxcvbn dependency). All
 * UI text flows through the binding's reactive `t()` so locale bonds can
 * override translations and a locale switch re-renders the text; all styling
 * flows through `getClassMap()`. Colors come from molecule's `--mol-color-*`
 * design tokens.
 */
@Component({
  selector: 'div[mol-password-strength-meter]',
  standalone: true,
  inputs: ['password', 'onScore', 'minScore', 'showLabel', 'showChecklist', 'className'],
  host: {
    '[class]': 'classes()',
    'data-mol-id': 'password-strength-meter',
  },
  // prettier-ignore
  template: `<div [class]="barClasses()" role="progressbar" [attr.aria-label]="barLabel()" [attr.aria-valuemin]="0" [attr.aria-valuemax]="4" [attr.aria-valuenow]="score()" [attr.aria-valuetext]="ariaValueText()" data-mol-id="password-strength-meter-bar" [attr.data-score]="score()" [attr.data-meets-min]="meetsMin() ? 'true' : 'false'"
  >@for (bucket of buckets; track bucket) {
    <span [attr.data-mol-id]="'password-strength-meter-segment-' + bucket" [attr.data-filled]="filled(bucket) ? 'true' : 'false'" [attr.style]="segmentStyle(bucket)"></span>
  }</div>@if (labelShown()) {
    <span [class]="labelClasses()" data-mol-id="password-strength-meter-label" [attr.style]="labelStyle()">{{ labelText() }}</span>
  }@if (checklistShown()) {
    <ul [class]="checklistClasses()" data-mol-id="password-strength-meter-checklist" style="list-style: none; margin: 0px; padding: 0px"
    >@for (field of checklistFields; track field) {
      <li [class]="ruleClasses()" [attr.data-mol-id]="'password-strength-meter-rule-' + field" [attr.data-ok]="ruleOk(field) ? 'true' : 'false'"
      ><span aria-hidden="true" [attr.style]="markerStyle(field)">{{ ruleOk(field) ? '✓' : '✗' }}</span
      ><span>{{ ruleLabel(field) }}</span></li>
    }</ul>
  }`,
})
export class PasswordStrengthMeter implements OnInit, OnChanges {
  /** Password value to score (controlled by the parent form). */
  password = ''
  /**
   * Fires whenever the score changes — used by signup forms to gate
   * the submit button on `score >= minScore`.
   */
  onScore?: (score: PasswordScore) => void
  /** Minimum acceptable score for surrounding form validation (defaults to 2 at read time). */
  minScore?: PasswordScore
  /** Whether the textual strength label is shown (defaults to `true` at read time). */
  showLabel?: boolean
  /** Whether the optional rule checklist is rendered (defaults to `false` at read time). */
  showChecklist?: boolean
  /** Extra classes appended to the outer wrapper. */
  className?: string

  /** The five score buckets, left to right. */
  protected readonly buckets = SCORE_BUCKETS

  /** The checklist rules, in React's order. */
  protected readonly checklistFields = CHECKLIST_FIELDS

  /** The reactive i18n binding, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The last score `onScore` was called with (React's effect dependency). */
  private lastScore: PasswordScore = 0

  /** The callback `onScore` was last called with (React's effect dependency). */
  private lastOnScore: ((score: PasswordScore) => void) | undefined

  /** Whether the mount-time `onScore` call has happened. */
  private initialized = false

  /**
   * The score of a password, through the in-package scorer.
   *
   * @returns The discrete strength bucket.
   */
  score(): PasswordScore {
    return scorePassword(this.password).score
  }

  /**
   * The per-rule outcomes for the current password.
   *
   * @returns The checklist.
   */
  checklist(): PasswordChecklist {
    return scorePassword(this.password).checklist
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.stack(2), className)`).
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm.cn(this.cm.stack(2), this.className)
  }

  /**
   * The bar's class (React's `cm.flex({ gap: 'xs' })`).
   *
   * @returns The class string.
   */
  barClasses(): string {
    return this.cm.flex({ gap: 'xs' })
  }

  /**
   * The label's class list (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))`).
   *
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm.cn(this.cm.textSize('sm'), this.cm.fontWeight('medium'))
  }

  /**
   * The checklist list's class (React's `cm.stack(1)`).
   *
   * @returns The class string.
   */
  checklistClasses(): string {
    return this.cm.stack(1)
  }

  /**
   * One checklist row's class list.
   *
   * @returns The class string.
   */
  ruleClasses(): string {
    return this.cm.cn(this.cm.flex({ gap: 'xs', align: 'center' }), this.cm.textSize('sm'))
  }

  /**
   * Whether the textual label renders (React's `showLabel` default `true`).
   *
   * @returns True when the label shows.
   */
  labelShown(): boolean {
    return this.showLabel ?? true
  }

  /**
   * Whether the rule checklist renders (React's `showChecklist` default `false`).
   *
   * @returns True when the checklist shows.
   */
  checklistShown(): boolean {
    return this.showChecklist ?? false
  }

  /**
   * Whether the score meets the minimum (React's `minScore` default `2`).
   *
   * @returns True when `score >= minScore`.
   */
  meetsMin(): boolean {
    return this.score() >= (this.minScore ?? 2)
  }

  /**
   * Whether a segment is filled: the password is non-empty and the bucket is
   * at or below the score.
   *
   * @param bucket - The segment's bucket.
   * @returns True when the segment is filled.
   */
  filled(bucket: PasswordScore): boolean {
    return this.password.length > 0 && bucket <= this.score()
  }

  /**
   * React's inline style for one bar segment.
   *
   * @param bucket - The segment's bucket.
   * @returns The style attribute text.
   */
  segmentStyle(bucket: PasswordScore): string {
    return `background: ${
      this.filled(bucket) ? colorForScore(this.score()) : 'var(--mol-color-border, rgba(0,0,0,0.1))'
    }; border-radius: 3px; flex: 1 1 0%; height: 6px; transition: background-color 150ms ease`
  }

  /**
   * React's inline style for the label, or null (no style attribute) for an
   * empty password.
   *
   * @returns The style attribute text, or null.
   */
  labelStyle(): string | null {
    return this.password.length === 0 ? null : `color: ${colorForScore(this.score())}`
  }

  /**
   * React's inline style for one checklist marker, red for ✗ and green for ✓.
   *
   * @param field - The checklist rule.
   * @returns The style attribute text.
   */
  markerStyle(field: keyof PasswordChecklist): string {
    return `color: ${
      this.ruleOk(field) ? 'var(--mol-color-success, #16a34a)' : 'var(--mol-color-error, #dc2626)'
    }; display: inline-block; font-weight: 600; width: 1em`
  }

  /**
   * Whether one checklist rule passes.
   *
   * @param field - The checklist rule.
   * @returns True when the rule is satisfied.
   */
  ruleOk(field: keyof PasswordChecklist): boolean {
    return this.checklist()[field]
  }

  /**
   * The strength label's text (React's `t('passwordStrengthMeter.label.N')`).
   *
   * @returns The label text.
   */
  labelText(): string {
    return labelTextForScore(this.score(), this.i18n.t)
  }

  /**
   * The bar's accessible name.
   *
   * @returns The translated `aria-label`.
   */
  barLabel(): string {
    return this.i18n.t('passwordStrengthMeter.barLabel', undefined, {
      defaultValue: 'Password strength',
    })
  }

  /**
   * The bar's accessible value text.
   *
   * @returns The translated `aria-valuetext`.
   */
  ariaValueText(): string {
    return this.i18n.t(
      'passwordStrengthMeter.ariaValueText',
      { label: this.labelText(), score: this.score() },
      { defaultValue: 'Password strength: {{label}} ({{score}} of 4)' },
    )
  }

  /**
   * One checklist rule's label.
   *
   * @param field - The checklist rule.
   * @returns The translated rule label.
   */
  ruleLabel(field: keyof PasswordChecklist): string {
    return ruleLabelForField(field, this.i18n.t)
  }

  /**
   * React's mount effect: `onScore` fires once with the initial score.
   */
  ngOnInit(): void {
    this.lastScore = this.score()
    this.lastOnScore = this.onScore
    this.initialized = true
    this.onScore?.(this.lastScore)
  }

  /**
   * React's effect dependencies: fires `onScore` again only when the score or
   * the callback changed (a new password in the same bucket stays quiet).
   *
   * @param _changes - The changed inputs.
   */
  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.initialized) return
    const current = this.score()
    const changed = current !== this.lastScore || this.onScore !== this.lastOnScore
    this.lastScore = current
    this.lastOnScore = this.onScore
    if (changed) this.onScore?.(current)
  }
}
