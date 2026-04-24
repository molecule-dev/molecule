import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'

interface SubscriptionPlanCardProps {
  /** Plan name (e.g. "Pro", "Team", "Enterprise"). */
  name: ReactNode
  /** Optional tagline / one-liner. */
  description?: ReactNode
  /** Price string ("$19", "Free", "Custom") — apps own currency formatting. */
  price: ReactNode
  /** Billing interval label ("/month", "/yr", "per seat"). */
  interval?: ReactNode
  /** Bullet feature list. */
  features: ReactNode[]
  /** Primary CTA button label. */
  ctaLabel?: ReactNode
  /** Click / nav handler. */
  onCta?: () => void
  ctaHref?: string
  /** Visually highlight as the recommended / popular plan. */
  recommended?: boolean
  /** Optional badge content (e.g. "Most popular"). */
  badge?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Pricing / subscription plan card. Renders header (badge + name +
 * description), price + interval, feature checklist, and a primary
 * CTA (button or link).
 * @param root0
 * @param root0.name
 * @param root0.description
 * @param root0.price
 * @param root0.interval
 * @param root0.features
 * @param root0.ctaLabel
 * @param root0.onCta
 * @param root0.ctaHref
 * @param root0.recommended
 * @param root0.badge
 * @param root0.className
 */
export function SubscriptionPlanCard({
  name,
  description,
  price,
  interval,
  features,
  ctaLabel,
  onCta,
  ctaHref,
  recommended,
  badge,
  className,
}: SubscriptionPlanCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const cta = ctaHref ? (
    <a href={ctaHref}>
      <Button variant="solid" color={recommended ? 'primary' : 'secondary'}>
        {ctaLabel}
      </Button>
    </a>
  ) : (
    <Button variant="solid" color={recommended ? 'primary' : 'secondary'} onClick={onCta}>
      {ctaLabel}
    </Button>
  )
  return (
    <Card
      className={className}
      style={recommended ? { outline: '2px solid currentColor', outlineOffset: -2 } : undefined}
    >
      <div className={cm.stack(4)}>
        <header className={cm.stack(1 as const)}>
          {(badge || recommended) && (
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {badge ?? t('plan.recommended', {}, { defaultValue: 'Recommended' })}
            </span>
          )}
          <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{name}</h3>
          {description && <p className={cm.textSize('sm')}>{description}</p>}
        </header>
        <div className={cm.flex({ align: 'baseline', gap: 'xs' })}>
          <span className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>{price}</span>
          {interval && <span className={cm.textSize('sm')}>{interval}</span>}
        </div>
        <ul className={cm.stack(2)}>
          {features.map((f, i) => (
            <li key={i} className={cm.flex({ align: 'start', gap: 'sm' })}>
              <span aria-hidden>✓</span>
              <span className={cm.textSize('sm')}>{f}</span>
            </li>
          ))}
        </ul>
        {ctaLabel && cta}
      </div>
    </Card>
  )
}
