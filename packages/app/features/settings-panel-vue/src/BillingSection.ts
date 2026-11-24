/**
 * Vue billing section: the current plan label and the Upgrade navigation.
 *
 * Vue counterpart of `@molecule/app-settings-panel-react`'s
 * `BillingSection` — the same DOM, callbacks and service calls.
 *
 * @module
 */

import { defineComponent, h, onMounted, onUnmounted, type Ref, ref, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-vue'
import { useHttpClient, useRouter, useTranslation } from '@molecule/app-vue'

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
 * @returns The billing section component.
 */
export const BillingSection = defineComponent({
  name: 'BillingSection',
  props: {
    /** Fallback plan label when the status endpoint is unavailable. */
    plan: {
      type: String,
    },
    /** The app's page for choosing a plan, which the Upgrade button opens. */
    upgradeTo: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const router = useRouter()
    const http = useHttpClient()
    const livePlan: Ref<string | null> = ref(null)

    // Refresh the current plan from the bonded entitlements/billing
    // status endpoint on mount. Fire-and-forget; the prop-supplied
    // `plan` is the fallback if the fetch fails.
    let cancelled = false
    onMounted(() => {
      http
        .get<{ name?: string }>('/api/billing/status')
        .then((res) => {
          if (cancelled) return
          const body =
            (res as { data?: { name?: string }; name?: string }).data ?? (res as { name?: string })
          const name = body?.name
          if (typeof name === 'string' && name) livePlan.value = name
        })
        .catch((_error) => {
          // fallback to the prop-supplied plan label
        })
    })
    onUnmounted(() => {
      cancelled = true
    })

    return (): VNodeChild =>
      h('section', [
        h('h3', { class: cm.cn(cm.sectionHeading, cm.sp('mb', 3)) }, [
          t('settings.billing', undefined, { defaultValue: 'Billing' }),
        ]),
        h(Flex, { align: 'center', justify: 'between' }, () => [
          h('span', { class: cm.textSize('sm') }, [
            t('settings.plan', undefined, { defaultValue: 'Plan: ' }),
            h('strong', [
              livePlan.value ??
                props.plan ??
                t('settings.billing.freePlan', undefined, { defaultValue: 'Free' }),
            ]),
          ]),
          props.upgradeTo
            ? h(
                Button,
                { variant: 'outline', size: 'sm', onClick: () => router.navigate(props.upgradeTo) },
                () => [t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })],
              )
            : null,
        ]),
      ])
  },
})
