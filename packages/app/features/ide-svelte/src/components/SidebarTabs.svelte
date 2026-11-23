<!--
  SidebarTabs: the Svelte counterpart of `@molecule/app-ide-react`'s
  `SidebarTabs` — the sidebar tab strip with the file explorer and search
  icons. Same props (React names), same DOM for the same input, same
  callbacks. A real tablist wraps the two `role="tab"` buttons; the tab's
  content is the `children` snippet. See the React file for the design notes.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout
  the ClassMap can't express, written as style texts. All user-facing text
  goes through `t()`.
-->

<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/props.ts). */
  export type SidebarTabsProps = types.SidebarTabsProps
</script>

<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import Icon from './Icon.svelte'

  let { activeTab, onTabChange, children, className }: SidebarTabsProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())

  const filesActive = $derived(activeTab === 'files')
  const searchActive = $derived(activeTab === 'search')

  /** React's button style: one compact height, the icon centered. */
  const tabStyle = 'user-select: none; height: 32px; flex: 1; justify-content: center'
  /** React's content area style: everything below the tab strip scrolls. */
  const contentStyle = 'flex: 1; min-height: 0px; overflow: auto'
  /** The icon's dim state follows its tab: full opacity when active. */
  const filesIconStyle = $derived(`opacity: ${filesActive ? '1' : '0.6'}`)
  const searchIconStyle = $derived(`opacity: ${searchActive ? '1' : '0.6'}`)
</script>

<div
  class={cm.cn(cm.h('full'), cm.borderR, className)}
  style="display: flex; flex-direction: column"
>
  <!-- A real tablist, like the editor's TabBar — the two `role="tab"` buttons
      below need one to be valid. -->
  <div
    role="tablist"
    aria-label={t('ide.sidebar.tabs', undefined, { defaultValue: 'Sidebar' })}
    class={cm.cn(
      cm.flex({ direction: 'row', align: 'center' }),
      cm.shrink0,
      cm.surfaceSecondary,
      cm.borderB,
    )}
  >
    <button
      type="button"
      data-mol-id="sidebar-tab-files"
      role="tab"
      aria-selected={filesActive ? 'true' : 'false'}
      onclick={() => onTabChange('files')}
      title={t('ide.sidebar.files', undefined, { defaultValue: 'Explorer' })}
      aria-label={t('ide.sidebar.files', undefined, { defaultValue: 'Explorer' })}
      style={tabStyle}
      class={cm.cn(
        cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.textSize('sm'),
        cm.shrink0,
        cm.cursorPointer,
        // Icon-only standalone control → the full 44px coarse floor, from the
        // ClassMap rather than a hand-computed height (min-height beats the
        // 32px compact height on touch, exactly as before).
        cm.touchTarget,
        cm.borderR,
        filesActive && cm.surface,
        filesActive && cm.borderBPrimary,
      )}
    >
      <Icon name="folder" size={16} aria-hidden="true" style={filesIconStyle} />
    </button>
    <button
      type="button"
      data-mol-id="sidebar-tab-search"
      role="tab"
      aria-selected={searchActive ? 'true' : 'false'}
      onclick={() => onTabChange('search')}
      title={t('ide.sidebar.search', undefined, { defaultValue: 'Search' })}
      aria-label={t('ide.sidebar.search', undefined, { defaultValue: 'Search' })}
      style={tabStyle}
      class={cm.cn(
        cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.textSize('sm'),
        cm.shrink0,
        cm.cursorPointer,
        // Same 44px coarse floor as its sibling — one tab strip, one rule.
        cm.touchTarget,
        searchActive && cm.surface,
        searchActive && cm.borderBPrimary,
      )}
    >
      <Icon name="search" size={16} aria-hidden="true" style={searchIconStyle} />
    </button>
  </div>
  <div style={contentStyle}>
    {#if children}{@render children?.()}{/if}
  </div>
</div>
