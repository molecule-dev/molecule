import type { CSSProperties, ElementType, HTMLAttributes, JSX, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { useTranslation } from '@molecule/app-react'
import type { StorageProvider } from '@molecule/app-storage'
import { getClassMap } from '@molecule/app-ui'

import { AuthFormStateProvider } from './AuthFormStateProvider.js'

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

/**
 * Full-screen container with centered-flex or column layout and optional background decoration support.
 */
export function AuthShellContainer({
  children,
  style,
  className,
  layout = 'centered',
}: AuthShellContainerProps): JSX.Element {
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
export function AuthShellDecoration({ children }: { children: ReactNode }): JSX.Element {
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

/**
 * Centered glassmorphic card surface with fixed flex-column layout and configurable surface treatment.
 */
export function AuthShellCard({
  children,
  surfaceClassName,
  className,
  outerClassName,
  dataMolId,
  style,
}: AuthShellCardProps): JSX.Element {
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

/**
 * Centered heading block with optional eyebrow tag, h1 title, and subheading paragraph.
 */
export function AuthShellHeading({
  heading,
  subheading,
  eyebrow,
  headingClassName,
  headingStyle,
}: AuthShellHeadingProps): JSX.Element {
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
export function AuthShellFooter({ children }: { children: ReactNode }): JSX.Element {
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

/**
 * Back-navigation link rendered below the card, defaulting to "Back to home" via i18n.
 */
export function AuthShellBackLink({ to = '/', label }: AuthShellBackLinkProps): JSX.Element {
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
 *
 * Provides only the structural concern (`flex-col` + `min-h-screen`).
 * Background, text color, and font are per-app — pass them via
 * `className`.
 */
export interface AuthShellSplitProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Cosmetic classes (background, text color, font) for the outer container. */
  className?: string
}

/**
 * Outer min-h-screen flex-col frame for the two-column brand-panel + card auth layout.
 */
export function AuthShellSplit({ children, className, ...rest }: AuthShellSplitProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), className)} {...rest}>
      {children}
    </div>
  )
}

/**
 * The vertically-flexed two-column row inside `<AuthShellSplit>` —
 * compose `<AuthShellPanel>` and `<AuthShellCardColumn>` as its
 * children. Split out from `<AuthShellSplit>` so a site `<Footer />`
 * can sit below the row as a sibling child rather than a slot prop.
 *
 * Provides only the `flex-1` vertical fill (so the row stretches and
 * any sibling footer sits at the bottom). The two-column layout itself
 * is the caller's choice — pass `className` with `cm.flex({})` for a
 * flex row or `cm.grid({ cols: 2 })` (or a custom grid template) so the
 * primitive never fights a grid-based shell.
 */
export interface AuthShellSplitRowProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /**
   * Layout classes for the row — typically `cm.flex({})` or
   * `cm.grid({ cols: 2 })`. Appended after the `flex-1` vertical fill.
   */
  className?: string
}

/**
 * Vertically-filling flex-1 row inside AuthShellSplit that holds the brand panel and card column.
 */
export function AuthShellSplitRow({
  children,
  className,
  ...rest
}: AuthShellSplitRowProps): JSX.Element {
  const cm = getClassMap()
  // `<main>` — the row is the auth page's primary content landmark.
  return (
    <main className={cm.cn(cm.flex1, className)} {...rest}>
      {children}
    </main>
  )
}

/**
 * A decorative `<aside>` that collapses on mobile (`hidden lg:flex`, the
 * one universally-shared concern) — the brand-panel half of
 * `<AuthShellSplit>`, or the decorative column of any grid-based auth
 * layout. Fill it with the app's bespoke decoration, wordmark, social
 * proof, etc. Pass `className` for width ratio, padding, gradient, and
 * positioning; extra props (`style`, `aria-*`, `data-*`) pass through to
 * the `<aside>`.
 */
export interface AuthShellPanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /** Cosmetic classes — width ratio, padding, gradient, positioning. */
  className?: string
}

/**
 * Decorative aside that collapses on mobile (hidden lg:flex) for the brand-panel half of a split auth layout.
 */
export function AuthShellPanel({ children, className, ...rest }: AuthShellPanelProps): JSX.Element {
  const cm = getClassMap()
  return (
    <aside className={cm.cn('hidden lg:flex', className)} {...rest}>
      {children}
    </aside>
  )
}

/**
 * A `<section>` (or `<main>`, via `as`) that centers its children on
 * both axes — the form-card half of `<AuthShellSplit>`, or the centered
 * content column of a header / main / footer stacked auth layout.
 * Provides only the `flex` centering; pass `className` for width ratio,
 * padding, and `flex-1`.
 */
export interface AuthShellCardColumnProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /** Cosmetic classes — width ratio, padding. */
  className?: string
  /**
   * Element to render. Defaults to `'section'`; pass `'main'` when the
   * card column is the auth page's primary content landmark — i.e. the
   * shell is not already wrapped in `<AuthShellSplitRow>` (which is
   * itself a `<main>`, so nesting another would be invalid).
   */
  as?: 'section' | 'main'
}

/**
 * Centered-flex section or main column for the form-card half of a split or stacked auth layout.
 */
export function AuthShellCardColumn({
  children,
  className,
  as = 'section',
  ...rest
}: AuthShellCardColumnProps): JSX.Element {
  const cm = getClassMap()
  const Tag = as as ElementType
  return (
    <Tag
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
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
  /**
   * Storage provider backing the cross-view auth form persistence
   * (email shared across Login/Signup/Forgot/Reset, cleared on success).
   * Defaults to a process-shared in-memory store; inject
   * `createSessionStorageProvider()` from
   * `@molecule/app-storage-localstorage` for tab-scoped persistence. The
   * shell renders an `<AuthFormStateProvider>`, so forms inside read it
   * via `useAuthFormStateContext()`.
   */
  formStateStorage?: StorageProvider
  /** Storage key for the persisted auth form state. */
  formStateKey?: string
}

/**
 * Convenience preset composing container, decoration, card, heading, footer, and back-link into a single component.
 *
 * Wraps its content in an `<AuthFormStateProvider>` so every form
 * rendered inside inherits cross-view email persistence via
 * `useAuthFormStateContext()`.
 */
export function AuthShell({
  heading,
  subheading,
  children,
  footer,
  brand,
  decoration,
  backTo = '/',
  showBackLink = true,
  formStateStorage,
  formStateKey,
}: AuthShellProps): JSX.Element {
  return (
    <AuthFormStateProvider storage={formStateStorage} storageKey={formStateKey}>
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
    </AuthFormStateProvider>
  )
}

export default AuthShell
