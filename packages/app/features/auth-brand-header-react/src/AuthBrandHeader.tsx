import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Auth-page brand header — gradient material-symbols chip + large
 * wordmark + tagline. Replaces 41 byte-unique fleet copies.
 *
 * Apps customize via props:
 * - `icon` / `chipGradient` / `chipShape` — the optional gradient chip.
 * - `wordmarkColor` — recolor the default wordmark `<h1>`.
 * - `renderWordmark` — full render-prop override of the wordmark element,
 *   for per-character accent treatments (a glowing highlight letter, a
 *   trademark dot, etc.) the default `<h1>` cannot express.
 * - `renderTagline` — full render-prop override of the tagline element.
 * - `className` — extra classes appended to the `<header>` wrapper.
 *
 * The `appName` and `tagline` are passed in directly (typically from
 * the app's `branding.ts`); they're also routed through `t()` so a
 * locale bond can override them for non-English audiences. The
 * `render*` props receive the already-localized string.
 */
export interface AuthBrandHeaderProps {
  appName: string
  tagline: string
  /** Material-symbol icon name shown inside the gradient chip. */
  icon?: string
  /** CSS background value for the chip — typically a `linear-gradient(...)`. */
  chipGradient?: string
  /** Chip corner shape. `'round'` = `rounded-full`, `'square'` = `rounded-2xl`. */
  chipShape?: 'round' | 'square'
  /** CSS color for the default wordmark `<h1>`. Ignored when `renderWordmark` is set. */
  wordmarkColor?: string
  /**
   * Render-prop override for the wordmark element. Receives the
   * localized app name and returns the full wordmark node (typically an
   * `<h1>`). Use for accent treatments — a highlighted letter, a
   * trademark dot — that the default `<h1>{name}</h1>` cannot express.
   * When set, `wordmarkColor` is ignored (the render-prop owns it).
   */
  renderWordmark?: (name: string) => ReactNode
  /**
   * Render-prop override for the tagline element. Receives the
   * localized tagline and returns the full tagline node.
   */
  renderTagline?: (tagline: string) => ReactNode
  /** Extra classes appended to the `<header>` wrapper. */
  className?: string
}

export function AuthBrandHeader({
  appName,
  tagline,
  icon,
  chipGradient,
  chipShape = 'round',
  wordmarkColor,
  renderWordmark,
  renderTagline,
  className,
}: AuthBrandHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const localizedName = t('authBrandHeader.appName', undefined, { defaultValue: appName })
  const localizedTagline = t('authBrandHeader.tagline', undefined, { defaultValue: tagline })

  const chipClass = cm.cn(
    cm.w(12),
    cm.h(12),
    chipShape === 'round' ? cm.roundedFull : '',
    cm.flex({ align: 'center', justify: 'center' }),
    cm.sp('mb', 2),
    chipShape === 'square' ? 'rounded-2xl' : '',
    'shadow-md shadow-primary/30',
  )

  return (
    <header className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }), className)}>
      {icon ? (
        <div className={chipClass} style={chipGradient ? { background: chipGradient } : undefined}>
          <span
            className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>
      ) : null}
      {renderWordmark ? (
        renderWordmark(localizedName)
      ) : (
        <h1
          className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter')}
          style={wordmarkColor ? { color: wordmarkColor } : undefined}
        >
          {localizedName}
        </h1>
      )}
      {renderTagline ? (
        renderTagline(localizedTagline)
      ) : (
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {localizedTagline}
        </p>
      )}
    </header>
  )
}

export default AuthBrandHeader
