/**
 * Provider-optional translation hook for the embeddable chat widget.
 *
 * The widget is a drop-in for arbitrary third-party pages, so it can NOT
 * assume the molecule `I18nProvider` is mounted above it. `useTranslation()`
 * from `@molecule/app-react` throws when no provider is in context — fatal on
 * a bare host page. This hook instead *probes* the context with `useContext`:
 *
 * - **Provider present** (inside a molecule app): delegate to the host
 *   provider's `t()` so the widget honours the app's locale + translations,
 *   and re-render on locale change.
 * - **No provider** (bare page): fall back to the inline English
 *   `defaultValue`, interpolating any `{{token}}` placeholders — the same
 *   substitution the real provider would perform.
 *
 * Either way the widget renders sensible English text and never throws.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useState } from 'react'

import { interpolate, type InterpolationValues } from '@molecule/app-i18n'
import { I18nContext } from '@molecule/app-react'

/** Translation function shape used throughout the widget. */
export type WidgetTranslate = (
  key: string,
  values?: InterpolationValues,
  options?: { defaultValue?: string; count?: number },
) => string

/**
 * Returns a translation function that works with OR without a molecule
 * `I18nProvider` in context. See the module docs for the two paths.
 *
 * @returns An object with a provider-optional `t()` function.
 */
export function useSafeTranslation(): { t: WidgetTranslate } {
  const provider = useContext(I18nContext)
  const [, forceUpdate] = useState({})

  // Re-render on locale change ONLY when a host provider is present. On a
  // bare page there is nothing to subscribe to.
  useEffect(() => {
    if (!provider) return
    return provider.onLocaleChange(() => forceUpdate({}))
  }, [provider])

  const t = useCallback<WidgetTranslate>(
    (key, values, options) => {
      if (provider) return provider.t(key, values, options)
      return interpolate(options?.defaultValue ?? key, values ?? {})
    },
    [provider],
  )

  return { t }
}
