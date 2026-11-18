<!--
  AuthShellHeading: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthShellHeading` — centered heading block
  with optional eyebrow, h1 and subheading.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { toStyleText } from './styles.js'
  import type { AuthShellHeadingProps } from './types.js'

  let { heading, subheading, eyebrow, headingClassName, headingStyle }: AuthShellHeadingProps =
    $props()

  const cm = $derived(getClassMap())
</script>

<header class={cm.flex({ direction: 'col', align: 'center', gap: 'xs' })}>
  {#if eyebrow}
    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.authShellHeadingEyebrow)}>
      {eyebrow}
    </span>
  {/if}
  <h1
    class={cm.cn(
      cm.textSize('2xl'),
      cm.fontWeight('bold'),
      cm.authShellHeadingTitle,
      headingClassName,
    )}
    style={toStyleText(headingStyle)}
  >
    {heading}
  </h1>
  {#if subheading}
    <p class={cm.cn(cm.textSize('sm'), cm.authShellHeadingSub)}>{subheading}</p>
  {/if}
</header>
