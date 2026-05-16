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
      <div
        className={cm.cn(
          cm.mxAuto,
          cm.sp('mb', 8),
          cm.roundedFull,
          cm.bgPrimarySubtle,
          cm.textPrimary,
          cm.flex({ align: 'center', justify: 'center' }),
        )}
        // Inline size — `cm.w(28)`/`cm.h(28)` produce runtime class strings
        // (`w-28`, `h-28`) that Tailwind's static scanner doesn't pick up,
        // so the classes land in the DOM but the CSS rules are never
        // generated. Width/height aren't managed by any ClassMap token, so
        // inline style is safe per the "no inline that conflicts with
        // ClassMap" rule.
        style={{ width: '7rem', height: '7rem' }}
      >
        <Icon name="check-circle" size={64} aria-hidden="true" data-mol-id="plan-updated-icon" />
      </div>
      {/* Both message + thankYou stay as <h2> for backward compatibility
          with per-app plan-updated.spec.ts assertions that two level-2
          headings are present. Visual hierarchy comes from the font
          scale, not the heading level. */}
      <h2
        className={cm.cn(cm.textSize('4xl'), cm.italic, cm.fontWeight('bold'), cm.sp('mb', 4))}
        style={{ fontFamily: 'var(--font-headline, inherit)' }}
        data-mol-id="plan-updated-heading"
      >
        {t('planUpdated.message')}
      </h2>
      <h2
        className={cm.cn(cm.textSize('lg'), cm.fontWeight('normal'), cm.textMuted, cm.sp('mb', 10))}
        data-mol-id="plan-updated-subheading"
      >
        {t('planUpdated.thankYou')}
      </h2>
      <Link to="/">
        <Button
          variant="solid"
          size="lg"
          className={cm.cn(cm.gradientPrimary, cm.uppercase, cm.trackingWide)}
          data-mol-id="plan-updated-return-home"
        >
          {t('planUpdated.returnHome')}
        </Button>
      </Link>
      <div className={cm.sp('mt', 6)}>
        <Link
          to="/billing"
          className={cm.cn(
            cm.textSize('xs'),
            cm.textSubtle,
            cm.uppercase,
            cm.trackingWide,
            cm.fontWeight('semibold'),
            cm.link,
          )}
          data-mol-id="plan-updated-view-receipt"
        >
          {t('planUpdated.viewReceipt', undefined, { defaultValue: 'View receipt' })}
        </Link>
      </div>
    </section>
  )
}
