<!--
  ContentPageShell: the Svelte counterpart of
  `@molecule/app-legal-pages-react`'s `ContentPageShell` — the app's own
  header/footer chrome around a themed hero band (eyebrow + title + subtitle)
  and a surface-card content area. Same props, same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ContentPageShellProps } from './types.js'

  let {
    dataMolId,
    eyebrow,
    title,
    subtitle,
    header,
    footer,
    children,
    bare = false,
    containerSize = 'md',
  }: ContentPageShellProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.legalPagesShell)}>
  {#if header}{@render header()}{/if}

  {#if title}
    <!-- A `<section>`, not `<header>`: the app's own top bar (the `header`
         slot above) is the page's single banner — a second `<header>` here
         reads as a duplicated app bar to audits, users, and assistive tech. -->
    <section
      data-mol-id={dataMolId}
      class={cm.cn(cm.legalPagesHero, cm.sp('px', 6), cm.sp('py', 16))}
      style="background: linear-gradient(135deg, color-mix(in srgb, var(--mol-color-primary) 14%, var(--mol-color-background)) 0%, var(--mol-color-background) 70%); border-bottom: 1px solid color-mix(in srgb, var(--mol-color-on-surface) 8%, transparent)"
    >
      <div
        aria-hidden="true"
        class={cm.legalPagesHeroGlow}
        style="background: color-mix(in srgb, var(--mol-color-primary) 22%, transparent)"
      ></div>
      <div class={cm.cn(cm.container({ size: containerSize }), cm.legalPagesHeroContent)}>
        {#if eyebrow}
          <p
            class={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 3),
              cm.legalPagesHeroEyebrow,
            )}
          >
            {@render eyebrow()}
          </p>
        {/if}
        <h1 class={cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'), cm.legalPagesHeroTitle)}>
          {@render title()}
        </h1>
        {#if subtitle}
          <p class={cm.cn(cm.textSize('base'), cm.sp('mt', 3), cm.legalPagesHeroSubtitle)}>
            {@render subtitle()}
          </p>
        {/if}
      </div>
    </section>
  {/if}

  <main class={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 10))}>
    <div class={cm.cn(cm.container({ size: containerSize }))}>
      {#if bare}
        {@render children()}
      {:else}
        <div class={cm.cn(cm.surface, cm.sp('p', 8), cm.legalPagesContentCard)}>
          {@render children()}
        </div>
      {/if}
    </div>
  </main>

  {#if footer}{@render footer()}{/if}
</div>
