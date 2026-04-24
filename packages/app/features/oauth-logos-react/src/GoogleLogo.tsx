import type { OAuthLogoProps } from './types.js'

/**
 * Google "G" mark — per Google brand guidelines the 4-color logo is
 * required when space allows. In `mode='mono'` the logo flattens to
 * `currentColor` for use inside monochrome button rows.
 * @param root0
 * @param root0.size
 * @param root0.className
 * @param root0.mode
 * @param root0.ariaLabel
 * @param root0.title
 */
export function GoogleLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'Google',
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
        <path
          fill="currentColor"
          d="M12 10.999h10.8c.1.7.2 1.3.2 2 0 5.5-3.7 10-11 10-6.1 0-11-4.9-11-11S5.9 1 12 1c3 0 5.5 1.1 7.4 2.9l-3 3c-.8-.8-2.2-1.8-4.4-1.8C8.1 5.1 4.9 8.4 4.9 12s3.2 6.9 7.1 6.9c4.5 0 6.2-3.2 6.5-4.9H12v-3z"
        />
      ) : (
        <>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </>
      )}
    </svg>
  )
}
