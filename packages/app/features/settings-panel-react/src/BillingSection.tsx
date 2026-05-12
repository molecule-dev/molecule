import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-react'

/**
 * Billing section — current plan + Upgrade button.
 *
 * Apps with a custom billing flow can omit this section and render
 * their own (e.g. linking to a Stripe customer portal).
 */
export function BillingSection({ plan = 'Free' }: { plan?: string } = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section>
      <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{t('settings.billing')}</h3>
      <Flex align="center" justify="between">
        <span className={cm.textSize('sm')}>
          {t('settings.plan')}
          <strong>{plan}</strong>
        </span>
        <Button variant="outline" size="sm">
          {t('settings.upgrade')}
        </Button>
      </Flex>
    </section>
  )
}
