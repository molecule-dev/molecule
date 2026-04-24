import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ListingCardMediaProps {
  /** Image URL or ReactNode. */
  src?: string
  alt?: string
  /** Override with a ReactNode (video, carousel, svg). */
  children?: ReactNode
  /** Aspect-ratio class (token from ClassMap, e.g. `'square' | '4/3' | '16/9'`). */
  aspect?: '1/1' | '4/3' | '16/9' | '3/2'
  /** Optional overlay node (badge, favorite heart). */
  overlay?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Media slot at the top of a `<ListingCard>`. Locks aspect ratio via
 * inline style so apps get consistent card sizing without custom CSS.
 * @param root0
 * @param root0.src
 * @param root0.alt
 * @param root0.children
 * @param root0.aspect
 * @param root0.overlay
 * @param root0.className
 */
export function ListingCardMedia({
  src,
  alt,
  children,
  aspect = '4/3',
  overlay,
  className,
}: ListingCardMediaProps) {
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
