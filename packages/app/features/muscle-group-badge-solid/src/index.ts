/**
 * Solid anatomical muscle-group badge — the Solid counterpart of
 * `@molecule/app-muscle-group-badge-react`: same exports, same props and the
 * same DOM for the same input.
 *
 * Exports `MuscleGroupBadge` — a small body-silhouette glyph with the
 * targeted muscle highlighted, plus a translated label. Used by
 * workout-tracker exercise-detail pages.
 *
 * @example
 * ```tsx
 * import { MuscleGroupBadge } from '@molecule/app-muscle-group-badge-solid'
 *
 * export function ExerciseTarget() {
 *   return (
 *     <div>
 *       <MuscleGroupBadge group="chest" />
 *       <MuscleGroupBadge group="quads" variant="compact" size="sm" />
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a bonded ClassMap and the binding's i18n provider (wired through
 * `MoleculeProvider`, or the bonded `@molecule/app-i18n` provider) —
 * `getClassMap()` and `useTranslation()` both throw before wiring.
 *
 * Labels resolve through `t('muscleGroupBadge.group.<group>')` and the
 * badge's accessible name through `t('muscleGroupBadge.group')`, translated by
 * the `@molecule/app-locales-muscle-group-badge` companion bond. Pass `label`
 * to override per-instance.
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

export * from './MuscleGroupBadge.jsx'
export * from './types.js'
