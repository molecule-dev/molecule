<!--
  AppHeader: the Svelte counterpart of `@molecule/app-header-react`'s
  `AppHeader` — sticky top app-shell header, logo + appName on the left,
  slotted actions on the right. All visual styling routes through ClassMap
  tokens (`cm.headerBar`, `cm.headerFixed`, `cm.logoText`) so the bonded
  styling layer controls the visual treatment.
-->
<script lang="ts">
  import { Link } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Flex } from '@molecule/app-ui-svelte'

  import DefaultThemeToggle from './DefaultThemeToggle.svelte'
  import type { AppHeaderProps } from './types.js'

  let {
    appName,
    logoSrc = '/logo.svg',
    logoSize = 30,
    brandTo = '/',
    userMenu,
    themeToggle,
    extraActions,
    fixed = true,
    className,
    dataMolId,
  }: AppHeaderProps = $props()

  const cm = $derived(getClassMap())
</script>

<header class={cm.cn(cm.headerBar, fixed ? cm.headerFixed : '', className)} data-mol-id={dataMolId}>
  <div class={cm.headerInner}>
    <Flex align="center" justify="between" className={cm.h('full')}>
      <Link to={brandTo}>
        <Flex align="center" gap="xs">
          <img src={logoSrc} width={logoSize} height={logoSize} alt="" />
          <span class={cm.logoText}>{appName}</span>
        </Flex>
      </Link>
      <Flex align="center" gap="sm">
        {#if themeToggle !== null}
          {#if themeToggle}{@render themeToggle()}{:else}<DefaultThemeToggle />{/if}
        {/if}
        {#if extraActions}{@render extraActions()}{/if}
        {#if userMenu}{@render userMenu()}{/if}
      </Flex>
    </Flex>
  </div>
</header>
