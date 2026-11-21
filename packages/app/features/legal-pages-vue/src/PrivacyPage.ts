/**
 * Vue default Privacy-policy page scaffold.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import type { SpacingScale } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { LegalPageLayout } from './LegalPageLayout.js'
import type { PrivacyPageProps } from './types.js'

/**
 * Default Privacy-policy page scaffold.
 *
 * With no props, renders the canonical boilerplate Privacy page. Pass children
 * (the DEFAULT slot) to render real content.
 *
 * Vue counterpart of `@molecule/app-legal-pages-react`'s `PrivacyPage` — the
 * same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link PrivacyPageProps}).
 * @returns The privacy page component.
 */
export const PrivacyPage = defineComponent({
  name: 'PrivacyPage',
  props: {
    titleKey: {
      type: String,
      default: 'privacy.title',
    },
    titleDefault: {
      type: String,
      default: 'Privacy',
    },
    introKey: {
      type: String,
      default: 'privacy.intro',
    },
    introDefault: {
      type: String,
      default: 'This is the Privacy page. Replace this placeholder with real content.',
    },
    stackGap: {
      type: Number as PropType<SpacingScale>,
      default: undefined,
    },
  },
  setup(props: PrivacyPageProps, { slots }) {
    const { t } = useTranslation()

    return (): VNode => {
      const body: VNodeChild[] = slots.default?.() ?? []

      return h(
        LegalPageLayout,
        {
          dataMolId: 'page-privacy',
          title: t(
            props.titleKey ?? 'privacy.title',
            {},
            {
              defaultValue: props.titleDefault ?? 'Privacy',
            },
          ),
          stackGap: props.stackGap,
        },
        {
          default: () =>
            body.length > 0
              ? body
              : [
                  h(
                    'p',
                    t(
                      props.introKey ?? 'privacy.intro',
                      {},
                      {
                        defaultValue:
                          props.introDefault ??
                          'This is the Privacy page. Replace this placeholder with real content.',
                      },
                    ),
                  ),
                ],
        },
      )
    }
  },
})
