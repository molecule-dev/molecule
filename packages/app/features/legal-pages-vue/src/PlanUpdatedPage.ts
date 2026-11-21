/**
 * Vue "Plan updated" confirmation screen: the auth-hydration spinner, the
 * confirmation itself, the confirmation call a hosted checkout return makes,
 * and its retry.
 *
 * @module
 */

import { defineComponent, h, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-vue'
import { Link, useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-vue'

import type { PlanUpdatedPageProps } from './types.js'

/**
 * "Plan updated" confirmation screen.
 *
 * Waits for auth state to initialize, then shows a two-line confirmation
 * with a single return-home action. i18n keys are configurable so apps
 * can match their existing locale shape.
 *
 * This is also where a hosted checkout's purchase is CONFIRMED: the provider
 * returns the buyer here with the payment id in the query, and
 * `useVerifyPaymentReturn` posts it to
 * `/users/:id/verify-payment/:provider` from the app origin, where the
 * session cookie applies. The page shows a spinner while that is in flight and
 * a retry if it fails, so a failed confirmation never reads as a thank-you.
 *
 * Vue counterpart of `@molecule/app-legal-pages-react`'s `PlanUpdatedPage` —
 * the same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link PlanUpdatedPageProps}).
 * @returns The plan-updated confirmation component.
 */
export const PlanUpdatedPage = defineComponent({
  name: 'PlanUpdatedPage',
  props: {
    messageKey: {
      type: String,
      default: 'planUpdated.message',
    },
    messageDefault: {
      type: String,
      default: 'Your plan has been updated.',
    },
    thankYouKey: {
      type: String,
      default: 'planUpdated.thankYou',
    },
    thankYouDefault: {
      type: String,
      default: 'Thank you!',
    },
    actionKey: {
      type: String,
      default: 'planUpdated.returnHome',
    },
    actionDefault: {
      type: String,
      default: 'Return to Home',
    },
    actionHref: {
      type: String,
      default: '/',
    },
    provider: String,
    verify: {
      type: Boolean,
      default: true,
    },
  },
  setup(props: PlanUpdatedPageProps) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const { state } = useAuth()
    const verification = useVerifyPaymentReturn({ provider: props.provider, enabled: props.verify })

    return (): VNode => {
      if (!state.value.initialized || verification.status.value === 'verifying') {
        return h(
          Flex,
          { align: 'center', justify: 'center', className: cm.sp('py', 12) },
          { default: () => [h(Spinner)] },
        )
      }

      if (verification.status.value === 'failed') {
        return h(
          'main',
          { 'data-mol-id': 'page-plan-updated', class: cm.cn(cm.textCenter, cm.sp('py', 12)) },
          [
            h(
              'h2',
              {
                class: cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8)),
                'data-mol-id': 'plan-updated-error',
              },
              t('planUpdated.verifyFailed', undefined, {
                defaultValue: 'We could not confirm your payment yet.',
              }),
            ),
            h(
              Button,
              { onClick: verification.retry, 'data-mol-id': 'plan-updated-retry' },
              {
                default: () => [t('planUpdated.retry', undefined, { defaultValue: 'Try again' })],
              },
            ),
          ],
        )
      }

      return h(
        'main',
        { 'data-mol-id': 'page-plan-updated', class: cm.cn(cm.textCenter, cm.sp('py', 12)) },
        [
          h(
            'h2',
            { class: cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2)) },
            t(
              props.messageKey ?? 'planUpdated.message',
              {},
              {
                defaultValue: props.messageDefault ?? 'Your plan has been updated.',
              },
            ),
          ),
          h(
            'h2',
            { class: cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8)) },
            t(
              props.thankYouKey ?? 'planUpdated.thankYou',
              {},
              {
                defaultValue: props.thankYouDefault ?? 'Thank you!',
              },
            ),
          ),
          h(
            Link,
            { to: props.actionHref ?? '/' },
            {
              default: () => [
                h(
                  Button,
                  {},
                  {
                    default: () => [
                      t(
                        props.actionKey ?? 'planUpdated.returnHome',
                        {},
                        {
                          defaultValue: props.actionDefault ?? 'Return to Home',
                        },
                      ),
                    ],
                  },
                ),
              ],
            },
          ),
        ],
      )
    }
  },
})
