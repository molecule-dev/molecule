import { Link } from 'react-router-dom'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Icon, Spinner } from '@molecule/app-ui-react'

/**
 * Post-purchase confirmation page rendered after a plan upgrade.
 *
 * Reads auth state via `useAuth`; while it's still initializing, shows
 * a centered spinner. Once ready, renders a celebratory layout:
 * a large success glyph in a soft circular halo, a two-line thank-you
 * (`planUpdated.message`, `planUpdated.thankYou`), and a Return Home
 * button styled with the app's primary color tokens.
 *
 * All three translation keys are part of the universal common-locale
 * bond (`@molecule/app-locales-common`), so adopting apps don't need
 * to declare them locally. Visual layout uses only ClassMap tokens so
 * it inherits the app's theme (radius, color tokens, spacing) with no
 * per-app override.
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
    <section
      className={cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('px', 6), cm.sp('py', 16))}
      data-mol-id="plan-updated-page"
    >
      <Flex
        align="center"
        justify="center"
        className={cm.cn(
          cm.mxAuto,
          cm.sp('mb', 6),
          cm.w(24),
          cm.h(24),
          cm.roundedFull,
          cm.surfaceSecondary,
          cm.textSuccess,
        )}
      >
        <Icon name="check-circle" size={56} aria-hidden="true" data-mol-id="plan-updated-icon" />
      </Flex>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}
        data-mol-id="plan-updated-heading"
      >
        {t('planUpdated.message')}
      </h1>
      <p
        className={cm.cn(cm.textSize('lg'), cm.textMuted, cm.sp('mb', 10))}
        data-mol-id="plan-updated-subheading"
      >
        {t('planUpdated.thankYou')}
      </p>
      <Link to="/">
        <Button variant="solid" size="lg" data-mol-id="plan-updated-return-home">
          {t('planUpdated.returnHome')}
        </Button>
      </Link>
    </section>
  )
}
