import { Link } from 'react-router-dom'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-react'

interface PlanUpdatedPageProps {
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
}

/**
 * "Plan updated" confirmation screen.
 *
 * Waits for auth state to initialize, then shows a two-line confirmation
 * with a single return-home action. i18n keys are configurable so apps
 * can match their existing locale shape.
 * @param root0
 * @param root0.messageKey
 * @param root0.messageDefault
 * @param root0.thankYouKey
 * @param root0.thankYouDefault
 * @param root0.actionKey
 * @param root0.actionDefault
 * @param root0.actionHref
 */
export function PlanUpdatedPage({
  messageKey = 'planUpdated.message',
  messageDefault = 'Your plan has been updated.',
  thankYouKey = 'planUpdated.thankYou',
  thankYouDefault = 'Thank you!',
  actionKey = 'planUpdated.returnHome',
  actionDefault = 'Return to Home',
  actionHref = '/',
}: PlanUpdatedPageProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()

  if (!state.initialized) {
    return (
      <Flex align="center" justify="center" className={cm.sp('py', 12)}>
        <Spinner />
      </Flex>
    )
  }

  return (
    <div className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t(messageKey, {}, { defaultValue: messageDefault })}
      </h2>
      <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>
        {t(thankYouKey, {}, { defaultValue: thankYouDefault })}
      </h2>
      <Link to={actionHref}>
        <Button>{t(actionKey, {}, { defaultValue: actionDefault })}</Button>
      </Link>
    </div>
  )
}
