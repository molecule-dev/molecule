import type { ReactElement } from 'react'
import { useEffect, useMemo } from 'react'

import { t } from '@molecule/app-i18n'
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
 * Translation key for the textual label corresponding to `score`.
 *
 * @param score - The score whose label key is needed.
 * @returns The `passwordStrengthMeter.label.*` translation key.
 */
function labelKeyForScore(score: PasswordScore): string {
  return `passwordStrengthMeter.label.${score}`
}

/** English fallback labels — matching `passwordStrengthMeter.label.*` keys. */
const LABEL_FALLBACKS: Record<PasswordScore, string> = {
  0: 'Very weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
}

/** Checklist row spec — translation key + checklist field name. */
interface ChecklistRow {
  /** Field on {@link PasswordChecklist} this row reflects. */
  field: keyof PasswordChecklist
  /** Translation key for the row's label. */
  key: string
  /** English fallback text. */
  fallback: string
}

/** Ordered checklist rows shown when `showChecklist` is enabled. */
const CHECKLIST_ROWS: readonly ChecklistRow[] = [
  {
    field: 'length',
    key: 'passwordStrengthMeter.rule.length',
    fallback: 'At least 12 characters',
  },
  {
    field: 'upper',
    key: 'passwordStrengthMeter.rule.upper',
    fallback: 'Contains an uppercase letter',
  },
  {
    field: 'lower',
    key: 'passwordStrengthMeter.rule.lower',
    fallback: 'Contains a lowercase letter',
  },
  {
    field: 'digit',
    key: 'passwordStrengthMeter.rule.digit',
    fallback: 'Contains a digit',
  },
  {
    field: 'symbol',
    key: 'passwordStrengthMeter.rule.symbol',
    fallback: 'Contains a symbol',
  },
  {
    field: 'noCommon',
    key: 'passwordStrengthMeter.rule.noCommon',
    fallback: 'Not a common password',
  },
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

  const cm = getClassMap()
  const result = useMemo(() => scorePassword(password), [password])
  const { score, checklist } = result

  useEffect(() => {
    onScore?.(score)
  }, [score, onScore])

  const labelText = t(labelKeyForScore(score), undefined, {
    defaultValue: LABEL_FALLBACKS[score],
  })

  const meetsMin = score >= minScore
  const ariaValueText = t(
    'passwordStrengthMeter.ariaValueText',
    { label: labelText, score },
    {
      defaultValue: `Password strength: ${labelText} (${score} of 4)`,
    },
  )

  return (
    <div className={cm.cn(cm.stack(2), className)} data-mol-id="password-strength-meter">
      <div
        className={cm.flex({ gap: 'xs' })}
        role="progressbar"
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
          {CHECKLIST_ROWS.map((row) => {
            const ok = checklist[row.field]
            const labelTextRow = t(row.key, undefined, { defaultValue: row.fallback })
            return (
              <li
                key={row.field}
                className={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), cm.textSize('sm'))}
                data-mol-id={`password-strength-meter-rule-${row.field}`}
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
                <span>{labelTextRow}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
