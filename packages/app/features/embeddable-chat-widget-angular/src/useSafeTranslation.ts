/**
 * Provider-optional translation function for the embeddable chat widget.
 *
 * The widget is a drop-in for arbitrary third-party pages, so it can NOT
 * assume a molecule injector provides an i18n provider above it.
 * `useTranslation()` from `@molecule/app-angular` reads the nearest injected
 * provider and otherwise falls back to the bonded `@molecule/app-i18n`
 * provider (auto-created when nothing is bonded) — so the widget never
 * throws on a bare host page:
 *
 * - **Provider present** (inside a molecule app): delegate to the host
 *   provider's `t()` so the widget honours the app's locale + translations,
 *   and re-render on locale change (the function reads the provider's
 *   locale notifications, which mark Angular views dirty in zoneless apps).
 * - **No provider** (bare page): the auto-created simple provider serves the
 *   inline English `defaultValue`, interpolating any `{{token}}` placeholders
 *   — the same substitution React's `useSafeTranslation` fallback performs.
 *
 * Either way the widget renders sensible English text and never throws.
 *
 * @module
 */

import { useTranslation } from '@molecule/app-angular'
import type { InterpolationValues, TranslateOptions } from '@molecule/app-i18n'

/** Translation function shape used throughout the widget. */
export type WidgetTranslate = (
  key: string,
  values?: InterpolationValues,
  options?: TranslateOptions,
) => string

/**
 * Returns a translation function that works with OR without a molecule
 * i18n provider in the injector. See the module docs for the two paths.
 * Call it in an injection context (a field initializer or constructor).
 *
 * @returns An object with a provider-optional `t()` function.
 */
export function useSafeTranslation(): { t: WidgetTranslate } {
  const { t } = useTranslation()
  return { t }
}
