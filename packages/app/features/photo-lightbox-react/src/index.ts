/**
 * Fullscreen photo viewer.
 *
 * Exports `<PhotoLightbox>` and `LightboxPhoto` type.
 *
 * @example
 * ```tsx
 * import { PhotoLightbox, LightboxPhoto } from '@molecule/app-photo-lightbox-react'
 *
 * const photos: LightboxPhoto[] = [
 *   { src: '/images/photo1.jpg', alt: 'Mountain view', caption: 'Summit at dawn' },
 *   { src: '/images/photo2.jpg', alt: 'Valley below' },
 * ]
 *
 * <PhotoLightbox
 *   photos={photos}
 *   open={lightboxOpen}
 *   onClose={() => setLightboxOpen(false)}
 *   initialIndex={selectedIndex}
 * />
 * ```
 *
 * @module
 */

export * from './PhotoLightbox.js'
