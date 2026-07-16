import { Link } from 'react-router-dom'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Icon, Spinner } from '@molecule/app-ui-react'

/**
 * Props for {@link PlanUpdated}. All optional — defaults reproduce the original
 * hardcoded copy, so existing `<PlanUpdated />` usages are unchanged.
 */
export interface PlanUpdatedProps {
  /** i18n key for the confirmation message. */
  messageKey?: string
  /** Default confirmation message when the key is missing. */
  messageDefault?: string
  /** i18n key for the thank-you line. */
  thankYouKey?: string
  /** Default thank-you line when the key is missing. */
  thankYouDefault?: string
  /** i18n key for the return-home action label. */
  actionKey?: string
  /** Default action label when the key is missing. */
  actionDefault?: string
  /** Href the return-home action navigates to. Defaults to `/`. */
  actionHref?: string
}

/**
 * Post-purchase confirmation page rendered after a plan upgrade.
 *
 * Reads auth state via `useAuth`; while it's still initializing, shows
 * a centered spinner. Once ready, renders a celebratory layout:
 * a large success glyph in a soft circular halo, a two-line thank-you
 * (`planUpdated.message`, `planUpdated.thankYou`), and a Return Home
 * button styled with the app's primary color tokens.
 *
 * Those three translation keys are part of the universal common-locale
 * bond (`@molecule/app-locales-common`); the always-rendered "View
 * receipt" link uses `planUpdated.viewReceipt` from the companion bond
 * `@molecule/app-locales-plan-updated-page` and navigates to the
 * hardcoded `/billing` route. Visual layout uses only ClassMap tokens so
 * it inherits the app's theme (radius, color tokens, spacing) with no
 * per-app override.
 *
 * @param props - Component props (see {@link PlanUpdatedProps}).
 * @returns The plan-updated confirmation page element.
 */
export function PlanUpdated({
  messageKey = 'planUpdated.message',
  messageDefault = 'Your plan has been updated.',
  thankYouKey = 'planUpdated.thankYou',
  thankYouDefault = 'Thank you!',
  actionKey = 'planUpdated.returnHome',
  actionDefault = 'Return home',
  actionHref = '/',
}: PlanUpdatedProps = {}): React.JSX.Element {
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
        {t(messageKey, {}, { defaultValue: messageDefault })}
      </h2>
      <h2
        className={cm.cn(cm.textSize('lg'), cm.fontWeight('normal'), cm.textMuted, cm.sp('mb', 10))}
        data-mol-id="plan-updated-subheading"
      >
        {t(thankYouKey, {}, { defaultValue: thankYouDefault })}
      </h2>
      <Link to={actionHref}>
        <Button
          variant="solid"
          size="lg"
          className={cm.cn(cm.gradientPrimary, cm.uppercase, cm.trackingWide)}
          data-mol-id="plan-updated-return-home"
        >
          {t(actionKey, {}, { defaultValue: actionDefault })}
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
