/**
 * Vue authenticated home page: a personalized greeting headline.
 *
 * Vue counterpart of `@molecule/app-home-page-react`'s `Home` — the same
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

import { defineComponent, h, onMounted, onUnmounted, ref } from 'vue'

import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'
import { useAuth, useI18nProvider } from '@molecule/app-vue'

/**
 * Authenticated home page — a personalized greeting headline.
 *
 * Reads auth and i18n reactively: a sign-in, a sign-out or a locale switch
 * anywhere in the app re-renders the headline, the way React's `useAuth()` /
 * `useTranslation()` re-render on one.
 *
 * @returns The Vue `Home` component.
 */
export const Home = defineComponent({
  name: 'Home',
  setup() {
    const cm = getClassMap()
    const provider = useI18nProvider()
    const auth = useAuth<UserProfile>()

    // The page translates with NO inline fallback, so every `provider.t` call
    // for a missing key logs a `Missing translation key` service call — and
    // React's `useTranslation()` renders exactly once at mount, so React logs
    // each one once. The binding's version-tracking `t` (`useTranslation`,
    // `useT`) would render this component a SECOND time at mount (its mounted
    // hook reconciles setup→mount changes with an unconditional version bump)
    // and double every logged call. Subscribe here instead: one render at
    // mount, one per locale notification — React's exact sequence, with the
    // same `provider.t` React's `t` wraps.
    const localeVersion = ref(0)
    let unsubscribe: (() => void) | null = null
    onMounted(() => {
      unsubscribe = provider.onLocaleChange(() => {
        localeVersion.value++
      })
    })
    onUnmounted(() => {
      unsubscribe?.()
    })

    return (): ReturnType<typeof h> => {
      void localeVersion.value
      const user = auth.user.value

      // Concatenated into one expression so the render doesn't insert
      // whitespace between greeting and name — keeps the rendered output
      // identical to the byte-identical fleet original (`Hello, World!`,
      // not `Hello,  World!`).
      const headline = `${provider.t('home.greeting')}${user?.name || user?.email || provider.t('home.world')}!`

      return h('div', { class: cm.cn(cm.textCenter, cm.sp('py', 12)) }, [
        h('h2', { class: cm.cn(cm.textSize('3xl'), cm.fontWeight('bold')) }, headline),
      ])
    }
  },
})
