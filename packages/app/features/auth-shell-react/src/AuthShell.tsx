import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Centered glassmorphic auth-page shell — used by every Login,
 * Signup, ForgotPassword, ResetPassword. Composable children let
 * each app inject its own decorative background and brand mark.
 *
 * Anatomy:
 * - Full-screen centered Flex container, padded.
 * - Optional `<AuthShell.Decoration>` absolute-positioned background.
 * - Centered glass card (rounded, translucent, backdrop-blur).
 * - Optional `<AuthShell.Brand>` (logo + tagline) at top of card.
 * - `heading` + `subheading` props.
 * - `children` slot for the auth form.
 * - Optional `footer` slot.
 * - "Back to home" link below card (toggle via `showBackLink`).
 */
export interface AuthShellProps {
  heading: string
  subheading: string
  children: ReactNode
  /** Footer ReactNode (e.g. "Already have an account? Sign in"). */
  footer?: ReactNode
  /** Brand panel rendered above the heading. Usually `<AuthShell.Brand>` or a custom mark. */
  brand?: ReactNode
  /** Decorative background (orbs, mesh-gradient, etc.) rendered absolute behind the card. */
  decoration?: ReactNode
  /** Back-link target. Defaults to `/`. */
  backTo?: string
  /** Whether to render the "Back to home" link below the card. Default true. */
  showBackLink?: boolean
}

export function AuthShell({
  heading,
  subheading,
  children,
  footer,
  brand,
  decoration,
  backTo = '/',
  showBackLink = true,
}: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 6),
        'relative overflow-hidden bg-background text-on-surface',
      )}
    >
      {decoration ? (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {decoration}
        </div>
      ) : null}

      <main className={cm.cn(cm.w('full'), 'max-w-md')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 8),
            'rounded-3xl border border-white/40 bg-surface-container-lowest/80 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(116,47,229,0.30)]',
          )}
        >
          {brand}

          <header className={cm.flex({ direction: 'col', align: 'center', gap: 'xs' })}>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface text-center',
              )}
            >
              {heading}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant text-center max-w-sm')}>
              {subheading}
            </p>
          </header>

          {children}

          {footer ? (
            <footer
              className={cm.cn(
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant border-t border-outline-variant/10 pt-6',
              )}
            >
              {footer}
            </footer>
          ) : null}
        </div>

        {showBackLink ? (
          <p
            className={cm.cn(
              cm.textCenter,
              cm.textSize('xs'),
              cm.sp('mt', 6),
              'text-on-surface-variant',
            )}
          >
            <Link
              to={backTo}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'hover:text-primary transition-colors',
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                arrow_back
              </span>
              {t('auth.backHome', undefined, { defaultValue: 'Back to home' })}
            </Link>
          </p>
        ) : null}
      </main>
    </div>
  )
}

export default AuthShell
