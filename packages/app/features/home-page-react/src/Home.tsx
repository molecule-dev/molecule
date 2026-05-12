import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Authenticated home page — a personalized greeting headline.
 *
 * Renders a single H2 of the form:
 *   `{home.greeting}{user.name || user.email || home.world}!`
 *
 * `home.greeting` and `home.world` both come from the universal
 * common-locale bond (`@molecule/app-locales-common`), so the page is
 * fully translated out of the box. Apps can override `home.greeting`
 * per-app (e.g. note-taking's "Hello, {{name}}.") simply by including
 * the key in their own locale `ui.ts`.
 */
export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()

  return (
    <div className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('home.greeting')}
        {user?.name || user?.email || t('home.world')}!
      </h2>
    </div>
  )
}
