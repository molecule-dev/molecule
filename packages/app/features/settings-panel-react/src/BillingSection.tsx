import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-react'
import { useNavigate } from 'react-router-dom'

/**
 * Billing section — current plan + Upgrade button.
 *
 * Fetches `/api/billing/status` on mount and uses the returned plan
 * name as a more accurate label than the parent-supplied default.
 * The `plan` prop remains a fallback (e.g. for offline rendering or
 * apps that don't expose `/billing/status`).
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
  const http = useHttpClient()
  const [livePlan, setLivePlan] = useState<string | null>(null)

  // Refresh the current plan from the bonded entitlements/billing
  // status endpoint on mount. Fire-and-forget; the prop-supplied
  // `plan` is the fallback if the fetch fails.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ name?: string }>('/api/billing/status')
      .then((res) => {
        if (cancelled) return
        const body =
          (res as { data?: { name?: string }; name?: string }).data ?? (res as { name?: string })
        const name = body?.name
        if (typeof name === 'string' && name) setLivePlan(name)
      })
      .catch(() => {
        /* fallback to the prop-supplied plan label */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <section>
      <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{t('settings.billing')}</h3>
      <Flex align="center" justify="between">
        <span className={cm.textSize('sm')}>
          {t('settings.plan')}
          <strong>{livePlan ?? plan}</strong>
        </span>
        <Button variant="outline" size="sm" onClick={() => navigate(upgradeTo)}>
          {t('settings.upgrade')}
        </Button>
      </Flex>
    </section>
  )
}
