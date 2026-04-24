import type { OAuthLogoProps } from './types.js'

const F_PATH =
  'M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z'
const BG_PATH =
  'M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46H15.19c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z'

/**
 * Facebook "f" mark. `mode='brand'` renders the blue circle with white
 * "f"; `mode='mono'` renders a monochrome "f" in `currentColor`.
 * @param root0
 * @param root0.size
 * @param root0.className
 * @param root0.mode
 * @param root0.ariaLabel
 * @param root0.title
 */
export function FacebookLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'Facebook',
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
      fill={isMono ? 'currentColor' : undefined}
    >
      {title && <title>{title}</title>}
      {isMono ? (
        <path d={F_PATH} />
      ) : (
        <>
          <path d={BG_PATH} fill="#1877F2" />
          <path d={F_PATH} fill="#fff" />
        </>
      )}
    </svg>
  )
}
