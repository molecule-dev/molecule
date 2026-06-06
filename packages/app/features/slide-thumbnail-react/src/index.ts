/**
 * Slide thumbnail tile for presentation editors / slideshow navigators.
 *
 * Exports `<SlideThumbnail>`.
 *
 * @example
 * ```tsx
 * import { SlideThumbnail } from '@molecule/app-slide-thumbnail-react'
 *
 * export function SlideStrip({ slides, activeIndex, onSelect }) {
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
 *           <SlidePreview slide={slide} />
 *         </SlideThumbnail>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './SlideThumbnail.js'
