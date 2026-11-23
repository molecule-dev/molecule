<!--
  Dropdown: WAI-ARIA APG menu-button pattern. The trigger snippet receives
  {@link DropdownTriggerProps} — one attachment — to spread on its own element,
  which makes that element the real menu button the way React's cloneElement
  path does: aria-haspopup/aria-expanded/aria-controls, tabindex, the
  open/keyboard handlers, and no wrapper. The attachment runs on whichever
  element the snippet renders, so a trigger whose root element changes is
  followed. A string trigger, or a snippet that does not spread the props
  (renders text, several nodes, or ignores its argument), is wrapped in a
  role="button" tabindex="0" container instead. Enter/Space/ArrowDown open onto
  the first item (ArrowUp the last); ArrowUp/Down/Home/End rove the
  role="menuitem" items; Escape closes and returns focus to the trigger; Tab
  closes without trapping; an outside mousedown closes without refocusing; a
  route change closes the open menu (and announces the state once on mount).
  The menu portals to document.body, positioned absolutely from the trigger's
  rect one animation frame after opening.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { type Attachment, createAttachmentKey } from 'svelte/attachments'

  import { BodyPortal, useLocation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useGeneratedId } from '../dom.js'
  import { type CSSStyle, reactStyle } from '../style.js'
  import type { DropdownItem, DropdownProps, DropdownTriggerProps } from '../types.js'
  import { calculateDropdownPosition } from './dropdown.js'
  import ReactNode from './ReactNode.svelte'

  let {
    ref = $bindable(null),
    trigger,
    items,
    onSelect,
    placement = 'bottom-start',
    open: controlledOpen,
    onOpenChange,
    align = 'start',
    width,
    className,
    style,
    testId,
    automationId,
    disabled,
  }: DropdownProps = $props()

  const cm = $derived(getClassMap())
  const location = useLocation()
  const menuId = useGeneratedId()

  /** Indices of the non-separator, non-disabled items — the set Arrow/Home/End navigate. */
  const focusableItemIndexes = (list: DropdownItem[]): number[] =>
    list.reduce<number[]>((acc, item, i) => {
      if (!item.separator && !item.disabled) acc.push(i)
      return acc
    }, [])

  let internalOpen = $state(false)
  let position = $state<{ top: number; left: number }>({ top: 0, left: 0 })
  let activeIndex = $state(-1)
  // The interactive trigger node — the element the trigger snippet spread the
  // attachment on, or the role="button" wrapper. Used for position measurement,
  // outside-click detection AND focus restoration.
  let triggerEl = $state<HTMLElement | null>(null)
  const itemEls: (HTMLDivElement | null)[] = []
  // Which end of the menu keyboard-driven opens should focus: ArrowDown (and
  // Enter/Space/click) want the first item, ArrowUp wants the last.
  let pendingOpenFocus: 'first' | 'last' = 'first'

  // A disabled dropdown never opens, whatever `open` says.
  const isOpen = $derived(
    !disabled && (controlledOpen !== undefined ? controlledOpen : internalOpen),
  )

  const setOpen = (open: boolean): void => {
    if (controlledOpen === undefined) internalOpen = open
    onOpenChange?.(open)
  }

  const updatePosition = (): void => {
    const t = triggerEl
    const m = ref
    if (t && m) {
      position = calculateDropdownPosition(
        t.getBoundingClientRect(),
        m.getBoundingClientRect(),
        placement,
        align,
      )
    }
  }

  const handleTriggerClick = (): void => {
    if (disabled) return
    if (!isOpen) pendingOpenFocus = 'first'
    setOpen(!isOpen)
  }

  const handleTriggerKeyDown = (e: KeyboardEvent): void => {
    if (disabled) return
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        pendingOpenFocus = 'first'
        setOpen(true)
        break
      case 'ArrowDown':
        e.preventDefault()
        pendingOpenFocus = 'first'
        setOpen(true)
        break
      case 'ArrowUp':
        e.preventDefault()
        pendingOpenFocus = 'last'
        setOpen(true)
        break
      default:
        break
    }
  }

  const handleClose = (): void => {
    setOpen(false)
  }

  // Closes AND returns focus to the trigger — used for every USER-DRIVEN
  // close (Escape, item selection) so keyboard focus never gets dropped onto
  // the (now-removed) menu. Outside-click and route-change closes
  // deliberately do NOT refocus (the user's attention is already elsewhere).
  const closeAndRefocusTrigger = (): void => {
    handleClose()
    triggerEl?.focus()
  }

  // Update position when menu opens: the animation frame ensures the menu is
  // rendered before its position is calculated.
  $effect(() => {
    if (!isOpen) return
    void placement
    void align
    requestAnimationFrame(updatePosition)
  })

  // Moves focus to the first (or last, for an ArrowUp-driven open) item
  // whenever the menu transitions closed → open. Reading `items` untracked
  // (React reads it through a ref for the same reason) means a parent update
  // that recreates the `items` array does not re-run this and yank focus back
  // to the first item out from under a user who already arrow-keyed further.
  $effect(() => {
    if (!isOpen) {
      activeIndex = -1
      return
    }
    const focusable = focusableItemIndexes(untrack(() => items))
    const wantLast = pendingOpenFocus === 'last'
    pendingOpenFocus = 'first'
    if (focusable.length === 0) return
    activeIndex = wantLast ? focusable[focusable.length - 1]! : focusable[0]!
  })

  // Syncs real DOM focus to the roving-tabindex active item (React's effect on
  // `[isOpen, activeIndex]`).
  let focusedItemEl: HTMLDivElement | null = null
  $effect(() => {
    if (!isOpen || activeIndex < 0) return
    const el = itemEls[activeIndex] ?? null
    el?.focus()
    focusedItemEl = el
  })

  // React's keyed reconciliation moves a focused item's node without detaching
  // it, so the item keeps DOM focus across an items update; Svelte's keyed each
  // detaches the node it moves, which drops focus to the body. The pre-effect
  // runs before the DOM updates: it notes whether the item held focus, and the
  // effect after the update puts focus back only then. Focus the user moved
  // elsewhere stays there.
  let itemHadFocus = false
  $effect.pre(() => {
    void items
    itemHadFocus = focusedItemEl !== null && document.activeElement === focusedItemEl
  })
  $effect(() => {
    void items
    const el = focusedItemEl
    if (!itemHadFocus || !el || !untrack(() => isOpen)) return
    if (el.isConnected && document.activeElement !== el) el.focus()
  })

  // Close on outside mousedown and Escape (with focus restoration).
  $effect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent): void => {
      const t = triggerEl
      const m = ref
      if (t && !t.contains(e.target as Node) && m && !m.contains(e.target as Node)) handleClose()
    }
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeAndRefocusTrigger()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  })

  // Close on route change — a dropdown left open over the next page blocks
  // clicks underneath. Mounting is not a route change, so the first run only
  // records the route.
  let closedForRoute: string | null = null
  $effect(() => {
    const route = `${$location.pathname}${$location.search}`
    if (route === closedForRoute) return
    const mounting = closedForRoute === null
    closedForRoute = route
    if (!mounting) setOpen(false)
  })

  const handleMenuKeyDown = (e: KeyboardEvent): void => {
    const focusable = focusableItemIndexes(items)
    if (focusable.length === 0) return
    const currentPos = focusable.indexOf(activeIndex)

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        activeIndex = focusable[(currentPos + 1 + focusable.length) % focusable.length]!
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        activeIndex = focusable[(currentPos - 1 + focusable.length) % focusable.length]!
        break
      }
      case 'Home':
        e.preventDefault()
        activeIndex = focusable[0]!
        break
      case 'End':
        e.preventDefault()
        activeIndex = focusable[focusable.length - 1]!
        break
      case 'Tab':
        // APG: native menus do not trap Tab — it exits the menu. Don't
        // preventDefault (the browser still moves focus natively); just close
        // our state in sync with focus leaving.
        handleClose()
        break
      default:
        break
    }
  }

  const itemClick = (item: DropdownItem): void => {
    if (!item.disabled) {
      onSelect?.(item.value)
      closeAndRefocusTrigger()
    }
  }

  const itemKeyDown = (e: KeyboardEvent, item: DropdownItem): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      itemClick(item)
    }
  }

  // Trigger adoption. React clones a single-element trigger with the
  // menu-button props; here the snippet spreads an attachment on its own
  // element, and the attachment does what the clone does on that element and
  // undoes it in its cleanup. It reads the reactive values below, so Svelte
  // re-runs it when they change — a trigger whose root element changes is
  // followed because the attachment runs on the new element.
  const triggerAttachment: Attachment<HTMLElement> = (el) => {
    const open = isOpen
    const isDisabled = disabled
    const givenTestId = testId
    const givenAutomationId = automationId
    // React's `cloneElement` keeps the trigger's own tabindex; only an
    // element that has none becomes a tab stop.
    const ownTabindex = el.hasAttribute('tabindex')
    if (!ownTabindex) el.setAttribute('tabindex', '0')
    el.setAttribute('aria-haspopup', 'menu')
    el.setAttribute('aria-expanded', open ? 'true' : 'false')
    if (open) el.setAttribute('aria-controls', menuId)
    else el.removeAttribute('aria-controls')
    // Only a given id replaces the trigger's own; an absent one leaves it in
    // place (only a value this attachment set is removed).
    let setTestId = false
    if (givenTestId !== undefined) {
      el.setAttribute('data-testid', givenTestId)
      setTestId = true
    }
    let setAutomationId = false
    if (givenAutomationId !== undefined) {
      el.setAttribute('data-mol-id', givenAutomationId)
      setAutomationId = true
    }
    // A disabled dropdown disables the cloned trigger (a Button or a native
    // button then ignores clicks).
    let setDisabled = false
    if (isDisabled) {
      el.setAttribute('disabled', '')
      setDisabled = true
    }
    // `addEventListener`, not `onclick`, so the element's own handlers still
    // run — React composes the trigger's onClick with its own the same way.
    el.addEventListener('click', handleTriggerClick)
    el.addEventListener('keydown', handleTriggerKeyDown)
    triggerEl = el
    untrack(() => (attachedTriggers += 1))
    return () => {
      untrack(() => (attachedTriggers -= 1))
      if (!ownTabindex) el.removeAttribute('tabindex')
      el.removeAttribute('aria-haspopup')
      el.removeAttribute('aria-expanded')
      el.removeAttribute('aria-controls')
      if (setTestId) el.removeAttribute('data-testid')
      if (setAutomationId) el.removeAttribute('data-mol-id')
      if (setDisabled) el.removeAttribute('disabled')
      el.removeEventListener('click', handleTriggerClick)
      el.removeEventListener('keydown', handleTriggerKeyDown)
      if (triggerEl === el) triggerEl = null
    }
  }

  // Read by the attachment (not tracked): true once an element spread the
  // props during a render. The snippet's own render runs synchronously before
  // any effect, so the decision effect below sees the value the first render
  // left — never an ordering race with the attachment's effect.
  let triggerApplied = false
  const triggerAttachmentKey = createAttachmentKey()
  const triggerProps = Object.defineProperty({}, triggerAttachmentKey, {
    enumerable: true,
    get() {
      triggerApplied = true
      return triggerAttachment
    },
  }) as DropdownTriggerProps

  // React wraps anything that is not a single element in its role="button"
  // fallback. Once the snippet's first render has finished, a snippet that
  // spreads the attachment has already read it (the getter above ran during
  // that render); no read means it rendered text, several nodes, or ignored
  // its argument, so switch to the fallback and render it there (with the
  // counting props below).
  let decidedFallback = $state(false)
  $effect(() => {
    if (trigger !== undefined && typeof trigger !== 'string' && !triggerApplied) {
      decidedFallback = true
    }
  })

  // React decides on every render whether the trigger is a single element, so
  // a trigger whose content changes (a list that empties, then refills) moves
  // between the clone and the fallback. The elements the attachment is on now:
  // none left means the snippet no longer renders the element (React's
  // fallback wraps what it renders now).
  let attachedTriggers = $state(0)
  $effect(() => {
    if (!decidedFallback && triggerApplied && attachedTriggers === 0) decidedFallback = true
  })
  // In the fallback the snippet gets props whose attachment only counts the
  // elements it is on: once the snippet spreads them on an element again, that
  // element is the trigger again.
  let probedTriggers = $state(0)
  const probeAttachment: Attachment<HTMLElement> = () => {
    untrack(() => (probedTriggers += 1))
    return () => untrack(() => (probedTriggers -= 1))
  }
  const probeProps = { [createAttachmentKey()]: probeAttachment } as DropdownTriggerProps
  $effect(() => {
    if (decidedFallback && probedTriggers > 0) decidedFallback = false
  })

  // Not measurable until the trigger element exists (the first open frame,
  // before layout); undefined then lets the menu size itself until a later
  // update recomputes with the real pixel width.
  const menuWidth = $derived.by(() => {
    if (width === 'trigger') return triggerEl?.offsetWidth
    if (typeof width === 'number') return width
    return width
  })

  const menuStyle = $derived.by(() => {
    const out: CSSStyle = { ...(style ?? {}) }
    out.position = 'absolute'
    out.top = position.top
    out.left = position.left
    if (menuWidth !== undefined) out.width = menuWidth
    out.zIndex = 50
    return out
  })

  // Focus lands on the menu's items (roving `tabindex`), not on the menu
  // container — the APG menu-button pattern, and exactly what React's
  // reference renders.
</script>

{#if typeof trigger === 'string' || trigger === undefined || decidedFallback}
  <!-- React's fallback: a role="button" container around a trigger that is not
       a single element the props could be spread on. -->
  <div
    bind:this={triggerEl}
    role="button"
    tabindex={disabled ? -1 : 0}
    aria-disabled={disabled || undefined}
    aria-haspopup="menu"
    aria-expanded={isOpen}
    aria-controls={isOpen ? menuId : undefined}
    onclick={handleTriggerClick}
    onkeydown={handleTriggerKeyDown}
    class={cm.dropdownTrigger}
    data-testid={testId}
    data-mol-id={automationId}
  >
    {#if typeof trigger === 'string'}{trigger}{:else if trigger}{@render trigger(probeProps)}{/if}
  </div>
{:else}
  {@render trigger(triggerProps)}
{/if}

{#if isOpen}
  <!-- Focusable but never a Tab stop (the items carry the roving tab stop):
       a click on a separator or the menu's padding keeps focus in the menu,
       so the arrow keys still move between its items. -->
  <BodyPortal
    ><div
      bind:this={ref}
      id={menuId}
      role="menu"
      tabindex={-1}
      data-state="open"
      class={cm.cn(cm.dropdownContent, className)}
      use:reactStyle={menuStyle}
      data-testid={testId ? `${testId}-menu` : undefined}
      data-mol-id={automationId ? `${automationId}-menu` : undefined}
      onkeydown={handleMenuKeyDown}
    >
      {#each items as item, index (item.separator ? `separator-${index}` : item.value)}
        {#if item.separator}
          <div class={cm.dropdownSeparator} role="separator"></div>
        {:else}
          <div
            bind:this={itemEls[index]}
            role="menuitem"
            tabindex={item.disabled ? -1 : index === activeIndex ? 0 : -1}
            class={cm.cn(cm.dropdownItem, item.disabled && cm.dropdownItemDisabled)}
            onclick={() => itemClick(item)}
            onkeydown={(e) => itemKeyDown(e, item)}
            aria-disabled={item.disabled || undefined}
            data-disabled={item.disabled || undefined}
          >
            {#if item.icon}<span class={cm.dropdownItemIcon}><ReactNode node={item.icon} /></span
              >{/if}<span class={cm.dropdownItemLabel}><ReactNode node={item.label} /></span
            >{#if item.shortcut}<span class={cm.dropdownItemShortcut}>{item.shortcut}</span>{/if}
          </div>
        {/if}
      {/each}
    </div></BodyPortal
  >
{/if}
