<!--
  AppShellFooter: the Svelte counterpart of
  `@molecule/app-nav-chrome-react`'s `AppShellFooter` — bottom page footer
  with logo / copyright / links / right slot. Same props, same DOM for the
  same input; node props are snippets (or plain strings).
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { AppShellFooterProps } from './types.js'

  let { logo, copyright, links, right, className }: AppShellFooterProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  /** The links nav region's accessible name (locale-reactive). */
  const navLabel = $derived(t('navChrome.aria.footer', undefined, { defaultValue: 'Footer' }))
</script>

<footer
  class={cm.cn(
    cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
    cm.sp('px', 4),
    cm.sp('py', 4),
    className,
  )}
>
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    {#if typeof logo === 'function'}{@render logo()}{:else if logo != null}{logo}{/if}
    {#if copyright}
      <span class={cm.textSize('xs')}>
        {#if typeof copyright === 'function'}{@render copyright()}{:else}{copyright}{/if}
      </span>
    {/if}
  </div>
  {#if links && links.length > 0}
    <nav aria-label={navLabel} class={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
      {#each links as l, i (i)}
        <a href={l.to ?? '#'} class={cm.cn(cm.textSize('sm'), cm.link)}>
          {#if typeof l.label === 'function'}{@render l.label()}{:else}{l.label}{/if}
        </a>
      {/each}
    </nav>
  {/if}
  {#if typeof right === 'function'}{@render right()}{:else if right != null}{right}{/if}
</footer>
