/**
 * The Vue recovery alert the boundary shows once a render error is caught —
 * the counterpart of `@molecule/app-root-error-boundary-react`'s internal
 * `RootErrorFallback`. A component, so it reads `t` from `useTranslation()`
 * and re-renders in the new language after a locale switch.
 *
 * @module
 */

import { defineComponent, h, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/**
 * The localized recovery alert.
 *
 * @returns The alert component.
 */
export const RootErrorFallback = defineComponent({
  name: 'RootErrorFallback',
  setup() {
    const { t } = useTranslation()
    const cm = getClassMap()

    /**
     * Renders the alert.
     *
     * @returns The recovery alert.
     */
    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('p', 8),
          ),
          role: 'alert',
        },
        [
          h(
            'p',
            { class: cm.cn(cm.textSize('sm'), cm.fontWeight('medium')) },
            t('error.unknown', {}, { defaultValue: 'An unexpected error occurred.' }),
          ),
        ],
      )
  },
})
