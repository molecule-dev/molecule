import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Auth-page brand header — a centered `<header>` wrapper holding a
 * gradient chip + wordmark + tagline.
 *
 * Composable by `children`: drop in `<AuthBrandHeaderChip>`,
 * `<AuthBrandHeaderWordmark>`, `<AuthBrandHeaderTagline>` — or any
 * bespoke nodes — as children. When `children` is omitted, the
 * `appName` / `tagline` / `icon` preset props render the default
 * chip + wordmark + tagline (the shape 38 flagship apps already use).
 *
 * @module
 */

/**
 * The gradient material-symbols chip shown above the wordmark.
 */
export interface AuthBrandHeaderChipProps {
  /** Material-symbol icon name shown inside the chip. */
  icon: string
  /**
   * CSS background value for the chip — typically a `linear-gradient(...)`.
   * Falls back to the wired ClassMap's `bg-primary` token when omitted, so
   * the chip's white icon glyph always has a colored backdrop.
   */
  chipGradient?: string
  /** Chip corner shape. `'round'` = `rounded-full`, `'square'` = `rounded-2xl`. */
  chipShape?: 'round' | 'square'
}

/**
 * Renders the gradient material-symbols chip shown above the wordmark.
 */
export function AuthBrandHeaderChip({
  icon,
  chipGradient,
  chipShape = 'round',
}: AuthBrandHeaderChipProps): JSX.Element {
  const cm = getClassMap()
  // When no `chipGradient` is supplied, fall back to `bg-primary` so the
  // white icon glyph always has a colored backdrop. Without this, apps
  // whose shims pass only `icon` (no gradient) render an invisible white
  // glyph on the white card surface.
  const chipClass = cm.cn(
    cm.w(12),
    cm.h(12),
    chipShape === 'round' ? cm.roundedFull : '',
    cm.flex({ align: 'center', justify: 'center' }),
    cm.sp('mb', 2),
    chipShape === 'square' ? 'rounded-2xl' : '',
    chipGradient ? '' : 'bg-primary',
    'shadow-md shadow-primary/30',
  )
  return (
    <div className={chipClass} style={chipGradient ? { background: chipGradient } : undefined}>
      <span
        className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        {icon}
      </span>
    </div>
  )
}

/**
 * The wordmark `<h1>`. Pass the brand name (or bespoke accented nodes)
 * as children; `className` appends to the default `4xl` extra-bold
 * treatment, `color` sets an inline color.
 */
export interface AuthBrandHeaderWordmarkProps {
  children: ReactNode
  /** Inline color for the `<h1>`. */
  color?: string
  /** Extra classes appended to the default wordmark `<h1>` chrome. */
  className?: string
}

/**
 * Renders the wordmark `<h1>` with optional inline color and extra classes.
 */
export function AuthBrandHeaderWordmark({
  children,
  color,
  className,
}: AuthBrandHeaderWordmarkProps): JSX.Element {
  const cm = getClassMap()
  // Default to `text-on-surface` so the wordmark renders with the
  // correct contrast in both light and dark themes when the parent
  // hasn't propagated a text color. Apps that supply `color` (inline
  // style) or override via `className` still win — the cm.cn call
  // appends `className` last.
  return (
    <h1
      className={cm.cn(
        cm.textSize('4xl'),
        'font-extrabold tracking-tighter text-on-surface',
        className,
      )}
      style={color ? { color } : undefined}
    >
      {children}
    </h1>
  )
}

/**
 * The tagline `<p>`. Pass the tagline text as children; `className`
 * appends to the default small muted treatment.
 */
export interface AuthBrandHeaderTaglineProps {
  children: ReactNode
  /** Extra classes appended to the default tagline `<p>` chrome. */
  className?: string
}

/**
 * Renders the tagline `<p>` with a muted style and optional extra classes.
 */
export function AuthBrandHeaderTagline({
  children,
  className,
}: AuthBrandHeaderTaglineProps): JSX.Element {
  const cm = getClassMap()
  return (
    <p
      className={cm.cn(
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        'text-on-surface-variant',
        className,
      )}
    >
      {children}
    </p>
  )
}

/**
 * Props for {@link AuthBrandHeader}.
 *
 * Pass `children` to compose the header from `<AuthBrandHeaderChip>` /
 * `<AuthBrandHeaderWordmark>` / `<AuthBrandHeaderTagline>` (or bespoke
 * nodes). Omit `children` to use preset mode — the `appName` /
 * `tagline` / `icon` props render the default chip + wordmark + tagline.
 */
export interface AuthBrandHeaderProps {
  /**
   * Composed header content. When set, the preset props below are
   * ignored and `children` renders inside the centered `<header>`.
   */
  children?: ReactNode
  /** Extra classes appended to the `<header>` wrapper. */
  className?: string
  // --- preset mode (used only when `children` is omitted) ---
  /** Brand name for the default wordmark. */
  appName?: string
  /** Tagline for the default tagline line. */
  tagline?: string
  /** Material-symbol icon name for the default chip (omit for no chip). */
  icon?: string
  /** CSS background for the default chip. */
  chipGradient?: string
  /** Default chip corner shape. */
  chipShape?: 'round' | 'square'
  /** Inline color for the default wordmark `<h1>`. */
  wordmarkColor?: string
}

/**
 * Centered auth-page brand header supporting both composable children and preset mode.
 */
export function AuthBrandHeader({
  children,
  className,
  appName,
  tagline,
  icon,
  chipGradient,
  chipShape,
  wordmarkColor,
}: AuthBrandHeaderProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <header className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }), className)}>
      {children ?? (
        <>
          {icon ? (
            <AuthBrandHeaderChip icon={icon} chipGradient={chipGradient} chipShape={chipShape} />
          ) : null}
          <AuthBrandHeaderWordmark color={wordmarkColor}>
            {t('authBrandHeader.appName', undefined, { defaultValue: appName ?? '' })}
          </AuthBrandHeaderWordmark>
          <AuthBrandHeaderTagline>
            {t('authBrandHeader.tagline', undefined, { defaultValue: tagline ?? '' })}
          </AuthBrandHeaderTagline>
        </>
      )}
    </header>
  )
}

export default AuthBrandHeader
