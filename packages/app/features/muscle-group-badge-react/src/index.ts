/**
 * Anatomical muscle-group badge — small body-silhouette glyph with the
 * targeted muscle highlighted, plus a label. Used by workout-tracker
 * exercise-detail pages.
 *
 * @example
 * ```tsx
 * import { MuscleGroupBadge } from '@molecule/app-muscle-group-badge-react'
 *
 * <MuscleGroupBadge group="chest" />
 * <MuscleGroupBadge group="quads" variant="compact" size="sm" />
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and a React `I18nProvider` ancestor —
 * `getClassMap()` and `useTranslation()` both throw before wiring.
 *
 * Labels resolve through `t('muscleGroupBadge.group.<group>')` but no
 * companion locale bond ships these keys yet — without app-registered
 * translations the built-in English labels render. Pass `label` to
 * override per-instance.
 *
 * The pill background / text colors read the optional
 * `--mol-color-surface-variant` / `--mol-color-on-surface` CSS custom
 * properties and fall back to LIGHT-THEME values (near-white tint,
 * near-black text). Standard molecule themes do not define these vars —
 * define them (both themes) or the badge text stays dark on dark
 * surfaces. `accentColor` overrides the per-group border/glyph accent.
 *
 * @module
 */

export * from './MuscleGroupBadge.js'
export * from './types.js'
