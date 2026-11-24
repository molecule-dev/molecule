import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link ListingCardMedia}. */
export interface ListingCardMediaProps {
  /** Image URL or ReactNode. */
  src?: string
  alt?: string
  /** Override with a ReactNode (video, carousel, svg). */
  children?: ReactNode
  /** Aspect ratio (`'1/1' | '4/3' | '16/9' | '3/2'`), applied as an inline `aspect-ratio` style. Defaults to `'4/3'`. */
  aspect?: '1/1' | '4/3' | '16/9' | '3/2'
  /** Optional overlay node (badge, favorite heart). */
  overlay?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Media slot at the top of a `<ListingCard>`. Locks aspect ratio via
 * inline style so apps get consistent card sizing without custom CSS.
 * @param props - Component props (see {@link ListingCardMediaProps}).
 */
export function ListingCardMedia({
  src,
  alt,
  children: childrenProp,
  aspect = '4/3',
  overlay: overlayProp,
  className,
}: ListingCardMediaProps): JSX.Element {
  const children = slot(childrenProp)
  const overlay = slot(overlayProp)
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.position('relative'), className)}
      style={{ aspectRatio: aspect.replace('/', ' / ') }}
    >
      {children ??
        (src && (
          <img
            src={src}
            alt={alt ?? ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ))}
      {overlay && <div className={cm.cn(cm.position('absolute'), cm.inset0)}>{overlay}</div>}
    </div>
  )
}
