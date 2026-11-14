import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

/**
 * `OAuthDivider` — the "or continue with" rule above an OAuth row.
 *
 * The host IS the wrapper `<div>` (`div[mol-oauth-divider]`), matching
 * React's root.
 *
 * @module
 */

/**
 * Renders a horizontal rule with centered label text — the "or
 * continue with" divider shown between a login/signup form and the
 * OAuth button row.
 *
 * Split out as its own component so the config-driven `OAuthButtons`
 * in `@molecule/app-auth-ui-angular` can compose it above `OAuthButtons`
 * (the row) without re-implementing the markup.
 */
@Component({
  selector: 'div[mol-oauth-divider]',
  standalone: true,
  inputs: ['labelKey', 'labelDefault', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<span [class]="lineClasses()"></span><span>{{ labelText() }}</span
    ><span [class]="lineClasses()"></span>`,
})
export class OAuthDivider {
  /** i18n key for the divider label (default `'oauth.orContinueWith'`). */
  labelKey?: string
  /** Fallback divider text if the i18n key is missing. */
  labelDefault?: string
  /** Extra class composed onto the divider wrapper. */
  className?: string

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The divider wrapper's class list (React's `cm.cn(cm.oauthDivider,
   * cm.flex({ align: 'center', gap: 4 }), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().oauthDivider,
      this.cm().flex({ align: 'center', gap: 4 }),
      this.className,
    )
  }

  /**
   * The rule spans' class list (React's `cm.cn(cm.flex1, cm.separator())`).
   * @returns The class string.
   */
  lineClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().separator())
  }

  /**
   * The divider text, translated for the active locale (React's
   * `t(labelKey, {}, { defaultValue: labelDefault })`).
   * @returns The text.
   */
  labelText(): string {
    return this.i18n.t(
      this.labelKey ?? 'oauth.orContinueWith',
      {},
      {
        defaultValue: this.labelDefault ?? 'or continue with',
      },
    )
  }
}
