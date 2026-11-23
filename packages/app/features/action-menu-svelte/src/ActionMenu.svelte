<!--
  ActionMenu: the Svelte counterpart of `@molecule/app-action-menu-react`'s
  `ActionMenu` — a kebab / overflow trigger button that opens a popover list of
  actions. Same props (React names), same DOM for the same input, and the same
  click callbacks. Pure uncontrolled: the component manages its own open state,
  closes on an outside mousedown and on Escape.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { ActionMenuItem, ActionMenuProps } from './types.js'

  let { items, trigger, align = 'right', triggerAriaLabel, className }: ActionMenuProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())

  /**
   * The trigger's label: the prop when given, else the translated default
   * (read in the template, so a locale switch re-renders it).
   * @returns The label text.
   */
  const triggerLabel = (): string =>
    triggerAriaLabel ?? t('actionMenu.aria.trigger', undefined, { defaultValue: 'Actions' })

  let open = $state(false)
  let wrapper: HTMLSpanElement | undefined = $state()

  // As in React's effect: the listeners exist only while the menu is open. The
  // returned function runs when the effect re-runs or the component unmounts.
  $effect(() => {
    if (!open) return
    /**
     * Closes the menu when a mousedown occurs outside the wrapper element.
     * @param event - The document mousedown.
     */
    const onDoc = (event: MouseEvent): void => {
      if (!wrapper?.contains(event.target as Node)) open = false
    }
    /**
     * Closes the menu when the Escape key is pressed.
     * @param event - The document keydown.
     */
    const onEsc = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') open = false
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  })

  /**
   * The classes of an item rendered as a button (React's button branch).
   * @param item - The item.
   * @returns The class string.
   */
  const buttonClasses = (item: ActionMenuItem): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.w('full'),
      cm.sp('px', 2),
      cm.sp('py', 2),
      cm.textSize('sm'),
      item.destructive && cm.textError,
      item.destructive ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
    )

  /**
   * The classes of an item rendered as an anchor (React's anchor branch, which
   * has no `w('full')`).
   * @param item - The item.
   * @returns The class string.
   */
  const anchorClasses = (item: ActionMenuItem): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 2),
      cm.sp('py', 2),
      cm.textSize('sm'),
      item.destructive && cm.textError,
      item.destructive ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
    )

  /** React's `onClick` for a button item: call the handler, then close. */
  const activate = (item: ActionMenuItem): void => {
    if (item.disabled) return
    item.onClick?.()
    open = false
  }

  // React writes the popover's box inline; the declarations are the same ones,
  // in the same units (`right: 0px` is how React's `right: 0` serializes).
  const listStyle = $derived(
    `position: absolute; top: 100%; ${align === 'right' ? 'right' : 'left'}: 0px; min-width: 160px; z-index: 50; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12)`,
  )
</script>

<span
  bind:this={wrapper}
  class={cm.cn(cm.position('relative'), className)}
  style="display: inline-block"
>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => (open = !open)}
    aria-label={triggerLabel()}
    aria-haspopup="menu"
    aria-expanded={open}
    data-mol-id="action-menu-trigger"
  >
    {#if trigger === undefined || trigger === null}
      ⋮
    {:else if typeof trigger === 'string'}
      {trigger}
    {:else}
      {@render trigger?.()}
    {/if}
  </Button>
  {#if open}
    <ul
      role="menu"
      data-mol-id="action-menu-list"
      class={cm.cn(cm.stack(0 as const), cm.sp('p', 1), cm.surface, cm.borderAll)}
      style={listStyle}
    >
      {#each items as item (item.id)}
        <li role="none">
          {#if item.href}
            <a
              href={item.href}
              role="menuitem"
              data-mol-id={`action-menu-item-${item.id}`}
              onclick={() => (open = false)}
              class={anchorClasses(item)}
              style="opacity: {item.disabled ? 0.5 : 1}"
            >
              {#if item.icon !== undefined && item.icon !== null}
                {#if typeof item.icon === 'string'}{item.icon}{:else}{@render item.icon?.()}{/if}
              {/if}
              <span>
                {#if typeof item.label === 'string'}{item.label}{:else}{@render item.label?.()}{/if}
              </span>
            </a>
          {:else}
            <button
              type="button"
              role="menuitem"
              data-mol-id={`action-menu-item-${item.id}`}
              onclick={() => activate(item)}
              disabled={item.disabled}
              class={buttonClasses(item)}
            >
              {#if item.icon !== undefined && item.icon !== null}
                {#if typeof item.icon === 'string'}{item.icon}{:else}{@render item.icon?.()}{/if}
              {/if}
              <span>
                {#if typeof item.label === 'string'}{item.label}{:else}{@render item.label?.()}{/if}
              </span>
            </button>
          {/if}
          {#if item.divider}
            <span
              aria-hidden="true"
              class={cm.cn(cm.displayBlock, cm.bgBorder)}
              style="height: 1px; margin: 4px 0px"
            ></span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</span>
