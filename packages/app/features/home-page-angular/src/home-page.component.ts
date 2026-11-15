/**
 * Home component (Angular counterpart of `@molecule/app-home-page-react`).
 *
 * @module
 */

import { Component, computed } from '@angular/core'

import { useAuth, useTranslation } from '@molecule/app-angular'
import type { UserProfile } from '@molecule/app-auth'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

/**
 * Authenticated home page — a personalized greeting headline.
 *
 * The host IS React's root `<div>` (`div[mol-home-page]`), matching React's
 * DOM exactly. Renders a single H2 of the form:
 *   `{home.greeting}{user.name || user.email || home.world}!`
 *
 * `home.greeting` and `home.world` both come from the universal
 * common-locale bond (`@molecule/app-locales-common`), so the page is
 * fully translated out of the box. Apps can override `home.greeting`
 * per-app (e.g. note-taking's "Hello, {{name}}.") simply by including
 * the key in their own locale `ui.ts`.
 */
@Component({
  selector: 'div[mol-home-page]',
  standalone: true,
  host: {
    '[class]': 'classes()',
  },
  template: `<h2 [class]="headlineClasses()">{{ headline() }}</h2>`,
})
export class Home {
  /** The auth composable — the session's user as a signal. */
  private readonly auth = useAuth<UserProfile>()

  /** The i18n composable — `t` re-runs on every locale switch. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().textCenter, this.cm().sp('py', 12))
  }

  /**
   * Computes the headline class list.
   * @returns The class string.
   */
  headlineClasses(): string {
    return this.cm().cn(this.cm().textSize('3xl'), this.cm().fontWeight('bold'))
  }

  /**
   * The greeting headline, reactive to auth and locale changes.
   * Concatenated into one expression so the template doesn't insert
   * whitespace between greeting and name — keeps the rendered output
   * identical to the byte-identical fleet original (`Hello, World!`,
   * not `Hello,  World!`).
   * @returns The headline text.
   */
  readonly headline = computed(() => {
    const user = this.auth.user()
    return `${this.i18n.t('home.greeting')}${user?.name || user?.email || this.i18n.t('home.world')}!`
  })
}
