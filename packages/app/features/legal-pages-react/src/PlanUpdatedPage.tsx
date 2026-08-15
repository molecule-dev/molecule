import type { JSX } from 'react'
import { Link } from 'react-router'

import { useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-react'

/** Props for {@link PlanUpdatedPage}. */
export interface PlanUpdatedPageProps {
  /** i18n key for the primary message heading. */
  messageKey?: string
  /** Default message when the key is missing. */
  messageDefault?: string
  /** i18n key for the secondary heading. */
  thankYouKey?: string
  /** Default thank-you text when the key is missing. */
  thankYouDefault?: string
  /** i18n key for the action-button label. */
  actionKey?: string
  /** Default action label when the key is missing. */
  actionDefault?: string
  /** Href the action button navigates to. Defaults to `/`. */
  actionHref?: string
  /**
   * Provider name to verify the purchase with when the return URL carries no
   * `provider` parameter. Verification is skipped when neither names one.
   */
  provider?: string
  /**
   * Set `false` to render the confirmation without verifying the purchase —
   * only for apps that grant the plan some other way.
   */
  verify?: boolean
}

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
 * @param props - Component props (see {@link PlanUpdatedPageProps}).
 */
export function PlanUpdatedPage({
  messageKey = 'planUpdated.message',
  messageDefault = 'Your plan has been updated.',
  thankYouKey = 'planUpdated.thankYou',
  thankYouDefault = 'Thank you!',
  actionKey = 'planUpdated.returnHome',
  actionDefault = 'Return to Home',
  actionHref = '/',
  provider,
  verify = true,
}: PlanUpdatedPageProps = {}): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()
  const verification = useVerifyPaymentReturn({ provider, enabled: verify })

  if (!state.initialized || verification.status === 'verifying') {
    return (
      <Flex align="center" justify="center" className={cm.sp('py', 12)}>
        <Spinner />
      </Flex>
    )
  }

  if (verification.status === 'failed') {
    return (
      <main data-mol-id="page-plan-updated" className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
        <h2
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}
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
    )
  }

  return (
    <main data-mol-id="page-plan-updated" className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t(messageKey, {}, { defaultValue: messageDefault })}
      </h2>
      <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>
        {t(thankYouKey, {}, { defaultValue: thankYouDefault })}
      </h2>
      <Link to={actionHref}>
        <Button>{t(actionKey, {}, { defaultValue: actionDefault })}</Button>
      </Link>
    </main>
  )
}
