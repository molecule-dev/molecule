/**
 * Svelte slide thumbnail tile for presentation editors / slideshow navigators.
 * Renders a fixed-width clickable tile with an index badge and an
 * "active" outline; the app supplies the scaled-down slide preview as the
 * default snippet.
 *
 * Svelte counterpart of `@molecule/app-slide-thumbnail-react`: the same props
 * (React names), the same DOM for the same input, and the same ClassMap
 * tokens. Apps switch framework by changing only the package name in their
 * imports.
 *
 * Props: `index` (1-based, required), `active`, `onClick`,
 * `aspect` (`'16/9' | '4/3' | '1/1'`, default `'16/9'`), `width` (px,
 * default 160), `className`, and the default snippet as `children`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { SlideThumbnail } from '@molecule/app-slide-thumbnail-svelte'
 *
 *   interface Slide {
 *     id: string
 *     title: string
 *   }
 *
 *   let { slides, activeIndex, onSelect }: {
 *     slides: Slide[]
 *     activeIndex: number
 *     onSelect: (index: number) => void
 *   } = $props()
 * </script>
 *
 * <div style="display: flex; flex-direction: column; gap: 8px">
 *   {#each slides as slide, i (slide.id)}
 *     <SlideThumbnail
 *       index={i + 1}
 *       active={i === activeIndex}
 *       onClick={() => onSelect(i)}
 *       width={160}
 *     >
 *       <span>{slide.title}</span>
 *     </SlideThumbnail>
 *   {/each}
 * </div>
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (e.g. `@molecule/app-ui-tailwind`) —
 *   `getClassMap()` throws before bonding.
 * - The tile surface is a theme token (`var(--mol-color-surface, #fff)`) so
 *   light slide content stays readable, even in dark themes — render your own
 *   themed preview inside `children` if that is wrong for your app.
 * - The active outline uses `currentColor`; set a text color on a parent
 *   to control it.
 * - The index label's aria-label comes from `t('slideThumbnail.label')` with
 *   an English fallback, read through the binding's `useTranslation()`, so a
 *   locale switch updates it at once.
 * - Companion locale bond: `@molecule/app-locales-slide-thumbnail`.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
