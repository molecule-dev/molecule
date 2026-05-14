import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Outer full-screen container — centered Flex, padded, with optional
 * absolute-positioned background decoration child.
 *
 * Compose with `<AuthShellCard>` (and friends) inside.
 */
export interface AuthShellContainerProps {
  children: ReactNode
  /** Optional CSS background applied to the container. */
  style?: CSSProperties
  /** Optional extra className appended after defaults. */
  className?: string
  /** Layout direction. Defaults to centered-Flex; pass `'column'` for a vertical stack (top-bar / main / footer). */
  layout?: 'centered' | 'column'
}

export function AuthShellContainer({
  children,
  style,
  className,
  layout = 'centered',
}: AuthShellContainerProps) {
  const cm = getClassMap()
  const base =
    layout === 'column'
      ? cm.cn(
          cm.flex({ direction: 'col' }),
          cm.minH('screen'),
          'relative overflow-hidden bg-background text-on-surface',
        )
      : cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          cm.sp('p', 6),
          'relative overflow-hidden bg-background text-on-surface',
        )
  return (
    <div className={cm.cn(base, className)} style={style}>
      {children}
    </div>
  )
}

/**
 * Absolute-positioned background decoration layer — orbs, mesh gradients,
 * radial glows. Children render inside a `pointer-events-none absolute
 * inset-0 -z-10 overflow-hidden` wrapper.
 */
export function AuthShellDecoration({ children }: { children: ReactNode }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden')}>
      {children}
    </div>
  )
}

/**
 * The centered glassmorphic card surface. Layout (flex column + padding)
 * is fixed; the visible surface (rounded / bg / border / shadow) is the
 * default glass treatment, replaceable per-app via `surfaceClassName`.
 *
 * Pass `outerClassName` to override the outer `<main>` width / max-width
 * constraint (default `max-w-md`).
 */
export interface AuthShellCardProps {
  children: ReactNode
  /** Override the default glass surface (rounded + bg + border + shadow). */
  surfaceClassName?: string
  /** Extra layout classes to append (after flex/padding defaults). */
  className?: string
  /** Override the outer `<main>` wrapper classes (defaults to `cm.w('full') max-w-md relative z-10`). */
  outerClassName?: string
  /** data-mol-id pass-through for E2E selectors. */
  dataMolId?: string
  style?: CSSProperties
}

const DEFAULT_SURFACE_CLASSES =
  'rounded-3xl border border-white/40 bg-surface-container-lowest/80 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(116,47,229,0.30)]'

export function AuthShellCard({
  children,
  surfaceClassName,
  className,
  outerClassName,
  dataMolId,
  style,
}: AuthShellCardProps) {
  const cm = getClassMap()
  const outer = outerClassName ?? cm.cn(cm.w('full'), 'max-w-md relative z-10')
  return (
    <main className={outer}>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 8),
          surfaceClassName ?? DEFAULT_SURFACE_CLASSES,
          className,
        )}
        style={style}
        data-mol-id={dataMolId}
      >
        {children}
      </div>
    </main>
  )
}

/**
 * Heading block — optional eyebrow + h1 + optional subheading. All centered.
 */
export interface AuthShellHeadingProps {
  heading: string
  subheading?: string
  /** Optional small uppercase tag rendered above the heading. */
  eyebrow?: string
  /** Optional override for the h1 className (e.g. custom font-family). */
  headingClassName?: string
  /** Optional override for the h1 style. */
  headingStyle?: CSSProperties
}

export function AuthShellHeading({
  heading,
  subheading,
  eyebrow,
  headingClassName,
  headingStyle,
}: AuthShellHeadingProps) {
  const cm = getClassMap()
  return (
    <header className={cm.flex({ direction: 'col', align: 'center', gap: 'xs' })}>
      {eyebrow ? (
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {eyebrow}
        </span>
      ) : null}
      <h1
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          'tracking-tight text-on-surface text-center',
          headingClassName,
        )}
        style={headingStyle}
      >
        {heading}
      </h1>
      {subheading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant text-center max-w-sm')}>
          {subheading}
        </p>
      ) : null}
    </header>
  )
}

/**
 * Footer inside the card — small text with a top border.
 */
export function AuthShellFooter({ children }: { children: ReactNode }) {
  const cm = getClassMap()
  return (
    <footer
      className={cm.cn(
        cm.textCenter,
        cm.textSize('sm'),
        'text-on-surface-variant border-t border-outline-variant/10 pt-6',
      )}
    >
      {children}
    </footer>
  )
}

/**
 * "Back to home" link (or custom destination) rendered below the card.
 */
export interface AuthShellBackLinkProps {
  to?: string
  /** Translated label override; falls back to `auth.backHome` → "Back to home". */
  label?: string
}

export function AuthShellBackLink({ to = '/', label }: AuthShellBackLinkProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <p
      className={cm.cn(cm.textCenter, cm.textSize('xs'), cm.sp('mt', 6), 'text-on-surface-variant')}
    >
      <Link
        to={to}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'hover:text-primary transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: 14 }}>
          arrow_back
        </span>
        {label ?? t('auth.backHome', undefined, { defaultValue: 'Back to home' })}
      </Link>
    </p>
  )
}

/**
 * Outer frame for the two-column "decorated brand panel + card" auth
 * layout — the dominant shape across the fleet's polished auth pages.
 *
 * A `min-h-screen` vertical stack: compose an `<AuthShellSplitRow>` (the
 * brand-panel + card-column row) as a child, and optionally a site
 * `<Footer />` after it. The row flexes to fill, so the footer sits at
 * the bottom.
 */
export interface AuthShellSplitProps {
  children: ReactNode
  /** Extra classes on the outer container. */
  className?: string
}

export function AuthShellSplit({ children, className }: AuthShellSplitProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * The flex-fill two-column row inside `<AuthShellSplit>` — compose
 * `<AuthShellPanel>` and `<AuthShellCardColumn>` as its children. Split
 * out from `<AuthShellSplit>` so a site `<Footer />` can sit below the
 * row as a sibling child rather than a slot prop.
 */
export interface AuthShellSplitRowProps {
  children: ReactNode
  /** Extra classes on the row. */
  className?: string
}

export function AuthShellSplitRow({ children, className }: AuthShellSplitRowProps) {
  const cm = getClassMap()
  return <div className={cm.cn(cm.flex1, cm.flex({}), className)}>{children}</div>
}

/**
 * The brand-panel half of `<AuthShellSplit>` — `hidden lg:flex` so it
 * collapses on mobile. Fill it with the app's bespoke decoration,
 * wordmark, social proof, etc. Pass `className` to tune the width ratio
 * / gradient (default: half-width column with generous padding).
 */
export interface AuthShellPanelProps {
  children: ReactNode
  /** Override the panel width + chrome (default `w-1/2` padded column). */
  className?: string
}

export function AuthShellPanel({ children, className }: AuthShellPanelProps) {
  const cm = getClassMap()
  return (
    <aside
      className={
        className ??
        cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 12),
          'relative overflow-hidden hidden lg:flex w-1/2',
        )
      }
    >
      {children}
    </aside>
  )
}

/**
 * The form-card half of `<AuthShellSplit>` — centers its children
 * (typically an `<AuthShellCard>`) in a padded column. Pass `className`
 * to tune the width ratio so it pairs with `<AuthShellPanel>`.
 */
export interface AuthShellCardColumnProps {
  children: ReactNode
  /** Override the column width + chrome (default `w-full lg:w-1/2`). */
  className?: string
}

export function AuthShellCardColumn({ children, className }: AuthShellCardColumnProps) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'w-full lg:w-1/2',
        className,
      )}
    >
      {children}
    </section>
  )
}

/**
 * Convenience preset for the most common layout: centered glass card
 * with optional decoration, brand panel, heading, body, footer, and a
 * "Back to home" link below the card. Equivalent to manually composing
 * `<AuthShellContainer>` + `<AuthShellDecoration>` + `<AuthShellCard>`
 * + `<AuthShellHeading>` + `<AuthShellFooter>` + `<AuthShellBackLink>`.
 *
 * For the two-column "brand panel + card" shape, use `<AuthShellSplit>`
 * + `<AuthShellPanel>` + `<AuthShellCardColumn>` instead.
 */
export interface AuthShellProps {
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
  brand?: ReactNode
  decoration?: ReactNode
  backTo?: string
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
  return (
    <AuthShellContainer>
      {decoration ? <AuthShellDecoration>{decoration}</AuthShellDecoration> : null}
      <div>
        <AuthShellCard>
          {brand}
          <AuthShellHeading heading={heading} subheading={subheading} />
          {children}
          {footer ? <AuthShellFooter>{footer}</AuthShellFooter> : null}
        </AuthShellCard>
        {showBackLink ? <AuthShellBackLink to={backTo} /> : null}
      </div>
    </AuthShellContainer>
  )
}

export default AuthShell
