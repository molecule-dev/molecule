<!--
  AuthBrandHeader: the Svelte counterpart of
  `@molecule/app-auth-brand-header-react`'s `AuthBrandHeader` — a centered
  `<div>` wrapper holding a gradient chip + wordmark + tagline. Same props,
  same DOM for the same input. Composable: pass a `children` snippet built from
  the exported chip / wordmark / tagline components (or bespoke nodes); omit it
  to render the preset chip + wordmark + tagline from `appName` / `tagline` /
  `icon`.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import AuthBrandHeaderChip from './AuthBrandHeaderChip.svelte'
  import AuthBrandHeaderTagline from './AuthBrandHeaderTagline.svelte'
  import AuthBrandHeaderWordmark from './AuthBrandHeaderWordmark.svelte'
  import type { AuthBrandHeaderProps } from './types.js'

  let {
    children,
    className,
    appName,
    tagline,
    icon,
    chipGradient,
    chipShape,
    wordmarkColor,
  }: AuthBrandHeaderProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // `$derived` so the text re-runs on a locale switch, the way React's
  // render-time `t(…)` calls re-run on a re-render.
  const appNameText = $derived(
    t('authBrandHeader.appName', { appName: appName ?? '' }, { defaultValue: '{{appName}}' }),
  )
  const taglineText = $derived(
    t('authBrandHeader.tagline', { tagline: tagline ?? '' }, { defaultValue: '{{tagline}}' }),
  )
  const wrapperClass = $derived(
    cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }), className),
  )
</script>

<!-- A `<div>`, not `<header>` — several hosts render their own top bar on auth
     screens; a second `<header>` here reads as a duplicated app bar. This block
     is brand intro content, not a banner. -->
<div class={wrapperClass}>
  {#if children}
    {@render children()}
  {:else}
    {#if icon}
      <AuthBrandHeaderChip {icon} {chipGradient} {chipShape} />
    {/if}
    <AuthBrandHeaderWordmark color={wordmarkColor}>{appNameText}</AuthBrandHeaderWordmark>
    <AuthBrandHeaderTagline>{taglineText}</AuthBrandHeaderTagline>
  {/if}
</div>
