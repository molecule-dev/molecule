import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Anchor, Box, Pressable, Text } from '@molecule/app-ui-react/elements'

/** Props for `<PlanUpdatedPage />`. */
export interface PlanUpdatedPageProps {
  /**
   * Optional new plan name to include in the heading (e.g. `'Pro'`).
   * When omitted, a generic heading is rendered.
   */
  planName?: string

  /**
   * Optional CTA label / target. Renders a primary button when both
   * `ctaLabel` and one of `onCta` / `ctaHref` are supplied. A typical
   * use is "Continue to dashboard".
   */
  ctaLabel?: ReactNode

  /** Click handler for the CTA. Mutually exclusive with `ctaHref`. */
  onCta?: () => void

  /** Anchor target for the CTA. Mutually exclusive with `onCta`. */
  ctaHref?: string

  /** Optional className applied to the outer wrapper. */
  className?: string
}

/**
 * Post-checkout success page. Rendered after Stripe redirects the user
 * back from Checkout (the standard `success_url` route in mlcl
 * flagship apps). All copy is i18n-driven so apps can localise the
 * heading without overriding the component.
 *
 * @param props - Component props (see `PlanUpdatedPageProps`).
 * @returns The rendered success page.
 */
export function PlanUpdatedPage(props: PlanUpdatedPageProps): React.ReactElement {
  const { planName, ctaLabel: ctaLabelProp, onCta, ctaHref, className } = props
  const ctaLabel = slot(ctaLabelProp)
  const cm = getClassMap()
  const { t } = useTranslation()

  const heading = planName
    ? t(
        'pricingPage.planUpdated.headingNamed',
        { planName },
        { defaultValue: "You're now on the {{planName}} plan" },
      )
    : t('pricingPage.planUpdated.heading', undefined, {
        defaultValue: 'Your plan has been updated',
      })

  const cta = ctaLabel ? (
    ctaHref ? (
      <Anchor
        href={ctaHref}
        className={cm.button({ variant: 'solid', size: 'md' })}
        data-mol-id="plan-updated-cta"
      >
        {ctaLabel}
      </Anchor>
    ) : (
      <Pressable
        as="button"
        type="button"
        className={cm.button({ variant: 'solid', size: 'md' })}
        onClick={onCta}
        data-mol-id="plan-updated-cta"
      >
        {ctaLabel}
      </Pressable>
    )
  ) : null

  return (
    <Box as="section" className={className} data-mol-id="plan-updated-page">
      <Box as="header" className={cm.cardHeader}>
        <Text as="h1" className={cm.cardTitle}>
          {heading}
        </Text>
        <Text as="p" className={cm.cardDescription}>
          {t('pricingPage.planUpdated.body', undefined, {
            defaultValue:
              'Thanks for upgrading. Your new plan is active immediately and a receipt has been emailed to you.',
          })}
        </Text>
      </Box>
      {cta && (
        <Box as="footer" className={cm.cardFooter}>
          {cta}
        </Box>
      )}
    </Box>
  )
}
