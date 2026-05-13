import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-react'
import { useNavigate } from 'react-router-dom'

/**
 * Billing section — current plan + Upgrade button.
 *
 * The Upgrade button navigates to `upgradeTo` (default `/settings`).
 * Pass `upgradeTo="/billing"` or `upgradeTo="/pricing"` if your app
 * routes elsewhere. Apps with a multi-tier checkout flow should use
 * `<TiersUpgradeSection>` instead.
 */
export function BillingSection({
  plan = 'Free',
  upgradeTo = '/settings',
}: { plan?: string; upgradeTo?: string } = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <section>
      <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{t('settings.billing')}</h3>
      <Flex align="center" justify="between">
        <span className={cm.textSize('sm')}>
          {t('settings.plan')}
          <strong>{plan}</strong>
        </span>
        <Button variant="outline" size="sm" onClick={() => navigate(upgradeTo)}>
          {t('settings.upgrade')}
        </Button>
      </Flex>
    </section>
  )
}
