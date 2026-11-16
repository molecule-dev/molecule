/**
 * RootErrorFallback component (React parity).
 *
 * @module
 */

import { Component, computed, type OnInit } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { error as logError } from '@molecule/app-logger'
import { getClassMap } from '@molecule/app-ui'

/**
 * RootErrorFallback component.
 *
 * The localized recovery alert the boundary shows once a render error is
 * caught — the counterpart of `@molecule/app-root-error-boundary-react`'s
 * internal `RootErrorFallback`. It reads `t` from `useTranslation()`, so it
 * re-renders in the new language after a locale switch. The host IS the outer
 * `<div>` (`div[mol-root-error-fallback]`), matching React's root exactly.
 */
@Component({
  selector: 'div[mol-root-error-fallback]',
  standalone: true,
  inputs: ['error'],
  host: {
    role: 'alert',
    // `[attr.class]`, not `[class]`: Angular's classMap applies a bound class
    // string in sorted key order, while React writes React's own order into the
    // attribute. Attribute binding keeps the emitted DOM identical to React's.
    '[attr.class]': 'rootClasses()',
  },
  template: `<p [attr.class]="textClasses()">{{ message() }}</p>`,
})
export class RootErrorFallback implements OnInit {
  /**
   * The caught render error, passed by the boundary's `@error` block. Logging
   * it here is React's `componentDidCatch`: the fallback instance is created
   * exactly once per caught error, so the report is logged once, before the
   * recovery surface shows.
   */
  error: unknown = undefined

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * Reports the caught render error through the bonded logger.
   */
  ngOnInit(): void {
    const caught = this.error
    if (caught !== undefined && caught !== null) {
      logError(caught instanceof Error ? caught : new Error(String(caught)), '')
    }
  }

  /**
   * Computes the alert's class list.
   * @returns The class string.
   */
  rootClasses(): string {
    const cm = getClassMap()
    return cm.cn(cm.flex({ direction: 'col', align: 'center', justify: 'center' }), cm.sp('p', 8))
  }

  /**
   * Computes the message's class list.
   * @returns The class string.
   */
  textClasses(): string {
    const cm = getClassMap()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))
  }

  /**
   * The localized message.
   * @returns The translated recovery text.
   */
  readonly message = computed(() =>
    this.i18n.t('error.unknown', {}, { defaultValue: 'An unexpected error occurred.' }),
  )
}
