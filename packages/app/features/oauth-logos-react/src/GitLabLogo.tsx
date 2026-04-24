import type { OAuthLogoProps } from './types.js'

/**
 * GitLab tanuki — official brand mark, normalized to a 24×24 viewBox.
 * `mode='mono'` renders a flat tanuki silhouette in `currentColor`.
 * @param root0
 * @param root0.size
 * @param root0.className
 * @param root0.mode
 * @param root0.ariaLabel
 * @param root0.title
 */
export function GitLabLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'GitLab',
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
          d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.866 0L16.419 9.45H7.582L4.916 1.263a.455.455 0 0 0-.866 0L1.386 9.452.045 13.587a.928.928 0 0 0 .336 1.039L12 22.928l11.62-8.302a.928.928 0 0 0 .335-1.039z"
        />
      ) : (
        <>
          <path fill="#E24329" d="M12 21.42l4.212-12.96H7.788z" />
          <path fill="#FCA326" d="M12 21.42l-4.212-12.96H1.883z" />
          <path fill="#E24329" d="M1.883 8.46L.605 12.39a.87.87 0 0 0 .316.972L12 21.42z" />
          <path fill="#FC6D26" d="M1.883 8.46h5.905L5.25.639a.432.432 0 0 0-.82 0z" />
          <path fill="#FCA326" d="M12 21.42l4.212-12.96h5.905z" />
          <path fill="#E24329" d="M22.117 8.46l1.278 3.93a.87.87 0 0 1-.316.972L12 21.42z" />
          <path fill="#FC6D26" d="M22.117 8.46h-5.905L18.75.639a.432.432 0 0 1 .82 0z" />
        </>
      )}
    </svg>
  )
}
