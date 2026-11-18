<!--
  AuthShellBackLink: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthShellBackLink` — the "Back to home"
  router link (or a custom destination/label) rendered below the card. The
  arrow's Material Symbols glyph span is `aria-hidden="true"`, so the link's
  accessible name is its `t()` label alone.
-->
<script lang="ts">
  import { Link, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { AuthShellBackLinkProps } from './types.js'

  let { to = '/', label }: AuthShellBackLinkProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
</script>

<p class={cm.cn(cm.textCenter, cm.textSize('xs'), cm.sp('mt', 6), cm.authShellBackLink)}>
  <Link {to} class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.authShellBackLinkAnchor)}>
    <!-- The Material Symbols ligature name paints a glyph, not text — hidden
    from the accessibility tree so the link's accessible name is its t() label
    alone. Svelte strips this comment from the rendered DOM. -->
    <span class={cm.iconGlyphFont} style="font-size: 14px" aria-hidden="true">arrow_back</span>
    {label?.trim() ? label : t('auth.backHome', undefined, { defaultValue: 'Back to home' })}
  </Link>
</p>
