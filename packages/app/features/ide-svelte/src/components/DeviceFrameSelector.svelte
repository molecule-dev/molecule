<!--
  Device-frame selector for the preview panel — a themed dropdown menu.

  Svelte counterpart of `@molecule/app-ide-react`'s `DeviceFrameSelector` (see
  that file for the design notes): the same props (React names), the same DOM
  for the same input, the same callbacks. The trigger shows the CURRENT frame's
  icon plus a chevron-down affordance; opening it lists every device frame with
  its bonded icon + i18n label, then — after a divider — the preview's Rotate
  (`menuitemcheckbox` toggle, shown only where relevant) and Open-in-new-tab
  actions sharing the frame rows' roving focus.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express, written the way the DOM takes them. All user-facing
  text goes through `t()`.
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type DeviceFrameSelectorWithActionsProps = types.DeviceFrameSelectorWithActionsProps
</script>

<script lang="ts">
  import type { IconName } from '@molecule/app-icons'
  import { DEVICE_FRAMES, DEVICE_META } from '@molecule/app-ide-panel-logic'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Tooltip } from '@molecule/app-ui-svelte'

  import Icon from './Icon.svelte'

  /** One device frame (the shared frame union, read off the panel-logic list). */
  type Frame = (typeof DEVICE_FRAMES)[number]

  /**
   * One in-dropdown action row (Rotate / Open in new tab), after the divider.
   */
  interface ActionItem {
    /** The row's `data-mol-id`. */
    id: string
    /** The bonded icon-set glyph. */
    icon: IconName
    /** The translated label. */
    label: string
    /** The callback the row runs. */
    run: () => void
    /** When set, the row renders as a `menuitemcheckbox` reflecting this state. */
    checked?: boolean
  }

  let {
    current,
    onChange,
    className,
    canRotate,
    rotated,
    onRotate,
    onOpenExternal,
  }: DeviceFrameSelectorWithActionsProps = $props()

  const { t } = useTranslation()
  const cm = getClassMap()

  let open = $state(false)
  // Index of the menu item with roving focus while the menu is open.
  let activeIndex = $state(0)
  let rootEl: HTMLDivElement | undefined = $state()
  let triggerEl: HTMLButtonElement | undefined = $state()
  let menuEl: HTMLDivElement | undefined = $state()

  /** The current frame's index in the frame list. */
  const currentIndex = $derived(Math.max(0, DEVICE_FRAMES.indexOf(current)))

  /** The trigger's tooltip text (also the menu's accessible name). */
  const selectLabel = $derived(t('ide.device.select', undefined, { defaultValue: 'Device frame' }))

  /** The translated label for one frame's menu row (a `t()` call per row). */
  const frameLabel = (frame: Frame): string =>
    t(DEVICE_META[frame].labelKey, undefined, { defaultValue: DEVICE_META[frame].label })

  // Action rows shown below the device frames (P4-04), after a divider: Rotate
  // (only "where relevant" — a rotatable frame AND a wired handler) and Open in
  // new tab (whenever a handler is wired). A derived value over the wired
  // handlers and the translated labels, so the rows follow a prop change and a
  // locale switch the way React's render does.
  const actionItems = $derived.by((): ReadonlyArray<ActionItem> => [
    ...(canRotate && onRotate
      ? [
          {
            id: 'preview-device-rotate',
            icon: 'rotate' as const,
            label: t('ide.device.rotate', undefined, { defaultValue: 'Rotate' }),
            run: onRotate,
            // Rotate is a TOGGLE (portrait ⇄ landscape) — show its state with
            // a check, so it reads as a toggle, not a one-shot action.
            checked: !!rotated,
          },
        ]
      : []),
    ...(onOpenExternal
      ? [
          {
            id: 'preview-open-external',
            icon: 'link-external' as const,
            label: t('ide.preview.openNewTab', undefined, { defaultValue: 'Open in new tab' }),
            run: onOpenExternal,
          },
        ]
      : []),
  ])

  /** The total roving-focus targets: device frames + the conditional action rows. */
  const itemCount = $derived(DEVICE_FRAMES.length + actionItems.length)

  /**
   * The `data-mol-id` of the row at a roving-focus index (a frame, or an
   * action row past the frame list).
   *
   * @param index - The roving-focus index.
   * @returns The row's id, or `undefined` past the last row.
   */
  function rowIdAt(index: number): string | undefined {
    const frame = DEVICE_FRAMES[index]
    if (frame) return `preview-device-option-${frame}`
    return actionItems[index - DEVICE_FRAMES.length]?.id
  }

  /**
   * Closes the menu, returning focus to the trigger unless the close should
   * leave focus where it is (React's `closeMenu(refocus)`).
   *
   * @param refocus - Whether the trigger takes focus back (default `true`).
   */
  function closeMenu(refocus = true): void {
    open = false
    // Svelte updates the DOM after the handler, like React's batched
    // `setOpen(false)` — so the menu is still mounted while the trigger takes
    // focus, exactly the DOM state React's close produces.
    if (refocus) triggerEl?.focus()
  }

  /**
   * Opens the menu with roving focus on the given row.
   *
   * @param index - The row the focus starts on.
   */
  function openMenu(index: number): void {
    activeIndex = index
    open = true
  }

  /**
   * Selects a frame: fires `onChange` and closes the menu.
   *
   * @param frame - The chosen frame.
   */
  function select(frame: Frame): void {
    onChange(frame)
    closeMenu()
  }

  /**
   * Runs an action row (Rotate / Open in new tab) then closes the menu.
   *
   * @param run - The action's callback.
   */
  function runAction(run: () => void): void {
    run()
    closeMenu()
  }

  /**
   * The trigger's keyboard handling: ArrowDown / Enter / Space open at the
   * current frame, ArrowUp opens at the last row.
   *
   * @param event - The key press.
   */
  function onTriggerKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openMenu(currentIndex)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(itemCount - 1)
    }
  }

  /**
   * The menu's keyboard handling: the arrows move the roving focus with
   * wrapping, Home/End jump to the ends, Escape closes (refocusing the
   * trigger) and Tab lets focus leave while the menu collapses.
   *
   * @param event - The key press.
   */
  function onMenuKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        activeIndex = (activeIndex + 1) % itemCount
        break
      case 'ArrowUp':
        event.preventDefault()
        activeIndex = (activeIndex - 1 + itemCount) % itemCount
        break
      case 'Home':
        event.preventDefault()
        activeIndex = 0
        break
      case 'End':
        event.preventDefault()
        activeIndex = itemCount - 1
        break
      case 'Escape':
        event.preventDefault()
        closeMenu()
        break
      case 'Tab':
        // Let focus leave naturally, but collapse the menu.
        open = false
        break
      default:
        break
    }
  }

  // Close on outside pointer-down (React's `useEffect` on `open`).
  $effect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent): void => {
      if (rootEl && !rootEl.contains(event.target as Node)) open = false
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  })

  // Move real DOM focus to the active row whenever the menu opens / moves
  // (React's `useEffect` on `[open, activeIndex]`, after the DOM update).
  $effect(() => {
    if (!open) return
    const id = rowIdAt(activeIndex)
    if (id) menuEl?.querySelector<HTMLButtonElement>(`[data-mol-id="${id}"]`)?.focus()
  })
</script>

<div bind:this={rootEl} style="position: relative; display: inline-flex">
  <Tooltip content={selectLabel} placement="bottom">
    <button
      bind:this={triggerEl}
      type="button"
      data-mol-id="preview-device-cycle"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={`${selectLabel}: ${frameLabel(current)}`}
      onclick={() => (open ? closeMenu(false) : openMenu(currentIndex))}
      onkeydown={onTriggerKeyDown}
      class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget, className)}
    >
      <Icon name={DEVICE_META[current].icon} size={16} aria-hidden="true" />
      <Icon name="chevron-down" size={12} aria-hidden="true" style="margin-left: 1px" />
    </button>
  </Tooltip>

  {#if open}
    <!-- React's menu carries tabindex="-1": the WAI-ARIA menu pattern keeps
         focus on the items, but the menu itself must be able to HOLD focus
         programmatically. -->
    <div
      bind:this={menuEl}
      role="menu"
      aria-label={selectLabel}
      tabindex="-1"
      onkeydown={onMenuKeyDown}
      class={cm.cn(cm.surface, cm.borderAll, cm.shadowLifted, cm.textSize('xs'))}
      style="position: absolute; top: 100%; right: 0px; margin-top: 4px; min-width: 168px; padding: 4px; border-radius: 8px; display: flex; flex-direction: column; gap: 2px; z-index: 30"
    >
      {#each DEVICE_FRAMES as frame, index (frame)}
        {@const isCurrent = frame === current}
        {@const isActive = index === activeIndex}
        <button
          type="button"
          role="menuitemradio"
          aria-checked={isCurrent}
          tabindex={isActive ? 0 : -1}
          data-mol-id={`preview-device-option-${frame}`}
          onclick={() => select(frame)}
          onmouseenter={() => (activeIndex = index)}
          class={cm.touchTargetCompact}
          style:display="flex"
          style:align-items="center"
          style:gap="8px"
          style:width="100%"
          style:padding="6px 8px"
          style:text-align="left"
          style:border="none"
          style:border-radius="6px"
          style:color="inherit"
          style:cursor="pointer"
          style:font="inherit"
          style:background={isActive
            ? 'var(--mol-color-surface-secondary, transparent)'
            : 'transparent'}
        >
          <Icon name={DEVICE_META[frame].icon} size={16} aria-hidden="true" />
          <span style="flex: 1 1 0%">{frameLabel(frame)}</span>
          {#if isCurrent}
            <Icon name="check" size={14} aria-hidden="true" />
          {/if}
        </button>
      {/each}

      {#if actionItems.length > 0}
        <!-- Divider between the device frames and the action rows (P4-04). A
             thin theme-token line, never a hex. -->
        <div
          role="separator"
          aria-hidden="true"
          data-mol-id="preview-device-menu-separator"
          style="height: 1px; margin: 4px 0px; background: var(--mol-color-border, rgba(128,128,128,0.2))"
        ></div>
      {/if}

      {#each actionItems as item, actionIdx (item.id)}
        {@const index = DEVICE_FRAMES.length + actionIdx}
        <button
          type="button"
          role={item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
          aria-checked={item.checked}
          tabindex={index === activeIndex ? 0 : -1}
          data-mol-id={item.id}
          onclick={() => runAction(item.run)}
          onmouseenter={() => (activeIndex = index)}
          class={cm.touchTargetCompact}
          style:display="flex"
          style:align-items="center"
          style:gap="8px"
          style:width="100%"
          style:padding="6px 8px"
          style:text-align="left"
          style:border="none"
          style:border-radius="6px"
          style:color="inherit"
          style:cursor="pointer"
          style:font="inherit"
          style:background={index === activeIndex
            ? 'var(--mol-color-surface-secondary, transparent)'
            : 'transparent'}
        >
          <Icon name={item.icon} size={16} aria-hidden="true" />
          <span style="flex: 1 1 0%">{item.label}</span>
          {#if item.checked}
            <Icon name="check" size={14} aria-hidden="true" />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
