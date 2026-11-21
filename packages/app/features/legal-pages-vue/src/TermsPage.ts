/**
 * Vue default Terms-of-service page scaffold.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import type { SpacingScale } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { LegalPageLayout } from './LegalPageLayout.js'
import type { TermsPageProps } from './types.js'

/**
 * Default Terms-of-service page scaffold.
 *
 * With no props, renders the canonical boilerplate Terms page. Pass children
 * (the DEFAULT slot) to render real content (e.g. `LegalPageSection`s).
 *
 * Vue counterpart of `@molecule/app-legal-pages-react`'s `TermsPage` — the
 * same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link TermsPageProps}).
 * @returns The terms page component.
 */
export const TermsPage = defineComponent({
  name: 'TermsPage',
  props: {
    titleKey: {
      type: String,
      default: 'terms.title',
    },
    titleDefault: {
      type: String,
      default: 'Terms',
    },
    introKey: {
      type: String,
      default: 'terms.intro',
    },
    introDefault: {
      type: String,
      default: 'This is the Terms page. Replace this placeholder with real content.',
    },
    stackGap: {
      type: Number as PropType<SpacingScale>,
      default: undefined,
    },
  },
  setup(props: TermsPageProps, { slots }) {
    const { t } = useTranslation()

    return (): VNode => {
      const body: VNodeChild[] = slots.default?.() ?? []

      return h(
        LegalPageLayout,
        {
          dataMolId: 'page-terms',
          title: t(
            props.titleKey ?? 'terms.title',
            {},
            {
              defaultValue: props.titleDefault ?? 'Terms',
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
                      props.introKey ?? 'terms.intro',
                      {},
                      {
                        defaultValue:
                          props.introDefault ??
                          'This is the Terms page. Replace this placeholder with real content.',
                      },
                    ),
                  ),
                ],
        },
      )
    }
  },
})
