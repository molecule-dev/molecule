<!--
  PasswordStrengthMeter: the Svelte counterpart of
  `@molecule/app-password-strength-meter-react`'s `PasswordStrengthMeter` — a
  5-segment colored strength bar, a textual strength label and an optional rule
  checklist, with the same props (React names) and the same DOM for the same
  input. Scoring comes from the in-package lightweight scorer; every visible
  string goes through `t()` so a locale switch re-renders it, and every class
  comes from `getClassMap()`.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { I18nProvider } from '@molecule/app-i18n'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { PasswordChecklist, PasswordScore } from './scorer.js'
  import { scorePassword } from './scorer.js'
  import type { PasswordStrengthMeterProps } from './types.js'

  /** The `t` function the meter reads from `useTranslation()`. */
  type TranslateFn = I18nProvider['t']

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

  /**
   * Maps a score to a CSS color variable from molecule's design system.
   *
   * @param scoreValue - The score to map.
   * @returns A `var(--mol-color-*)` reference for the matching segment.
   */
  function colorForScore(scoreValue: PasswordScore): string {
    switch (scoreValue) {
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
   * gate, so a missing key would leave every non-English locale on English
   * with nothing reporting it.
   *
   * @param scoreValue - The score whose label is needed.
   * @param translate - The translation function from `useTranslation()`.
   * @returns The translated label text (e.g. "Strong").
   */
  function labelTextForScore(scoreValue: PasswordScore, translate: TranslateFn): string {
    switch (scoreValue) {
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

  let {
    password,
    onScore,
    minScore = 2,
    showLabel = true,
    showChecklist = false,
    className,
  }: PasswordStrengthMeterProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const result = $derived(scorePassword(password))
  const score = $derived(result.score)
  const checklist = $derived(result.checklist)
  const meetsMin = $derived(score >= minScore)
  const labelText = $derived(labelTextForScore(score, t))
  const barLabel = $derived(
    t('passwordStrengthMeter.barLabel', undefined, { defaultValue: 'Password strength' }),
  )
  const ariaValueText = $derived(
    t(
      'passwordStrengthMeter.ariaValueText',
      { label: labelText, score },
      { defaultValue: 'Password strength: {{label}} ({{score}} of 4)' },
    ),
  )

  // Every `t(…)` runs while markup or a `$derived` evaluates, so it re-reads
  // the provider on a locale switch the way React's render-time `t` calls do.
  const ruleLengthLabel = $derived(
    t('passwordStrengthMeter.rule.length', undefined, {
      defaultValue: 'At least 12 characters',
    }),
  )
  const ruleUpperLabel = $derived(
    t('passwordStrengthMeter.rule.upper', undefined, {
      defaultValue: 'Contains an uppercase letter',
    }),
  )
  const ruleLowerLabel = $derived(
    t('passwordStrengthMeter.rule.lower', undefined, {
      defaultValue: 'Contains a lowercase letter',
    }),
  )
  const ruleDigitLabel = $derived(
    t('passwordStrengthMeter.rule.digit', undefined, {
      defaultValue: 'Contains a digit',
    }),
  )
  const ruleSymbolLabel = $derived(
    t('passwordStrengthMeter.rule.symbol', undefined, {
      defaultValue: 'Contains a symbol',
    }),
  )
  const ruleNoCommonLabel = $derived(
    t('passwordStrengthMeter.rule.noCommon', undefined, {
      defaultValue: 'Not a common password',
    }),
  )

  /**
   * The already-translated label of one checklist rule.
   *
   * @param field - The checklist rule.
   * @returns Its label text.
   */
  function ruleLabel(field: keyof PasswordChecklist): string {
    switch (field) {
      case 'length':
        return ruleLengthLabel
      case 'upper':
        return ruleUpperLabel
      case 'lower':
        return ruleLowerLabel
      case 'digit':
        return ruleDigitLabel
      case 'symbol':
        return ruleSymbolLabel
      case 'noCommon':
        return ruleNoCommonLabel
    }
  }

  /**
   * React's inline style for one bar segment.
   *
   * @param filled - Whether the segment is filled.
   * @returns The style attribute text.
   */
  function segmentStyle(filled: boolean): string {
    return `background: ${
      filled ? colorForScore(score) : 'var(--mol-color-border, rgba(0,0,0,0.1))'
    }; border-radius: 3px; flex: 1 1 0%; height: 6px; transition: background-color 150ms ease`
  }

  /**
   * React's inline style for one checklist marker, red for ✗ and green for ✓.
   *
   * @param ok - Whether the rule passes.
   * @returns The style attribute text.
   */
  function markerStyle(ok: boolean): string {
    return `color: ${
      ok ? 'var(--mol-color-success, #16a34a)' : 'var(--mol-color-error, #dc2626)'
    }; display: inline-block; font-weight: 600; width: 1em`
  }

  // React's effect depends on the score and the callback: it runs after the
  // mount and afterwards only when one of the two changes — a new password in
  // the same bucket keeps it quiet. `untrack` keeps a re-created props object
  // from refiring it, exactly as the memo does in the Solid port.
  $effect(() => {
    const value = score
    untrack(() => onScore)?.(value)
  })
</script>

<div class={cm.cn(cm.stack(2), className)} data-mol-id="password-strength-meter">
  <div
    class={cm.flex({ gap: 'xs' })}
    role="progressbar"
    aria-label={barLabel}
    aria-valuemin={0}
    aria-valuemax={4}
    aria-valuenow={score}
    aria-valuetext={ariaValueText}
    data-mol-id="password-strength-meter-bar"
    data-score={score}
    data-meets-min={meetsMin ? 'true' : 'false'}
  >
    {#each SCORE_BUCKETS as bucket (bucket)}
      <span
        data-mol-id={`password-strength-meter-segment-${bucket}`}
        data-filled={password.length > 0 && bucket <= score ? 'true' : 'false'}
        style={segmentStyle(password.length > 0 && bucket <= score)}
      ></span>
    {/each}
  </div>
  {#if showLabel}
    <span
      class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
      data-mol-id="password-strength-meter-label"
      style={password.length === 0 ? undefined : `color: ${colorForScore(score)}`}>{labelText}</span
    >
  {/if}
  {#if showChecklist}
    <ul
      class={cm.stack(1)}
      data-mol-id="password-strength-meter-checklist"
      style="list-style: none; margin: 0px; padding: 0px"
    >
      {#each CHECKLIST_FIELDS as field (field)}
        <li
          class={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), cm.textSize('sm'))}
          data-mol-id={`password-strength-meter-rule-${field}`}
          data-ok={checklist[field] ? 'true' : 'false'}
        >
          <span aria-hidden="true" style={markerStyle(checklist[field])}
            >{checklist[field] ? '✓' : '✗'}</span
          >
          <span>{ruleLabel(field)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
