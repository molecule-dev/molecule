import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link FloatingActionButton}. */
export interface FloatingActionButtonProps {
  /** Icon rendered inside the FAB. */
  icon: ReactNode
  /** Accessible label / tooltip text (usually `t('...')`). */
  label: string
  /** Click handler (mutually exclusive with `href`). */
  onClick?: () => void
  /** Navigation target (mutually exclusive with `onClick`). */
  href?: string
  /** Screen corner for anchoring. Defaults to `'bottom-right'`. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Visual size. */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the label on hover. Defaults to true. */
  showTooltip?: boolean
  /** Extra classes. */
  className?: string
}

const POSITION_STYLES: Record<
  NonNullable<FloatingActionButtonProps['position']>,
  React.CSSProperties
> = {
  'bottom-right': { position: 'fixed', right: 24, bottom: 24 },
  'bottom-left': { position: 'fixed', left: 24, bottom: 24 },
  'top-right': { position: 'fixed', right: 24, top: 24 },
  'top-left': { position: 'fixed', left: 24, top: 24 },
}

const SIZE_MAP = { sm: 10, md: 14, lg: 16 } as const

/**
 * Fixed-position circular action button. Renders either an anchor (when
 * `href` is set) or a button (when `onClick` is set). Positioning is
 * inline-style so the component works without extra CSS setup, and it ships
 * with a visible default surface (primary gradient + soft elevation, via the
 * `gradientPrimary`/`shadowLifted` ClassMap tokens) so an out-of-the-box FAB
 * is prominent in both light and dark themes. Pass `className` to override the
 * surface — caller classes are resolved last by `cm.cn` (tailwind-merge).
 * @param props - Component props (see {@link FloatingActionButtonProps}).
 */
export function FloatingActionButton({
  icon,
  label,
  onClick,
  href,
  position = 'bottom-right',
  size = 'md',
  showTooltip = true,
  className,
}: FloatingActionButtonProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const dim = SIZE_MAP[size] * 4 // px
  // A FAB is a prominent primary action, so it must be visible out of the box.
  // `gradientPrimary` supplies the primary surface AND the contrasting
  // `on-primary` icon color; `shadowLifted` adds elevation. Both are
  // theme-aware. They precede `className` so a caller-supplied surface class
  // (resolved last by tailwind-merge in `cm.cn`) overrides the default.
  const commonClass = cm.cn(
    cm.flex({ align: 'center', justify: 'center' }),
    cm.roundedFull,
    cm.gradientPrimary,
    cm.shadowLifted,
    className,
  )
  const style: React.CSSProperties = {
    ...POSITION_STYLES[position],
    width: dim,
    height: dim,
    zIndex: 40,
  }
  const ariaLabel = t(label, {}, { defaultValue: label })
  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        title={showTooltip ? ariaLabel : undefined}
        className={commonClass}
        style={style}
      >
        {icon}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={showTooltip ? ariaLabel : undefined}
      className={commonClass}
      style={style}
    >
      {icon}
    </button>
  )
}
