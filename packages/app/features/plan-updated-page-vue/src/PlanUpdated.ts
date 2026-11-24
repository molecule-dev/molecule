/**
 * Vue post-purchase confirmation page: the auth-hydration spinner, the
 * confirmation itself, the confirmation call a hosted checkout return makes,
 * and its retry.
 *
 * @module
 */

import { defineComponent, h, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Icon, Spinner } from '@molecule/app-ui-vue'
import { Link, useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-vue'

import type { PlanUpdatedProps } from './types.js'

/**
 * Post-purchase confirmation page rendered after a plan upgrade.
 *
 * Vue counterpart of `@molecule/app-plan-updated-page-react`'s `PlanUpdated` —
 * the same props (React names), the same DOM for the same input. Reads auth
 * state via `useAuth`; while it's still initializing, shows a centered
 * spinner. Once ready, renders a celebratory layout: a large success glyph in
 * a soft circular halo, a two-line thank-you (`planUpdated.message`,
 * `planUpdated.thankYou`), and a Return Home button styled with the app's
 * primary color tokens.
 *
 * Those three translation keys are part of the universal common-locale bond
 * (`@molecule/app-locales-common`); the always-rendered "View receipt" link
 * uses `planUpdated.viewReceipt` from the companion bond
 * `@molecule/app-locales-plan-updated-page` and navigates to the hardcoded
 * `/billing` route. Visual layout uses only ClassMap tokens so it inherits the
 * app's theme (radius, color tokens, spacing) with no per-app override.
 *
 * @param props - Component props (see {@link PlanUpdatedProps}).
 * @returns The plan-updated confirmation page component.
 */
export const PlanUpdated = defineComponent({
  name: 'PlanUpdated',
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
      default: 'Return home',
    },
    actionHref: {
      type: String,
      default: '/',
    },
    receiptHref: {
      type: String,
      default: '/billing',
    },
    provider: String,
    verify: {
      type: Boolean,
      default: true,
    },
  },
  setup(props: PlanUpdatedProps) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const { state } = useAuth()
    // The provider redirects here with the purchase id in the query; confirming
    // it server-side from THIS origin is what grants the plan (see remarks).
    const verification = useVerifyPaymentReturn({
      provider: props.provider,
      enabled: props.verify,
    })

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
          'section',
          {
            class: cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('px', 6), cm.sp('py', 16)),
            'data-mol-id': 'plan-updated-page',
          },
          [
            h(
              'h2',
              {
                class: cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4)),
                'data-mol-id': 'plan-updated-error',
              },
              t('planUpdated.verifyFailed', undefined, {
                defaultValue: 'We could not confirm your payment yet.',
              }),
            ),
            h(
              Button,
              {
                variant: 'solid',
                size: 'lg',
                onClick: verification.retry,
                'data-mol-id': 'plan-updated-retry',
              },
              {
                default: () => [t('planUpdated.retry', undefined, { defaultValue: 'Try again' })],
              },
            ),
          ],
        )
      }

      return h(
        'section',
        {
          class: cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('px', 6), cm.sp('py', 16)),
          'data-mol-id': 'plan-updated-page',
        },
        [
          h(
            'div',
            {
              class: cm.cn(
                cm.mxAuto,
                cm.sp('mb', 8),
                cm.roundedFull,
                cm.bgPrimarySubtle,
                cm.textPrimary,
                cm.flex({ align: 'center', justify: 'center' }),
              ),
              // Inline size — `cm.w(28)`/`cm.h(28)` produce runtime class strings
              // (`w-28`, `h-28`) that Tailwind's static scanner doesn't pick up,
              // so the classes land in the DOM but the CSS rules are never
              // generated. Width/height aren't managed by any ClassMap token, so
              // inline style is safe per the "no inline that conflicts with
              // ClassMap" rule.
              style: { width: '7rem', height: '7rem' },
            },
            [
              h(Icon, {
                name: 'check-circle',
                size: 64,
                'aria-hidden': 'true',
                'data-mol-id': 'plan-updated-icon',
              }),
            ],
          ),
          // Both message + thankYou stay as <h2> for backward compatibility
          // with per-app plan-updated.spec.ts assertions that two level-2
          // headings are present. Visual hierarchy comes from the font
          // scale, not the heading level.
          h(
            'h2',
            {
              class: cm.cn(cm.textSize('4xl'), cm.italic, cm.fontWeight('bold'), cm.sp('mb', 4)),
              style: { fontFamily: 'var(--font-headline, inherit)' },
              'data-mol-id': 'plan-updated-heading',
            },
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
            {
              class: cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('normal'),
                cm.textMuted,
                cm.sp('mb', 10),
              ),
              'data-mol-id': 'plan-updated-subheading',
            },
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
                  {
                    variant: 'solid',
                    size: 'lg',
                    className: cm.cn(cm.gradientPrimary, cm.uppercase, cm.trackingWide),
                    'data-mol-id': 'plan-updated-return-home',
                  },
                  {
                    default: () => [
                      t(
                        props.actionKey ?? 'planUpdated.returnHome',
                        {},
                        {
                          defaultValue: props.actionDefault ?? 'Return home',
                        },
                      ),
                    ],
                  },
                ),
              ],
            },
          ),
          props.receiptHref === null
            ? null
            : h('div', { class: cm.sp('mt', 6) }, [
                h(
                  Link,
                  {
                    to: props.receiptHref ?? '/billing',
                    class: cm.cn(
                      cm.textSize('xs'),
                      cm.textSubtle,
                      cm.uppercase,
                      cm.trackingWide,
                      cm.fontWeight('semibold'),
                      cm.link,
                    ),
                    'data-mol-id': 'plan-updated-view-receipt',
                  },
                  {
                    default: () => [
                      t('planUpdated.viewReceipt', undefined, { defaultValue: 'View receipt' }),
                    ],
                  },
                ),
              ]),
        ],
      )
    }
  },
})
