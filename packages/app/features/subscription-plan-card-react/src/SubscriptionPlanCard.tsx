import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'
import { Box, Link, Text } from '@molecule/app-ui-react/elements'

/** Props for the {@link SubscriptionPlanCard} component. */
export interface SubscriptionPlanCardProps {
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
 * @param props - Component props (see {@link SubscriptionPlanCardProps}).
 */
export function SubscriptionPlanCard({
  name,
  description: descriptionProp,
  price,
  interval: intervalProp,
  features,
  ctaLabel: ctaLabelProp,
  onCta,
  ctaHref,
  recommended,
  badge: badgeProp,
  className,
}: SubscriptionPlanCardProps): JSX.Element {
  const description = slot(descriptionProp)
  const interval = slot(intervalProp)
  const ctaLabel = slot(ctaLabelProp)
  const badge = slot(badgeProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  const cta = ctaHref ? (
    <Link to={ctaHref}>
      <Button variant="solid" color={recommended ? 'primary' : 'secondary'}>
        {ctaLabel}
      </Button>
    </Link>
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
      <Box as="div" className={cm.stack(4)}>
        <Box as="header" className={cm.stack(1 as const)}>
          {(badge || recommended) && (
            <Box as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {badge ?? t('plan.recommended', {}, { defaultValue: 'Recommended' })}
            </Box>
          )}
          <Text as="h3" className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {name}
          </Text>
          {description && (
            <Text as="p" className={cm.textSize('sm')}>
              {description}
            </Text>
          )}
        </Box>
        <Box as="div" className={cm.flex({ align: 'baseline', gap: 'xs' })}>
          <Box as="span" className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>
            {price}
          </Box>
          {interval && (
            <Box as="span" className={cm.textSize('sm')}>
              {interval}
            </Box>
          )}
        </Box>
        <Box as="ul" className={cm.stack(2)}>
          {features.map((f, i) => (
            <Box as="li" key={i} className={cm.flex({ align: 'start', gap: 'sm' })}>
              <Text as="span" aria-hidden>
                ✓
              </Text>
              <Box as="span" className={cm.textSize('sm')}>
                {f}
              </Box>
            </Box>
          ))}
        </Box>
        {ctaLabel && cta}
      </Box>
    </Card>
  )
}
