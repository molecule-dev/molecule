/**
 * Slide thumbnail tile for presentation editors / slideshow navigators.
 * Renders a fixed-width clickable tile with an index badge and an
 * "active" outline; the app supplies the scaled-down slide preview as
 * `children`.
 *
 * Props: `index` (1-based, required), `active`, `onClick`,
 * `aspect` (`'16/9' | '4/3' | '1/1'`, default `'16/9'`), `width` (px,
 * default 160), `className`, `children`.
 *
 * @example
 * ```tsx
 * import { SlideThumbnail } from '@molecule/app-slide-thumbnail-react'
 *
 * interface Slide { id: string; title: string }
 *
 * function SlideStrip({ slides, activeIndex, onSelect }: {
 *   slides: Slide[]
 *   activeIndex: number
 *   onSelect: (index: number) => void
 * }) {
 *   return (
 *     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 *       {slides.map((slide, i) => (
 *         <SlideThumbnail
 *           key={slide.id}
 *           index={i + 1}
 *           active={i === activeIndex}
 *           onClick={() => onSelect(i)}
 *           width={160}
 *         >
 *           <span>{slide.title}</span>
 *         </SlideThumbnail>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (e.g. `@molecule/app-ui-tailwind`) —
 *   `getClassMap()` throws before bonding.
 * - The tile surface is hardcoded white (`background: '#fff'`) so light
 *   slide content stays readable, even in dark themes — render your own
 *   themed preview inside `children` if that is wrong for your app.
 * - The active outline uses `currentColor`; set a text color on a parent
 *   to control it.
 * - The index badge aria-label is currently English-only ("Slide N").
 *
 * @module
 */

export * from './SlideThumbnail.js'
