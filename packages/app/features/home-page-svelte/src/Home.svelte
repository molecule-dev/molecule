<!--
  Home: the Svelte counterpart of `@molecule/app-home-page-react`'s `Home`
  — authenticated home page with a personalized greeting headline, the same
  DOM for the same input. `home.greeting` and `home.world` both come from
  the universal common-locale bond (`@molecule/app-locales-common`), so the
  page is fully translated out of the box. Apps can override
  `home.greeting` per-app (e.g. note-taking's "Hello, {{name}}.") simply by
  including the key in their own locale `ui.ts`.
-->
<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'
  import { useAuth, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()

  // Concatenated into one expression so the template doesn't insert
  // whitespace between greeting and name — keeps the rendered output
  // identical to the byte-identical fleet original (`Hello, World!`,
  // not `Hello,  World!`). `t` re-runs this `$derived` on every locale
  // switch and `$user` on every auth change, the way React re-renders.
  const headline = $derived(
    `${t('home.greeting')}${$user?.name || $user?.email || t('home.world')}!`,
  )
</script>

<div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
  <h2 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{headline}</h2>
</div>
