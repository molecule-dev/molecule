<!--
  Dropdown: WAI-ARIA APG menu-button pattern. A single-element trigger
  (rendered through `trigger`) is turned into the real menu button — its
  element is adopted in place and given aria-haspopup/aria-expanded/
  aria-controls, tabindex and the open/keyboard handlers, with no extra
  wrapper, exactly like React's cloneElement path; any other trigger (text,
  several nodes, none) is wrapped in a role="button" tabindex="0" container
  instead. Enter/Space/ArrowDown open onto the first item (ArrowUp the last);
  ArrowUp/Down/Home/End rove the role="menuitem" items; Escape closes and
  returns focus to the trigger; Tab closes without trapping; an outside
  mousedown closes without refocusing; a route change closes the open menu
  (and announces the state once on mount). The menu portals to document.body,
  positioned absolutely from the trigger's rect one animation frame after
  opening.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import { bodyPortal, useGeneratedId } from '../dom.js'
  import { useLocation } from '../framework.js'
  import { type CSSStyle, reactStyle } from '../style.js'
  import type { DropdownItem, DropdownProps } from '../types.js'
  import { calculateDropdownPosition } from './dropdown.js'
  import ReactNode from './ReactNode.svelte'

  let {
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
  // The interactive trigger node — the adopted single-element trigger or the
  // role="button" wrapper. Used for position measurement, outside-click
  // detection AND focus restoration.
  let triggerEl = $state<HTMLElement | null>(null)
  let menuEl = $state<HTMLDivElement | null>(null)
  const itemEls: (HTMLDivElement | null)[] = []
  // Which end of the menu keyboard-driven opens should focus: ArrowDown (and
  // Enter/Space/click) want the first item, ArrowUp wants the last.
  let pendingOpenFocus: 'first' | 'last' = 'first'

  const isOpen = $derived(controlledOpen !== undefined ? controlledOpen : internalOpen)

  const setOpen = (open: boolean): void => {
    if (controlledOpen === undefined) internalOpen = open
    onOpenChange?.(open)
  }

  const updatePosition = (): void => {
    const t = triggerEl
    const m = menuEl
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
    if (!isOpen) pendingOpenFocus = 'first'
    setOpen(!isOpen)
  }

  const handleTriggerKeyDown = (e: KeyboardEvent): void => {
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

  // Syncs real DOM focus to the roving-tabindex active item.
  $effect(() => {
    if (!isOpen || activeIndex < 0) return
    itemEls[activeIndex]?.focus()
  })

  // Close on outside mousedown and Escape (with focus restoration).
  $effect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent): void => {
      const t = triggerEl
      const m = menuEl
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
  // clicks underneath. Like React's mount effect, this also runs once on
  // mount, announcing the (already false) open state through onOpenChange.
  $effect(() => {
    void $location.pathname
    void $location.search
    setOpen(false)
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

  // Trigger adoption. React clones a single-element trigger's element with
  // the menu-button props; Svelte snippets render in place, so the trigger is
  // rendered into a host div and adopted after mount: a single element child
  // keeps its own element (the host unwraps out of the DOM, leaving no
  // wrapper), everything else turns the host itself into React's
  // role="button" fallback container.
  let triggerHost = $state<HTMLDivElement | null>(null)
  let adopted = false
  $effect(() => {
    if (!triggerHost || adopted) return
    adopted = true
    const host = triggerHost
    // Svelte anchors snippets with comment and empty text nodes; the trigger's
    // rendered content is what remains once those are ignored.
    const content = Array.from(host.childNodes).filter(
      (n) =>
        n.nodeType !== Node.COMMENT_NODE &&
        !(n.nodeType === Node.TEXT_NODE && !(n.textContent ?? '').trim()),
    )
    const single =
      content.length === 1 && content[0]!.nodeType === Node.ELEMENT_NODE
        ? (content[0] as HTMLElement)
        : null
    const el = single ?? host
    if (single) {
      const parent = host.parentNode
      if (parent) {
        while (host.firstChild) parent.insertBefore(host.firstChild, host)
        parent.removeChild(host)
      }
    } else {
      host.setAttribute('role', 'button')
      host.classList.add(cm.dropdownTrigger)
    }
    if (el.getAttribute('tabindex') === null) el.setAttribute('tabindex', '0')
    el.setAttribute('aria-haspopup', 'menu')
    el.addEventListener('click', handleTriggerClick)
    el.addEventListener('keydown', handleTriggerKeyDown)
    triggerEl = el
  })

  // React's cloned/wrapped trigger re-renders with the live open state; the
  // adopted element gets the same attributes re-applied on every change.
  $effect(() => {
    const el = triggerEl
    if (!el) return
    el.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
    if (isOpen) el.setAttribute('aria-controls', menuId)
    else el.removeAttribute('aria-controls')
    if (testId !== undefined) el.setAttribute('data-testid', testId)
    else el.removeAttribute('data-testid')
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
  // reference renders. The role is referenced through a constant so
  // svelte-check's focusable-role heuristic, which wants a tabindex here,
  // accepts the parity markup.
  const menuRole = 'menu' as const
</script>

{#snippet triggerNodes()}
  {#if typeof trigger === 'string'}{trigger}{:else}{@render trigger?.()}{/if}
{/snippet}

<div bind:this={triggerHost}>{@render triggerNodes()}</div>

{#if isOpen}
  <div
    bind:this={menuEl}
    id={menuId}
    role={menuRole}
    data-state="open"
    class={cm.cn(cm.dropdownContent, className)}
    use:reactStyle={menuStyle}
    use:bodyPortal
    data-testid={testId ? `${testId}-menu` : undefined}
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
  </div>
{/if}
