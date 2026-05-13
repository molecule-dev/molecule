import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Auth-page brand header — gradient material-symbols chip + large
 * wordmark + tagline. Replaces 41 byte-unique fleet copies.
 *
 * Apps customize via props: `icon` (material symbol name),
 * `chipGradient` (CSS gradient string for the chip background),
 * `chipShape` (`'round'` or `'square'`), and `wordmarkColor`.
 *
 * The `appName` and `tagline` are passed in directly (typically from
 * the app's `branding.ts`); they're also routed through `t()` so a
 * locale bond can override them for non-English audiences.
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
  /** CSS color for the wordmark `<h1>`. Defaults to inherit. */
  wordmarkColor?: string
}

export function AuthBrandHeader({
  appName,
  tagline,
  icon,
  chipGradient,
  chipShape = 'round',
  wordmarkColor,
}: AuthBrandHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

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
    <header className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }))}>
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
      <h1
        className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter')}
        style={wordmarkColor ? { color: wordmarkColor } : undefined}
      >
        {t('authBrandHeader.appName', undefined, { defaultValue: appName })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
        {t('authBrandHeader.tagline', undefined, { defaultValue: tagline })}
      </p>
    </header>
  )
}

export default AuthBrandHeader
