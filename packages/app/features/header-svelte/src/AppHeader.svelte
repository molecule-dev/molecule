<!--
  AppHeader: the Svelte counterpart of `@molecule/app-header-react`'s
  `AppHeader` — sticky top app-shell header, logo + appName on the left,
  slotted actions on the right. All visual styling routes through ClassMap
  tokens (`cm.headerBar`, `cm.headerFixed`, `cm.logoText`) so the bonded
  styling layer controls the visual treatment.
-->
<script lang="ts">
  import { contentNodes, Link } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Flex } from '@molecule/app-ui-svelte'

  import DefaultThemeToggle from './DefaultThemeToggle.svelte'
  import type { AppHeaderProps } from './types.js'

  let {
    appName,
    logoSrc = '/logo.svg',
    logoSize = 30,
    brandTo = '/',
    brandClassName,
    navigation,
    userMenu,
    themeToggle,
    extraActions,
    fixed = true,
    className,
    dataMolId,
  }: AppHeaderProps = $props()

  const cm = $derived(getClassMap())

  // React's `slot(themeToggle) ?? DEFAULT_THEME_TOGGLE`: a theme-toggle snippet that renders
  // nothing (an empty list) takes the default, like an omitted one, while an explicit `null`
  // force-hides it. A snippet's `{#each}` over no rows changes the DOM without changing the prop,
  // so presence is read from the rendered row; the default toggle (a `theme-toggle` button this
  // component renders only while nothing shows) is the row's own node, not toggle content.
  let actionsEl = $state<HTMLDivElement | null>(null)
  let navListEl = $state<HTMLUListElement | null>(null)
  let themeToggleRenders = $state(false)

  $effect(() => {
    const element = actionsEl
    void themeToggle
    if (!element) return
    const sync = (): void => {
      if (themeToggle === null || themeToggle === undefined) {
        if (themeToggleRenders) themeToggleRenders = false
        return
      }
      const defaultEl = themeToggleRenders
        ? null
        : element.querySelector(':scope > button[data-mol-id="theme-toggle"]')
      const present = contentNodes(element).some(
        (node) =>
          node !== navListEl &&
          node !== defaultEl &&
          (node.nodeType === 1 || (node.textContent ?? '').trim() !== ''),
      )
      if (present !== themeToggleRenders) themeToggleRenders = present
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(element, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  })
</script>

<header class={cm.cn(cm.headerBar, fixed ? cm.headerFixed : '', className)} data-mol-id={dataMolId}>
  <svelte:element
    this={navigation ? 'nav' : 'div'}
    class={navigation?.className ? cm.cn(cm.headerInner, navigation.className) : cm.headerInner}
    aria-label={navigation?.label}
  >
    <Flex align="center" justify="between" className={cm.h('full')}>
      <Link to={brandTo} class={brandClassName}>
        <Flex align="center" gap="xs">
          <img src={logoSrc} width={logoSize} height={logoSize} alt="" />
          <span class={cm.logoText}>{appName}</span>
        </Flex>
      </Link>
      <Flex bind:ref={actionsEl} align="center" gap="sm">
        {#if navigation}
          <ul bind:this={navListEl} class={navigation.listClassName}>
            {#each Object.entries(navigation.links) as [to, { children, className, ...anchor }] (to)}
              <li class={navigation.itemClassName}>
                <Link class={className} {...anchor} {to}
                  >{#if typeof children === 'function'}{@render children?.()}{:else}{children}{/if}</Link
                >
              </li>
            {/each}
          </ul>
        {/if}
        {#if themeToggle !== null}
          {#if themeToggle}{@render themeToggle?.()}{/if}
          {#if !themeToggleRenders}<DefaultThemeToggle />{/if}
        {/if}
        {#if extraActions}{@render extraActions?.()}{/if}
        {#if userMenu}{@render userMenu?.()}{/if}
      </Flex>
    </Flex>
  </svelte:element>
</header>
