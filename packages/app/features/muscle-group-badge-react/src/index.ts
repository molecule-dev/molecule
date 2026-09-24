/**
 * Anatomical muscle-group badge — small body-silhouette glyph with the
 * targeted muscle highlighted, plus a label. Used by workout-tracker
 * exercise-detail pages.
 *
 * @example
 * ```tsx
 * import { type MuscleGroup, MuscleGroupBadge } from '@molecule/app-muscle-group-badge-react'
 *
 * export function ExerciseMuscles() {
 *   const exercise: { name: string; primary: MuscleGroup; secondary: MuscleGroup[] } = {
 *     name: 'Barbell bench press',
 *     primary: 'chest',
 *     secondary: ['triceps', 'shoulders'],
 *   }
 *   return (
 *     <section>
 *       <h2>{exercise.name}</h2>
 *       <MuscleGroupBadge group={exercise.primary} size="lg" />
 *       {exercise.secondary.map((group) => (
 *         <MuscleGroupBadge key={group} group={group} variant="compact" size="sm" />
 *       ))}
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond (`setClassMap(classMap)` from `@molecule/app-ui`) and a React
 * `I18nProvider` ancestor (from `@molecule/app-react`) — `getClassMap()` and `useTranslation()`
 * both throw before wiring.
 *
 * `group` must be one of the fixed `MuscleGroup` ids (`'fullBody'`, not `'full-body'`); there is
 * no free-form group. It is display-only — no click handler.
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
