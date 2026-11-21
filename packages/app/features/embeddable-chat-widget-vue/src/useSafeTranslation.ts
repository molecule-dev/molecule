/**
 * Provider-optional translation composable for the embeddable chat widget.
 *
 * The widget is a drop-in for arbitrary third-party pages, so it can NOT
 * assume a molecule composition root provides an i18n provider above it.
 * `useTranslation()` from `@molecule/app-vue` resolves the nearest injected
 * provider and otherwise falls back to the bonded `@molecule/app-i18n`
 * provider (auto-created when nothing is bonded) — so the widget never
 * throws on a bare host page:
 *
 * - **Provider present** (inside a molecule app): delegate to the host
 *   provider's `t()` so the widget honours the app's locale + translations,
 *   and re-render on locale change (the composable subscribes to the
 *   provider's locale notifications and unsubscribes on unmount).
 * - **No provider** (bare page): the auto-created simple provider serves the
 *   inline English `defaultValue`, interpolating any `{{token}}` placeholders
 *   — the same substitution React's `useSafeTranslation` fallback performs.
 *
 * Either way the widget renders sensible English text and never throws.
 *
 * @module
 */

import type { InterpolationValues, TranslateOptions } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-vue'

/** Translation function shape used throughout the widget. */
export type WidgetTranslate = (
  key: string,
  values?: InterpolationValues,
  options?: TranslateOptions,
) => string

/**
 * Returns a translation function that works with OR without a molecule
 * i18n provider in the composition root. See the module docs for the two paths.
 *
 * @returns An object with a provider-optional `t()` function.
 */
export function useSafeTranslation(): { t: WidgetTranslate } {
  const { t } = useTranslation()
  return { t }
}
