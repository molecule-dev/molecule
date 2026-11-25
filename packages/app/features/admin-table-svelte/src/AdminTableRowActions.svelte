<!--
  AdminTableRowActions: the Svelte counterpart of
  `@molecule/app-admin-table-react`'s `AdminTableRowActions` — a three-dots
  trigger that opens a popover menu of row actions. Same props (React names),
  same DOM for the same input. Dismisses on an outside click or Escape; every
  item is a native button/link, so the whole menu is keyboard-operable.
-->
<script lang="ts" generics="T">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ReactNodeProp } from './node-prop.js'
  import type { AdminTableRowAction, AdminTableRowActionsProps } from './types.js'

  let { row, actions, ariaLabel, stopActionPropagation }: AdminTableRowActionsProps<T> = $props()

  // The translated default when the caller passes no label; `t` reads the
  // locale version inside the template expression, so the name follows a
  // locale switch like every other t() string.
  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  let open = $state(false)
  let popover: HTMLDivElement | undefined = $state()

  // As in React's effect: the listeners exist only while the menu is open. The
  // returned function runs when the effect re-runs or the component unmounts.
  $effect(() => {
    if (!open) return
    /**
     * Closes the menu for a click outside the popover; clicks on the menu
     * surface or between items stay put, and each item closes the menu itself
     * (React's containment check).
     * @param event - The document click.
     */
    const onDocumentClick = (event: MouseEvent): void => {
      const target = event.target
      if (popover && target instanceof Node && popover.contains(target)) return
      open = false
    }
    /**
     * Closes the menu on Escape, from wherever focus sits.
     * @param event - The document keydown.
     */
    const onDocumentKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') open = false
    }
    document.addEventListener('click', onDocumentClick)
    document.addEventListener('keydown', onDocumentKeydown)
    return () => {
      document.removeEventListener('click', onDocumentClick)
      document.removeEventListener('keydown', onDocumentKeydown)
    }
  })

  /**
   * The menu item's class list (React's `cn(...)` for an item).
   * @param action - The action.
   * @returns The class string.
   */
  function itemClass(action: AdminTableRowAction<T>): string {
    return cm.cn(
      cm.flex({ align: 'center' }),
      cm.w('full'),
      cm.sp('px', 4),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.cursorPointer,
      // Theme-aware hover surface.
      cm.tableRowHoverable,
      // Destructive → theme error color + weight.
      action.destructive ? cm.textError : '',
      action.destructive ? cm.fontWeight('semibold') : '',
    )
  }

  /**
   * An action's href for this row (React's `action.hrefFor?.(row)`).
   * @param action - The action.
   * @returns The href, or an empty string when it is not a link.
   */
  function hrefOf(action: AdminTableRowAction<T>): string {
    return action.hrefFor?.(row) ?? ''
  }

  /**
   * A button item's click: close the menu, then run the action (React's async
   * handler).
   * @param action - The action.
   */
  async function activate(action: AdminTableRowAction<T>): Promise<void> {
    open = false
    await action.onSelect(row)
  }
</script>

{#snippet node(value: ReactNodeProp | undefined)}
  {#if typeof value === 'function'}{@render value?.()}{:else if value !== undefined && value !== ''}{value}{/if}
{/snippet}

<div class={cm.cn(cm.position('relative'))}>
  <!--
    The shared ghost icon button, rendered here rather than through
    `@molecule/app-ui-svelte`'s Button: that component's `size` prop type omits
    `'icon'` (the core `ButtonSize` includes it), so it cannot be used for the
    kebab at type-check time. `cm.button({ variant, color, size, fullWidth })`
    plus `aria-busy` is exactly what that Button renders.
  -->
  <button
    type="button"
    class={cm.cn(cm.button({ variant: 'ghost', color: 'primary', size: 'icon', fullWidth: false }))}
    aria-busy="false"
    aria-label={ariaLabel ??
      t('adminTable.aria.rowActions', undefined, { defaultValue: 'Row actions' })}
    aria-haspopup="menu"
    aria-expanded={open ? 'true' : 'false'}
    data-mol-id="admin-table-row-actions-trigger"
    onclick={(event: MouseEvent) => {
      event.stopPropagation()
      open = !open
    }}
  >
    <!-- The ligature name is font data, not text; the button's aria-label names it. -->
    <span aria-hidden="true" class={cm.cn(cm.iconGlyphFont)} data-icon="more_vert">more_vert</span>
  </button>
  {#if open}
    <div
      bind:this={popover}
      class={cm.cn(cm.surface, cm.borderAll)}
      style="position: absolute; top: 100%; right: 0px; margin-top: 4px; min-width: 160px; z-index: 20; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12)"
    >
      <div class={cm.cn(cm.sp('py', 1))}>
        {#each actions as action, index (index)}
          {#if action.hrefFor}
            <a
              href={hrefOf(action)}
              class={itemClass(action)}
              data-mol-id={action.dataMolIdFor?.(row)}
              onclick={(event) => {
                if (stopActionPropagation) event.stopPropagation()
                open = false
              }}
            >
              {@render node(action.label)}
            </a>
          {:else}
            <button
              class={itemClass(action)}
              data-mol-id={action.dataMolIdFor?.(row)}
              onclick={(event) => {
                if (stopActionPropagation) event.stopPropagation()
                void activate(action)
              }}
            >
              {@render node(action.label)}
            </button>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>
