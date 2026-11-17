import type { Component } from 'solid-js'

import { untranslated } from './svg-attrs.js'
import type { OAuthLogoProps } from './types.js'

/**
 * Microsoft 4-square brand mark. `mode='brand'` renders the four
 * official squares; `mode='mono'` renders a flat 2×2 grid in
 * `currentColor`.
 * @param props - Component props.
 */
export const MicrosoftLogo: Component<OAuthLogoProps> = (props) => {
  const size = (): number => props.size ?? 20
  const ariaLabel = (): string => props.ariaLabel ?? 'Microsoft'
  const isMono = (): boolean => props.mode === 'mono'
  return (
    <svg
      {...untranslated}
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 24 24"
      role={ariaLabel() ? 'img' : undefined}
      aria-label={ariaLabel() || undefined}
      aria-hidden={ariaLabel() ? undefined : true}
      class={props.className}
    >
      {props.title && <title>{props.title}</title>}
      {isMono() ? (
        <>
          <rect x="2" y="2" width="9" height="9" fill="currentColor" />
          <rect x="13" y="2" width="9" height="9" fill="currentColor" opacity="0.85" />
          <rect x="2" y="13" width="9" height="9" fill="currentColor" opacity="0.75" />
          <rect x="13" y="13" width="9" height="9" fill="currentColor" opacity="0.6" />
        </>
      ) : (
        <>
          <rect x="2" y="2" width="9" height="9" fill="#F25022" />
          <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
          <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
          <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
        </>
      )}
    </svg>
  )
}
