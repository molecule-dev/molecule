import { Link } from 'react-router-dom'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-react'

/**
 * Post-purchase confirmation page rendered after a plan upgrade.
 *
 * Reads auth state via `useAuth`; while it's still initializing, shows
 * a centered spinner. Once ready, renders a two-line thank-you
 * (`planUpdated.message`, `planUpdated.thankYou`) above a Return Home
 * button linking to `/` (`planUpdated.returnHome`).
 *
 * All three translation keys are part of the universal common-locale
 * bond (`@molecule/app-locales-common`), so adopting apps don't need
 * to declare them locally.
 */
export function PlanUpdated() {
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
        {t('planUpdated.message')}
      </h2>
      <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>
        {t('planUpdated.thankYou')}
      </h2>
      <Link to="/">
        <Button>{t('planUpdated.returnHome')}</Button>
      </Link>
    </div>
  )
}
