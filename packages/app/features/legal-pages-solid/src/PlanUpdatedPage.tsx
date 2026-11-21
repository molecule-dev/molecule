/**
 * Solid "Plan updated" confirmation screen: the auth-hydration spinner, the
 * confirmation itself, the confirmation call a hosted checkout return makes,
 * and its retry.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { Link, useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-solid'

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
 * Solid counterpart of `@molecule/app-legal-pages-react`'s `PlanUpdatedPage` —
 * the same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link PlanUpdatedPageProps}).
 * @returns The rendered plan-updated confirmation page.
 */
export const PlanUpdatedPage: Component<PlanUpdatedPageProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth()
  const verification = useVerifyPaymentReturn({
    provider: props.provider,
    enabled: props.verify ?? true,
  })

  const waiting = (): boolean => !auth.state().initialized || verification.status() === 'verifying'
  const failed = (): boolean => verification.status() === 'failed'

  return (
    <Show
      when={!waiting()}
      fallback={
        <Flex align="center" justify="center" className={cm.sp('py', 12)}>
          <Spinner />
        </Flex>
      }
    >
      <Show
        when={!failed()}
        fallback={
          <main data-mol-id="page-plan-updated" class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
            <h2
              class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}
              data-mol-id="plan-updated-error"
            >
              {t('planUpdated.verifyFailed', undefined, {
                defaultValue: 'We could not confirm your payment yet.',
              })}
            </h2>
            <Button onClick={verification.retry} data-mol-id="plan-updated-retry">
              {t('planUpdated.retry', undefined, { defaultValue: 'Try again' })}
            </Button>
          </main>
        }
      >
        <main data-mol-id="page-plan-updated" class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
          <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
            {t(
              props.messageKey ?? 'planUpdated.message',
              {},
              {
                defaultValue: props.messageDefault ?? 'Your plan has been updated.',
              },
            )}
          </h2>
          <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>
            {t(
              props.thankYouKey ?? 'planUpdated.thankYou',
              {},
              {
                defaultValue: props.thankYouDefault ?? 'Thank you!',
              },
            )}
          </h2>
          <Link to={props.actionHref ?? '/'}>
            <Button>
              {t(
                props.actionKey ?? 'planUpdated.returnHome',
                {},
                {
                  defaultValue: props.actionDefault ?? 'Return to Home',
                },
              )}
            </Button>
          </Link>
        </main>
      </Show>
    </Show>
  )
}
