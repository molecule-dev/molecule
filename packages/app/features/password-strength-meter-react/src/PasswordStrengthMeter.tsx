import type { ReactElement } from 'react'
import { useEffect, useMemo } from 'react'

import type { I18nProvider } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { PasswordChecklist, PasswordScore } from './scorer.js'
import { scorePassword } from './scorer.js'

/**
 * Props accepted by {@link PasswordStrengthMeter}.
 */
export interface PasswordStrengthMeterProps {
  /** Password value to score (controlled by the parent form). */
  password: string
  /**
   * Fires whenever the score changes — used by signup forms to gate
   * the submit button on `score >= minScore`.
   */
  onScore?: (score: PasswordScore) => void
  /** Minimum acceptable score for surrounding form validation. Default: `2`. */
  minScore?: PasswordScore
  /** Whether the textual strength label (e.g. "Strong") is shown. Default: `true`. */
  showLabel?: boolean
  /** Whether the optional rule checklist is rendered below the bar. Default: `false`. */
  showChecklist?: boolean
  /** Extra classes appended to the outer wrapper. */
  className?: string
}

/** All five score buckets in order — used to derive segment fill state. */
const SCORE_BUCKETS: ReadonlyArray<PasswordScore> = [0, 1, 2, 3, 4]

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
 * The `t` function {@link PasswordStrengthMeter} reads from `useTranslation()` —
 * the provider signature from `@molecule/app-i18n`.
 */
type TranslateFn = I18nProvider['t']

/**
 * Localized textual label for a score bucket.
 *
 * One literal `t()` call per score: a key assembled at runtime
 * (`` `passwordStrengthMeter.label.${score}` ``) is invisible to the i18n
 * parity gate, so a missing key would leave every non-English locale on
 * English with nothing reporting it.
 *
 * @param score - The score whose label is needed.
 * @param t - The translation function from `useTranslation()`.
 * @returns The translated label text (e.g. "Strong").
 */
function labelTextForScore(score: PasswordScore, t: TranslateFn): string {
  switch (score) {
    case 0:
      return t('passwordStrengthMeter.label.0', undefined, { defaultValue: 'Very weak' })
    case 1:
      return t('passwordStrengthMeter.label.1', undefined, { defaultValue: 'Weak' })
    case 2:
      return t('passwordStrengthMeter.label.2', undefined, { defaultValue: 'Fair' })
    case 3:
      return t('passwordStrengthMeter.label.3', undefined, { defaultValue: 'Good' })
    case 4:
      return t('passwordStrengthMeter.label.4', undefined, { defaultValue: 'Strong' })
  }
}

/**
 * Localized label for one checklist rule.
 *
 * One literal `t()` call per rule — keys are never assembled at runtime, for
 * the same parity-gate reason as {@link labelTextForScore}.
 *
 * @param field - The checklist rule whose label is needed.
 * @param t - The translation function from `useTranslation()`.
 * @returns The translated rule label.
 */
function ruleLabelForField(field: keyof PasswordChecklist, t: TranslateFn): string {
  switch (field) {
    case 'length':
      return t('passwordStrengthMeter.rule.length', undefined, {
        defaultValue: 'At least 12 characters',
      })
    case 'upper':
      return t('passwordStrengthMeter.rule.upper', undefined, {
        defaultValue: 'Contains an uppercase letter',
      })
    case 'lower':
      return t('passwordStrengthMeter.rule.lower', undefined, {
        defaultValue: 'Contains a lowercase letter',
      })
    case 'digit':
      return t('passwordStrengthMeter.rule.digit', undefined, {
        defaultValue: 'Contains a digit',
      })
    case 'symbol':
      return t('passwordStrengthMeter.rule.symbol', undefined, {
        defaultValue: 'Contains a symbol',
      })
    case 'noCommon':
      return t('passwordStrengthMeter.rule.noCommon', undefined, {
        defaultValue: 'Not a common password',
      })
  }
}

/** Ordered checklist rules shown when `showChecklist` is enabled. */
const CHECKLIST_FIELDS: ReadonlyArray<keyof PasswordChecklist> = [
  'length',
  'upper',
  'lower',
  'digit',
  'symbol',
  'noCommon',
]

/**
 * Real-time password strength meter.
 *
 * Renders a 5-segment colored bar (red → green) plus an optional textual
 * label and rule checklist. Scoring is performed by an in-package
 * lightweight scorer (no zxcvbn dependency). All UI text flows through
 * `t()` so locale bonds can override translations; all styling flows
 * through `getClassMap()` so the meter restyles via the wired ClassMap
 * bond. Colors come from molecule's `--mol-color-*` design tokens.
 *
 * @param props - {@link PasswordStrengthMeterProps}.
 * @returns The rendered meter element tree.
 */
export function PasswordStrengthMeter(props: PasswordStrengthMeterProps): ReactElement {
  const {
    password,
    onScore,
    minScore = 2,
    showLabel = true,
    showChecklist = false,
    className,
  } = props

  const { t } = useTranslation()
  const cm = getClassMap()
  const result = useMemo(() => scorePassword(password), [password])
  const { score, checklist } = result

  useEffect(() => {
    onScore?.(score)
  }, [score, onScore])

  const labelText = labelTextForScore(score, t)

  const meetsMin = score >= minScore
  const ariaValueText = t(
    'passwordStrengthMeter.ariaValueText',
    { label: labelText, score },
    { defaultValue: 'Password strength: {{label}} ({{score}} of 4)' },
  )

  return (
    <div className={cm.cn(cm.stack(2), className)} data-mol-id="password-strength-meter">
      <div
        className={cm.flex({ gap: 'xs' })}
        role="progressbar"
        aria-label={t('passwordStrengthMeter.barLabel', undefined, {
          defaultValue: 'Password strength',
        })}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-valuetext={ariaValueText}
        data-mol-id="password-strength-meter-bar"
        data-score={score}
        data-meets-min={meetsMin ? 'true' : 'false'}
      >
        {SCORE_BUCKETS.map((bucket) => {
          const filled = password.length > 0 && bucket <= score
          return (
            <span
              key={bucket}
              data-mol-id={`password-strength-meter-segment-${bucket}`}
              data-filled={filled ? 'true' : 'false'}
              style={{
                flex: '1 1 0%',
                height: '6px',
                borderRadius: '3px',
                background: filled
                  ? colorForScore(score)
                  : 'var(--mol-color-border, rgba(0,0,0,0.1))',
                transition: 'background-color 150ms ease',
              }}
            />
          )
        })}
      </div>
      {showLabel && (
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
          data-mol-id="password-strength-meter-label"
          style={{ color: password.length === 0 ? undefined : colorForScore(score) }}
        >
          {labelText}
        </span>
      )}
      {showChecklist && (
        <ul
          className={cm.stack(1)}
          data-mol-id="password-strength-meter-checklist"
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
        >
          {CHECKLIST_FIELDS.map((field) => {
            const ok = checklist[field]
            const ruleText = ruleLabelForField(field, t)
            return (
              <li
                key={field}
                className={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), cm.textSize('sm'))}
                data-mol-id={`password-strength-meter-rule-${field}`}
                data-ok={ok ? 'true' : 'false'}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: ok
                      ? 'var(--mol-color-success, #16a34a)'
                      : 'var(--mol-color-error, #dc2626)',
                    fontWeight: 600,
                    width: '1em',
                    display: 'inline-block',
                  }}
                >
                  {ok ? '✓' : '✗'}
                </span>
                <span>{ruleText}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
