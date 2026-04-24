import type { OAuthLogoProps } from './types.js'

const PATH =
  'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'

/**
 * X (formerly Twitter) brand mark. Monochrome only per X brand
 * guidelines; `mode` is ignored — always uses `currentColor`.
 *
 * Use either `<TwitterLogo/>` or `<XLogo/>` — they render the same SVG.
 * @param root0
 * @param root0.size
 * @param root0.className
 * @param root0.ariaLabel
 * @param root0.title
 */
export function TwitterLogo({
  size = 20,
  className,
  ariaLabel = 'X (Twitter)',
  title,
}: OAuthLogoProps) {
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
      fill="currentColor"
    >
      {title && <title>{title}</title>}
      <path d={PATH} />
    </svg>
  )
}

/** Alias of `TwitterLogo` — use the provider id that matches your OAuth config. */
export const XLogo = TwitterLogo
