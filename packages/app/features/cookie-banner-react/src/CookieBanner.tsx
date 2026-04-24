import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Switch } from '@molecule/app-ui-react'

/**
 *
 */
export interface CookieCategory {
  id: string
  label: ReactNode
  description?: ReactNode
  /** Whether this category is required (always on). */
  required?: boolean
  /** Initial enabled state. */
  defaultEnabled?: boolean
}

interface CookieBannerProps {
  /** Cookie categories to offer (omit for a simple accept/reject banner). */
  categories?: CookieCategory[]
  /** Called when accept-all is clicked. */
  onAcceptAll?: () => void
  /** Called when reject-non-essential is clicked. */
  onRejectAll?: () => void
  /** Called when "Save preferences" is clicked. */
  onSave?: (enabled: Record<string, boolean>) => void
  /** Optional title. */
  title?: ReactNode
  /** Optional description. */
  description?: ReactNode
  /** Privacy policy link URL. */
  policyHref?: string
  /** Whether the banner is visible (controlled). */
  visible?: boolean
  /** Called when dismissed via Save / Accept / Reject. */
  onDismiss?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * GDPR / cookie-consent banner. Two modes:
 * - Simple: Accept / Reject buttons.
 * - Granular: Per-category toggles + "Save preferences".
 *
 * Apps own the actual cookie storage logic.
 * @param root0
 * @param root0.categories
 * @param root0.onAcceptAll
 * @param root0.onRejectAll
 * @param root0.onSave
 * @param root0.title
 * @param root0.description
 * @param root0.policyHref
 * @param root0.visible
 * @param root0.onDismiss
 * @param root0.className
 */
export function CookieBanner({
  categories,
  onAcceptAll,
  onRejectAll,
  onSave,
  title,
  description,
  policyHref,
  visible = true,
  onDismiss,
  className,
}: CookieBannerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [showDetails, setShowDetails] = useState(false)
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const c of categories ?? []) init[c.id] = c.required || !!c.defaultEnabled
    return init
  })
  if (!visible) return null
  /**
   *
   * @param fn
   */
  function dismissAfter(fn?: () => void) {
    fn?.()
    onDismiss?.()
  }
  return (
    <div
      role="dialog"
      aria-label={t('cookieBanner.title', {}, { defaultValue: 'Cookie preferences' })}
      className={cm.cn(cm.stack(3), cm.sp('p', 4), className)}
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 60,
        background: 'var(--color-surface, #fff)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
        maxWidth: 720,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <header className={cm.stack(1 as const)}>
        <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
          {title ?? t('cookieBanner.title', {}, { defaultValue: 'We use cookies' })}
        </h3>
        <p className={cm.textSize('sm')}>
          {description ??
            t(
              'cookieBanner.description',
              {},
              { defaultValue: 'We use cookies to improve your experience and analyse traffic.' },
            )}
          {policyHref && (
            <>
              {' '}
              <a href={policyHref} className={cm.link}>
                {t('cookieBanner.learnMore', {}, { defaultValue: 'Learn more' })}
              </a>
              .
            </>
          )}
        </p>
      </header>
      {showDetails && categories && (
        <div className={cm.stack(2)}>
          {categories.map((c) => (
            <div key={c.id} className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
              <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {c.label}
                </span>
                {c.description && <span className={cm.textSize('xs')}>{c.description}</span>}
              </div>
              <Switch
                checked={!!enabled[c.id] || !!c.required}
                disabled={c.required}
                onChange={(e) =>
                  setEnabled((p) => ({ ...p, [c.id]: (e.target as HTMLInputElement).checked }))
                }
              />
            </div>
          ))}
        </div>
      )}
      <footer className={cm.flex({ align: 'center', justify: 'end', gap: 'sm', wrap: 'wrap' })}>
        {categories && (
          <Button variant="ghost" size="sm" onClick={() => setShowDetails((x) => !x)}>
            {showDetails
              ? t('cookieBanner.hideDetails', {}, { defaultValue: 'Hide details' })
              : t('cookieBanner.customize', {}, { defaultValue: 'Customize' })}
          </Button>
        )}
        <Button variant="ghost" onClick={() => dismissAfter(onRejectAll)}>
          {t('cookieBanner.reject', {}, { defaultValue: 'Reject all' })}
        </Button>
        {showDetails && categories && onSave && (
          <Button variant="outline" onClick={() => dismissAfter(() => onSave(enabled))}>
            {t('cookieBanner.save', {}, { defaultValue: 'Save preferences' })}
          </Button>
        )}
        <Button variant="solid" color="primary" onClick={() => dismissAfter(onAcceptAll)}>
          {t('cookieBanner.accept', {}, { defaultValue: 'Accept all' })}
        </Button>
      </footer>
    </div>
  )
}
