<!--
  StorefrontFooter: the Svelte counterpart of
  `@molecule/app-storefront-chrome-react`'s `StorefrontFooter` — brand block,
  optional tagline, columns of links and the copyright row. Same props (React
  names), same DOM for the same input; node props are snippets or plain text.
-->
<script lang="ts">
  import { Link } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { StorefrontFooterProps } from './types.js'

  let { brand, tagline, columns = [], copyright, className }: StorefrontFooterProps = $props()

  const cm = $derived(getClassMap())
</script>

<footer
  class={cm.cn(cm.w('full'), cm.sp('pt', 16), cm.sp('pb', 8), cm.storefrontChromeFooter, className)}
>
  <div
    class={cm.cn(
      cm.maxW('[1280px]'),
      cm.mxAuto,
      cm.sp('px', 6),
      cm.grid({ cols: 1, gap: 'xl' }),
      cm.storefrontChromeFooterColumns,
    )}
  >
    <div class={cm.cn(cm.storefrontChromeFooterBrandCol)}>
      <div class={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), cm.storefrontChromeFooterBrand)}>
        {#if typeof brand === 'function'}{@render brand?.()}{:else}{brand}{/if}
      </div>
      {#if tagline}
        <p class={cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterTagline)}>
          {#if typeof tagline === 'function'}{@render tagline?.()}{:else}{tagline}{/if}
        </p>
      {/if}
    </div>
    {#each columns as col, i (i)}
      <div>
        <h4
          class={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            cm.textSize('sm'),
            cm.storefrontChromeFooterHeading,
          )}
        >
          {#if typeof col.heading === 'function'}{@render col.heading?.()}{:else}{col.heading}{/if}
        </h4>
        <ul class={cm.stack(2)}>
          {#each col.links as link (link.to)}
            <li>
              <Link class={cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterLink)} to={link.to}
                >{#if typeof link.label === 'function'}{@render link.label?.()}{:else}{link.label}{/if}</Link
              >
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
  <div
    class={cm.cn(
      cm.maxW('[1280px]'),
      cm.mxAuto,
      cm.sp('px', 6),
      cm.sp('pt', 12),
      cm.sp('mt', 12),
      cm.storefrontChromeFooterDivider,
    )}
  >
    <p class={cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterCopyright)}>
      {#if typeof copyright === 'function'}{@render copyright?.()}{:else}{copyright}{/if}
    </p>
  </div>
</footer>
