/**
 * Solid authenticated home page: a personalized greeting headline.
 *
 * Solid counterpart of `@molecule/app-home-page-react`'s `Home` — the same
 * props (none), the same DOM for the same input. Renders a single H2 of
 * the form:
 *   `{home.greeting}{user.name || user.email || home.world}!`
 *
 * `home.greeting` and `home.world` both come from the universal
 * common-locale bond (`@molecule/app-locales-common`), so the page is
 * fully translated out of the box. Apps can override `home.greeting`
 * per-app (e.g. note-taking's "Hello, {{name}}.") simply by including
 * the key in their own locale `ui.ts`.
 *
 * @module
 */

import type { Component } from 'solid-js'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/**
 * Authenticated home page — a personalized greeting headline.
 *
 * Reads auth and i18n reactively: a sign-in, a sign-out or a locale switch
 * anywhere in the app re-renders the headline, the way React's `useAuth()` /
 * `useTranslation()` re-render on one.
 *
 * @returns The rendered home page.
 */
export const Home: Component = () => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<UserProfile>()

  // Concatenated into one expression so JSX doesn't insert whitespace
  // between greeting and name — keeps the rendered output identical to
  // the byte-identical fleet original (`Hello, World!`, not `Hello,  World!`).
  const headline = (): string =>
    `${t('home.greeting')}${auth.user()?.name || auth.user()?.email || t('home.world')}!`

  return (
    <div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h2 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{headline()}</h2>
    </div>
  )
}
