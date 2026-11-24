/**
 * The billing section.
 *
 * @module
 */

import { createSignal, type JSX, onCleanup } from 'solid-js'

import { useHttpClient, useRouter, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-solid'

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
 *
 * @param props - Component props.
 * @returns The billing section.
 */
export function BillingSection(props: {
  /** Fallback plan label until (or unless) `/api/billing/status` answers. */
  plan?: string
  /** The app's page for choosing a plan, which the Upgrade button opens. */
  upgradeTo: string
}): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const http = useHttpClient()
  const [livePlan, setLivePlan] = createSignal<string | null>(null)

  const plan = (): string => props.plan ?? 'Free'

  // Refresh the current plan from the bonded entitlements/billing
  // status endpoint on mount. Fire-and-forget; the prop-supplied
  // `plan` is the fallback if the fetch fails.
  let cancelled = false
  onCleanup(() => {
    cancelled = true
  })
  void http
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

  return (
    <section>
      <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
        {t('settings.billing', undefined, { defaultValue: 'Billing' })}
      </h3>
      <Flex align="center" justify="between">
        <span class={cm.textSize('sm')}>
          {t('settings.plan', undefined, { defaultValue: 'Plan: ' })}
          <strong>{livePlan() ?? plan()}</strong>
        </span>
        {props.upgradeTo ? (
          <Button variant="outline" size="sm" onClick={() => navigate(props.upgradeTo)}>
            {t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })}
          </Button>
        ) : null}
      </Flex>
    </section>
  )
}
