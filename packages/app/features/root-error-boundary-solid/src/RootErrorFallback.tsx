/**
 * The Solid recovery alert the boundary shows once a render error is caught —
 * the counterpart of `@molecule/app-root-error-boundary-react`'s internal
 * `RootErrorFallback`. A component, so it reads `t` from `useTranslation()`
 * and re-renders in the new language after a locale switch.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/**
 * The localized recovery alert.
 *
 * @returns The recovery alert.
 */
export function RootErrorFallback(): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      class={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 8),
      )}
      role="alert"
    >
      <p class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
        {t('error.unknown', {}, { defaultValue: 'An unexpected error occurred.' })}
      </p>
    </div>
  )
}
