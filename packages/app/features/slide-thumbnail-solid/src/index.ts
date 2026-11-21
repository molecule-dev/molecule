/**
 * Solid slide thumbnail tile for presentation editors / slideshow navigators.
 * Renders a fixed-width clickable tile with an index badge and an
 * "active" outline; the app supplies the scaled-down slide preview as
 * children.
 *
 * Solid counterpart of `@molecule/app-slide-thumbnail-react`: the same props
 * (React names), the same DOM for the same input, and the same ClassMap
 * tokens. Apps switch framework by changing only the package name in their
 * imports.
 *
 * Props: `index` (1-based, required), `active`, `onClick`,
 * `aspect` (`'16/9' | '4/3' | '1/1'`, default `'16/9'`), `width` (px,
 * default 160), `className`, `children`.
 *
 * @example
 * ```tsx
 * import { For } from 'solid-js'
 *
 * import { SlideThumbnail } from '@molecule/app-slide-thumbnail-solid'
 *
 * interface Slide {
 *   id: string
 *   title: string
 * }
 *
 * export function SlideStrip(props: {
 *   slides: Slide[]
 *   activeIndex: number
 *   onSelect: (index: number) => void
 * }) {
 *   return (
 *     <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
 *       <For each={props.slides}>
 *         {(slide, i) => (
 *           <SlideThumbnail
 *             index={i() + 1}
 *             active={i() === props.activeIndex}
 *             onClick={() => props.onSelect(i())}
 *             width={160}
 *           >
 *             <span>{slide.title}</span>
 *           </SlideThumbnail>
 *         )}
 *       </For>
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (e.g. `@molecule/app-ui-tailwind`) —
 *   `getClassMap()` throws before bonding.
 * - The tile canvas is the theme's surface token (`cm.surface`) and the index
 *   badge sits on a theme scrim (`cm.bgScrim` + `cm.textOnTone`), so both
 *   follow the app's theme — render your own themed preview inside `children`.
 * - The active outline uses `currentColor`; set a text color on a parent
 *   to control it.
 * - The index label's aria-label comes from `t('slideThumbnail.label')` with
 *   an English fallback, read through the binding's `useTranslation()`, so a
 *   locale switch updates it at once.
 * - Companion locale bond: `@molecule/app-locales-slide-thumbnail`.
 *
 * @module
 */

export * from './SlideThumbnail.jsx'
export * from './types.js'
