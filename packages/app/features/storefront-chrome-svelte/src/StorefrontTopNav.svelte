<!--
  StorefrontTopNav: the Svelte counterpart of
  `@molecule/app-storefront-chrome-react`'s `StorefrontTopNav` — brand link,
  horizontal nav links, icon actions with badges and the profile dropdown
  (signed-in / signed-out menus plus the sign-out row). Same props (React
  names), same DOM for the same input; node props are snippets or plain text.
-->
<script lang="ts">
  import type { Attachment } from 'svelte/attachments'

  import { contentNodes, Link, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { NavLinkSpec, StorefrontTopNavProps } from './types.js'

  let {
    brand,
    brandTo = '/',
    links = [],
    actions = [],
    isAuthenticated,
    profileImageUrl,
    profileInitials,
    profileImageAlt,
    accountMenuLabel,
    authedMenu = [],
    unauthedMenu = [],
    onSignOut,
    signOutLabel,
    className,
  }: StorefrontTopNavProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())

  /** The avatar alt text (React's `profileImageAlt` default through `t()`). */
  const profileImageAltValue = $derived(
    profileImageAlt ??
      t('storefrontChrome.nav.userProfile', undefined, { defaultValue: 'User profile' }),
  )
  /** The trigger's accessible name (React's `accountMenuLabel` default through `t()`). */
  const accountMenuLabelValue = $derived(
    accountMenuLabel ??
      t('storefrontChrome.nav.accountMenu', undefined, { defaultValue: 'Account menu' }),
  )
  /** The sign-out row's label (React's `signOutLabel` default through `t()`). */
  // React's `slot(signOutLabel) ?? default`: a label snippet that renders nothing is absent, so the
  // default text shows. A snippet's `{#each}` over no rows changes the DOM without changing the prop,
  // so presence follows the button's rendered content.
  const signOutSnippet = $derived(typeof signOutLabel === 'function' ? signOutLabel : undefined)
  const signOutText = $derived(typeof signOutLabel === 'string' ? signOutLabel : undefined)
  const signOutDefault = $derived(
    t('storefrontChrome.nav.signOut', undefined, { defaultValue: 'Sign Out' }),
  )
  let signOutRenders = $state(false)
  const trackSignOut: Attachment<HTMLElement> = (element) => {
    const sync = (): void => {
      signOutRenders = contentNodes(element).length > (signOutRenders ? 0 : 1)
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(element, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }

  let profileOpen = $state(false)
  let profileRef: HTMLDivElement | undefined = $state()

  /** The dropdown menu for the current auth state. */
  const menu = $derived(isAuthenticated ? authedMenu : unauthedMenu)

  // As in React's effect: the listener exists only while the menu is open. The
  // returned function runs when the effect re-runs or the component unmounts.
  $effect(() => {
    if (!profileOpen) return
    /**
     * Closes the menu when a mousedown occurs outside the profile wrapper.
     * @param event - The document mousedown.
     */
    const onDoc = (event: MouseEvent): void => {
      if (profileRef && !profileRef.contains(event.target as Node)) profileOpen = false
    }
    document.addEventListener('mousedown', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
    }
  })

  /**
   * One nav link's classes.
   * @param link - The link spec.
   * @returns The class string.
   */
  const linkClasses = (link: NavLinkSpec): string =>
    cm.cn(
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      link.active
        ? cm.cn(cm.textPrimary, cm.sp('pb', 1), cm.storefrontChromeTopNavLinkActive)
        : cm.storefrontChromeTopNavLink,
    )
</script>

<header class={cm.cn(cm.storefrontChromeTopNav, className)} data-mol-id="nav-shell-01">
  <nav
    class={cm.cn(
      cm.flex({ justify: 'between', align: 'center' }),
      cm.sp('px', 6),
      cm.h(16),
      cm.mxAuto,
      cm.w('full'),
      cm.storefrontChromeTopNavInner,
    )}
    data-mol-id="nav-layout-01"
  >
    <div class={cm.flex({ align: 'center' })} data-mol-id="brand-container-01">
      <Link
        class={cm.cn(cm.textSize('2xl'), cm.textPrimary, cm.storefrontChromeTopNavBrand)}
        data-mol-id="brand-logo-01"
        to={brandTo}
        >{#if typeof brand === 'function'}{@render brand?.()}{:else}{brand}{/if}</Link
      >
    </div>

    {#if links.length > 0}
      <ul
        class={cm.cn(cm.flex({ align: 'center' }), cm.storefrontChromeTopNavLinks)}
        data-mol-id="nav-links-list-01"
      >
        {#each links as link (link.to)}
          <li>
            <Link class={linkClasses(link)} data-mol-id={link.dataMolId} to={link.to}
              >{#if typeof link.label === 'function'}{@render link.label?.()}{:else}{link.label}{/if}</Link
            >
          </li>
        {/each}
      </ul>
    {/if}

    <div class={cm.cn(cm.flex({ align: 'center', gap: 4 }))} data-mol-id="nav-actions-01">
      {#each actions as action (action.to)}
        <Link
          class={cm.cn(cm.storefrontChromeTopNavAction)}
          data-mol-id={action.dataMolId}
          to={action.to}
          aria-label={action.ariaLabel}
          ><span class={cm.iconGlyphFont} data-icon={action.icon}>{action.icon}</span
          >{#if action.badgeCount && action.badgeCount > 0}<span
              class={cm.cn(cm.roundedFull, cm.fontWeight('bold'), cm.storefrontChromeTopNavBadge)}
              >{action.badgeCount}</span
            >{/if}</Link
        >
      {/each}
      <div
        bind:this={profileRef}
        class={cm.cn(cm.position('relative'))}
        data-mol-id="profile-wrapper-01"
      >
        <button
          type="button"
          aria-label={accountMenuLabelValue}
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          class={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            cm.cursorPointer,
            cm.touchTarget,
            cm.borderAll,
            cm.flex({ align: 'center', justify: 'center' }),
          )}
          style="overflow: hidden"
          data-mol-id="profile-trigger-01"
          onclick={() => (profileOpen = !profileOpen)}
          >{#if profileImageUrl}<img
              alt={profileImageAltValue}
              class={cm.cn(cm.w('full'), cm.h('full'), cm.objectCover)}
              src={profileImageUrl}
            />{:else if profileInitials}<span
              class={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.textPrimary)}
              >{profileInitials}</span
            >{:else}
            <!-- A Material Symbols ligature: the font paints the name as a glyph,
                 so the word stays out of the accessibility tree and the button's
                 aria-label names the control. -->
            <span
              aria-hidden="true"
              class={cm.cn(cm.iconGlyphFont, cm.textMuted)}
              data-icon="person">person</span
            >{/if}</button
        >
        {#if profileOpen}
          <div
            class={cm.cn(cm.sp('mt', 2), cm.sp('py', 1), cm.w(48), cm.storefrontChromeTopNavMenu)}
            data-mol-id="profile-dropdown-01"
          >
            {#each menu as item (item.to)}
              <Link
                class={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.storefrontChromeTopNavMenuItem,
                )}
                data-mol-id={item.dataMolId}
                onclick={() => (profileOpen = false)}
                to={item.to}
                >{#if typeof item.label === 'function'}{@render item.label?.()}{:else}{item.label}{/if}</Link
              >
            {/each}
            {#if isAuthenticated && onSignOut}
              <hr class={cm.cn(cm.sp('my', 1), cm.storefrontChromeTopNavMenuDivider)} />
              <button
                type="button"
                {@attach trackSignOut}
                class={cm.cn(
                  cm.dropdownItem,
                  cm.w('full'),
                  cm.textSize('sm'),
                  cm.touchTargetCompact,
                )}
                data-mol-id="profile-link-signout"
                onclick={() => {
                  profileOpen = false
                  onSignOut?.()
                }}
                >{#if signOutSnippet}{@render signOutSnippet?.()}{/if}{#if signOutText !== undefined}{signOutText}{/if}{#if signOutText === undefined && (!signOutSnippet || !signOutRenders)}{signOutDefault}{/if}</button
              >
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </nav>
</header>
