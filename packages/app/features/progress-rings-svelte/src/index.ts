/**
 * Svelte Apple-Health-style concentric SVG progress rings — single + triad.
 *
 * Exports `ProgressRings` for one or more rings rendered as a single SVG — the
 * Svelte counterpart of `@molecule/app-progress-rings-react`, with the same
 * props (React names) and the same DOM for the same input, so an app switches
 * framework by changing only the package name in its imports.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ProgressRings } from '@molecule/app-progress-rings-svelte'
 * </script>
 *
 * <ProgressRings
 *   rings={[
 *     { value: 8200, max: 10000, color: 'var(--color-success)', label: 'Steps' },
 *     { value: 7, max: 8, color: 'var(--color-info)', label: 'Sleep (hrs)' },
 *     { value: 35, max: 60, color: 'var(--color-warning)', label: 'Active (min)' },
 *   ]}
 *   size={160}
 *   strokeWidth={12}
 * />
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-progress-rings` (aria summary
 * + per-ring labels). Ring `color` is any CSS color — pass theme tokens like
 * `var(--color-success)` so rings follow the active theme. Requires a wired
 * ClassMap bond; the labels are read through `useTranslation()` so they follow
 * a locale switch. Rings nest outside-in: `rings[0]` is the outermost.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
