import type { JSX } from 'react'

import { Rect, Svg } from '@molecule/app-ui-react/elements'

import { untranslated } from './svg-attrs.js'
import type { OAuthLogoProps } from './types.js'

/**
 * Microsoft 4-square brand mark. `mode='brand'` renders the four
 * official squares; `mode='mono'` renders a flat 2×2 grid in
 * `currentColor`.
 * @param props - Component props.
 */
export function MicrosoftLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'Microsoft',
  title,
}: OAuthLogoProps): JSX.Element {
  const isMono = mode === 'mono'
  return (
    <Svg
      {...untranslated}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : true}
      className={className}
      metadata={title ? { title } : undefined}
    >
      {isMono ? (
        <>
          <Rect x={2} y={2} width={9} height={9} fill="currentColor" />
          <Rect x={13} y={2} width={9} height={9} fill="currentColor" opacity={0.85} />
          <Rect x={2} y={13} width={9} height={9} fill="currentColor" opacity={0.75} />
          <Rect x={13} y={13} width={9} height={9} fill="currentColor" opacity={0.6} />
        </>
      ) : (
        <>
          <Rect x={2} y={2} width={9} height={9} fill="#F25022" />
          <Rect x={13} y={2} width={9} height={9} fill="#7FBA00" />
          <Rect x={2} y={13} width={9} height={9} fill="#00A4EF" />
          <Rect x={13} y={13} width={9} height={9} fill="#FFB900" />
        </>
      )}
    </Svg>
  )
}
