import type { OAuthLogoProps } from './types.js'

/**
 * Microsoft 4-square brand mark. `mode='brand'` renders the four
 * official squares; `mode='mono'` renders a flat 2×2 grid in
 * `currentColor`.
 * @param root0
 * @param root0.size
 * @param root0.className
 * @param root0.mode
 * @param root0.ariaLabel
 * @param root0.title
 */
export function MicrosoftLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'Microsoft',
  title,
}: OAuthLogoProps) {
  const isMono = mode === 'mono'
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : true}
      className={className}
    >
      {title && <title>{title}</title>}
      {isMono ? (
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
