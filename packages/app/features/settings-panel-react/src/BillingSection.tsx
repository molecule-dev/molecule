import { type JSX, useEffect, useState } from 'react'

import { useHttpClient, useNavigate, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/**
 * Billing section — current plan + Upgrade button.
 *
 * Fetches `/api/billing/status` on mount and uses the returned plan
 * name as a more accurate label than the parent-supplied default.
 * The `plan` prop remains a fallback (e.g. for offline rendering or
 * apps that don't expose `/billing/status`).
 *
 * The Upgrade button opens `upgradeTo`, the app's page for choosing a plan
 * (`/pricing`, `/billing`). It has no default: no one route is right for
 * every app, and the settings page this section sits in has no plans to
 * choose. An app with no such page renders `<TiersUpgradeSection>`, which
 * lists the tiers and starts the checkout itself. A section given no
 * `upgradeTo` anyway (from JavaScript, or a template the compiler does not
 * check) shows the plan without the button.
 */
export function BillingSection({
  plan,
  upgradeTo,
}: {
  plan?: string
  upgradeTo: string
}): JSX.Element {
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
      .catch((_error) => {
        /* fallback to the prop-supplied plan label */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <Box as="section">
      <Text as="h3" className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
        {t('settings.billing', undefined, { defaultValue: 'Billing' })}
      </Text>
      <Flex align="center" justify="between">
        <Text as="span" className={cm.textSize('sm')}>
          {t('settings.plan', undefined, { defaultValue: 'Plan: ' })}
          <Text as="strong">
            {livePlan ??
              plan ??
              t('settings.billing.freePlan', undefined, { defaultValue: 'Free' })}
          </Text>
        </Text>
        {upgradeTo ? (
          <Button variant="outline" size="sm" onClick={() => navigate(upgradeTo)}>
            {t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })}
          </Button>
        ) : null}
      </Flex>
    </Box>
  )
}
