/**
 * Dropdown family (React parity): Dropdown, DropdownLabel and
 * DropdownSeparator.
 *
 * @module
 */

import {
  type AfterViewChecked,
  type AfterViewInit,
  ChangeDetectorRef,
  Component,
  type DoCheck,
  effect,
  ElementRef,
  type EmbeddedViewRef,
  EventEmitter,
  inject,
  type OnDestroy,
  Output,
  Renderer2,
  signal,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core'

import { useRouter } from '@molecule/app-angular'
import type { DropdownItem, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { nextInstanceId } from '../utilities/ids.js'
import { styleText } from '../utilities/style.js'
import { MolTemplateOutlet } from './template-outlet.directive.js'

/** A menu position (viewport-independent, as React computes it). */
interface Position {
  /** Top offset in pixels. */
  top: number
  /** Left offset in pixels. */
  left: number
}

/**
 * Calculates the menu position from the trigger and menu rectangles — a
 * faithful port of React's `calculatePosition`.
 *
 * @param triggerRect - The trigger's bounding rectangle.
 * @param menuRect - The menu's bounding rectangle.
 * @param placement - The desired placement.
 * @param align - The alignment within the placement axis.
 * @param offset - The pixel gap from the trigger (default 4).
 * @returns The computed top and left position.
 */
function calculatePosition(
  triggerRect: DOMRect,
  menuRect: DOMRect,
  placement: NonNullable<DropdownPlacement>,
  align: NonNullable<DropdownAlign>,
  offset = 4,
): Position {
  let top = 0
  let left: number

  if (placement.startsWith('top')) {
    top = triggerRect.top + window.scrollY - menuRect.height - offset
  } else if (placement.startsWith('bottom')) {
    top = triggerRect.bottom + window.scrollY + offset
  } else if (placement === 'left' || placement === 'right') {
    top = triggerRect.top + window.scrollY + (triggerRect.height - menuRect.height) / 2
  }

  if (placement === 'left') {
    left = triggerRect.left + window.scrollX - menuRect.width - offset
  } else if (placement === 'right') {
    left = triggerRect.right + window.scrollX + offset
  } else {
    switch (align) {
      case 'start':
        left = triggerRect.left + window.scrollX
        break
      case 'end':
        left = triggerRect.right + window.scrollX - menuRect.width
        break
      case 'center':
      default:
        left = triggerRect.left + window.scrollX + (triggerRect.width - menuRect.width) / 2
        break
    }
  }

  if (placement.endsWith('-start')) {
    left = triggerRect.left + window.scrollX
  } else if (placement.endsWith('-end')) {
    left = triggerRect.right + window.scrollX - menuRect.width
  }

  return { top, left }
}

/** The dropdown placement values (React's union). */
type DropdownPlacement =
  'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right'

/** The dropdown alignment values (React's union). */
type DropdownAlign = 'start' | 'center' | 'end'

/**
 * Dropdown component.
 *
 * Implements the WAI-ARIA APG menu-button pattern exactly as React does: a
 * single-element `trigger` is adopted as the real control (no wrapper) and
 * cloned with `aria-haspopup`, `aria-expanded`, `aria-controls`, `tabindex`
 * and the open/keyboard handlers; any other trigger (text, several nodes) is
 * wrapped in a `role="button"` fallback container. The menu is rendered into
 * `document.body` (React's portal) and carries the position, width and
 * roving-tabindex behavior.
 *
 * The React root is a FRAGMENT (trigger + portal), so the host element is
 * unwrapped (`data-parity-unwrap`) and `display: contents` keeps it
 * fragment-like.
 */
@Component({
  selector: 'mol-dropdown',
  standalone: true,
  imports: [MolTemplateOutlet],
  inputs: [
    'trigger',
    'items',
    'placement',
    'open',
    'align',
    'width',
    'className',
    'style',
    'testId',
  ],
  outputs: ['select', 'openChange'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<span #triggerCapture><ng-content select="[slot=trigger]"></ng-content></span
    ><ng-container #menuAnchor></ng-container
    ><ng-template #menuTpl
      ><div
        [attr.id]="menuId"
        role="menu"
        data-state="open"
        [class]="menuClasses()"
        [style]="menuStyleText()"
        [attr.data-testid]="menuTestId()"
        (keydown)="handleMenuKeyDown($event)"
      >
        @for (item of items; track keyForItem(item, $index)) {
          @if (item.separator) {
            <div [class]="cm().dropdownSeparator" role="separator"></div>
          } @else {
            <div
              role="menuitem"
              [attr.tabindex]="itemTabIndex($index)"
              [class]="itemClasses(item)"
              (click)="handleItemClick(item)"
              (keydown)="handleItemKeyDown($event, item)"
              [attr.aria-disabled]="item.disabled ? 'true' : null"
              [attr.data-disabled]="item.disabled ? 'true' : null"
            >
              @if (item.icon) {
                <span [class]="cm().dropdownItemIcon">
                  @if (asTemplate(item.icon); as iconTpl) {
                    <ng-container [molTemplateOutlet]="iconTpl"></ng-container>
                  } @else {
                    {{ iconText(item.icon) }}
                  }
                </span>
              }
              <span [class]="cm().dropdownItemLabel">{{ item.label }}</span>
              @if (item.shortcut) {
                <span [class]="cm().dropdownItemShortcut">{{ item.shortcut }}</span>
              }
            </div>
          }
        }
      </div></ng-template
    >`,
})
export class Dropdown implements AfterViewInit, AfterViewChecked, DoCheck, OnDestroy {
  /** Dropdown trigger (node-valued prop). */
  trigger?: unknown
  /** Dropdown items. */
  items: DropdownItem<string>[] = []
  /** Menu placement. */
  placement: DropdownPlacement = 'bottom-start'
  /** Whether the dropdown is open (controlled). */
  open?: boolean
  /** Menu alignment. */
  align: DropdownAlign = 'start'
  /** Menu width (`trigger`, `auto`, a number of pixels or a CSS length). */
  width?: 'trigger' | 'auto' | number | string
  /** Extra classes for the menu. */
  className?: string
  /** Inline style object for the menu (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` (the menu's becomes `${testId}-menu`). */
  testId?: string

  /** Fires with the selected item's value (React's `onSelect`). */
  @Output() readonly select = new EventEmitter<string>()
  /** Fires whenever the open state changes (React's `onOpenChange`). */
  @Output() readonly openChange = new EventEmitter<boolean>()

  /** The trigger projection capture point (removed once the trigger is adopted). */
  @ViewChild('triggerCapture') triggerCapture?: ElementRef<HTMLSpanElement>
  /** The menu's view anchor. */
  @ViewChild('menuAnchor', { read: ViewContainerRef }) menuAnchor?: ViewContainerRef
  /** The menu markup template. */
  @ViewChild('menuTpl') menuTpl?: TemplateRef<unknown>

  /** The generated menu id (the normalizer renumbers it). */
  readonly menuId = nextInstanceId()
  /** The uncontrolled open state. */
  private readonly internalOpen = signal(false)
  /** The roving-tabindex active item index (-1 when closed). */
  private readonly activeIndex = signal(-1)
  /** The menu position (React's state, initial `{0,0}`). */
  private readonly position = signal<Position>({ top: 0, left: 0 })

  /** Router state; a route change closes the menu (React's effect). */
  readonly router = useRouter()

  private readonly el = inject(ElementRef)
  private readonly renderer = inject(Renderer2)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly host: HTMLElement = this.el.nativeElement
  /** The adopted trigger element (cloned element or fallback wrapper). */
  private triggerEl: HTMLElement | null = null
  /** The menu's embedded view, while open. */
  private menuView?: EmbeddedViewRef<unknown>
  /** The portal menu element, while open. */
  private menuEl: HTMLDivElement | null = null
  private lastOpen = false
  private lastPlacement: DropdownPlacement = 'bottom-start'
  private lastAlign: DropdownAlign = 'start'
  private menuWidth: number | string | undefined
  private removedListeners: (() => void)[] = []
  private lastRoute = ''
  /** Which end a keyboard open focuses (`first`, or `last` for ArrowUp). */
  private pendingOpenFocus: 'first' | 'last' = 'first'
  /** The menu item element `focusActive` put DOM focus on last. */
  private focusedItemEl: HTMLElement | null = null
  /** The `items` the previous view check rendered; focus is restored only after they change. */
  private checkedItems: DropdownItem<string>[] | null = null
  /** Whether `focusedItemEl` held DOM focus before this check updated the view. */
  private itemHadFocus = false
  /** Closes the menu when the route (path or query) changes, and on mount, as React's effect does. */
  private readonly routeEffect = effect(() => {
    const location = this.router.location()
    const key = `${location.pathname}${location.search}`
    if (key === this.lastRoute) return
    this.lastRoute = key
    // React's effect runs on mount too, so the first run always closes.
    this.setOpen(false)
  })

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Narrows a node-valued prop to a TemplateRef.
   *
   * @param value - The prop value.
   * @returns The template, or null.
   */
  asTemplate(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The key React renders a menu item with (`key={item.separator ?
   * \`separator-${index}\` : item.value}`); `@for` tracks it, so a node
   * survives an items update whose key is unchanged and moves on a reorder.
   *
   * @param item - The menu item.
   * @param index - The item's index in `items`.
   * @returns The React key.
   */
  keyForItem(item: DropdownItem<string>, index: number): string {
    return item.separator ? `separator-${index}` : item.value
  }

  /**
   * A plain-string node value's text (React renders strings as text).
   *
   * @param value - The prop value.
   * @returns The text, or empty.
   */
  iconText(value: unknown): string {
    return typeof value === 'string' ? value : ''
  }

  /**
   * Whether the menu is open (controlled prop or uncontrolled state).
   * @returns The open state.
   */
  isOpen(): boolean {
    return this.open !== undefined ? this.open : this.internalOpen()
  }

  /**
   * React's `setOpen`: writes internal state when uncontrolled and always
   * emits `openChange`.
   *
   * @param open - The new open state.
   */
  setOpen(open: boolean): void {
    if (this.open === undefined) this.internalOpen.set(open)
    this.openChange.emit(open)
    // The open state drives menu creation in ngDoCheck, so this view must be
    // re-checked even when no template binding reads the state directly.
    this.cdr.markForCheck()
  }

  /**
   * The menu class list.
   * @returns The class string.
   */
  menuClasses(): string {
    return this.cm().cn(this.cm().dropdownContent, this.className)
  }

  /**
   * The menu `data-testid`.
   * @returns `${testId}-menu`, or null.
   */
  menuTestId(): string | null {
    return this.testId ? `${this.testId}-menu` : null
  }

  /**
   * The menu's inline style, React's object serialized.
   * @returns The style attribute text, or null.
   */
  menuStyleText(): string | null {
    return styleText({
      ...this.style,
      position: 'absolute',
      top: this.position().top,
      left: this.position().left,
      width: this.menuWidth,
      zIndex: 50,
    })
  }

  /**
   * The item class list.
   * @param item - The item.
   * @returns The class string.
   */
  itemClasses(item: DropdownItem<string>): string {
    return this.cm().cn(this.cm().dropdownItem, item.disabled && this.cm().dropdownItemDisabled)
  }

  /**
   * The roving tabindex for an item.
   * @param index - The item's index.
   * @returns -1 for a disabled item, 0 for the active one, else -1.
   */
  itemTabIndex(index: number): number {
    const item = this.items[index]
    if (item?.disabled) return -1
    return index === this.activeIndex() ? 0 : -1
  }

  /**
   * Item click: selects and closes unless disabled (React's `handleClick`).
   *
   * @param item - The clicked item.
   */
  handleItemClick(item: DropdownItem<string>): void {
    if (item.disabled) return
    this.select.emit(item.value)
    this.closeAndRefocusTrigger()
  }

  /**
   * Item Enter/Space selects like a click (React's `handleKeyDown`).
   *
   * @param event - The key event.
   * @param item - The item.
   */
  handleItemKeyDown(event: KeyboardEvent, item: DropdownItem<string>): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    this.handleItemClick(item)
  }

  /**
   * The menu keydown handler: Arrow/Home/End roving, Tab closes.
   *
   * @param event - The key event.
   */
  handleMenuKeyDown(event: KeyboardEvent): void {
    const focusable = this.focusableIndexes()
    if (focusable.length === 0) return
    const currentPos = focusable.indexOf(this.activeIndex())
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.activeIndex.set(focusable[(currentPos + 1 + focusable.length) % focusable.length])
        this.focusActive()
        break
      case 'ArrowUp':
        event.preventDefault()
        this.activeIndex.set(focusable[(currentPos - 1 + focusable.length) % focusable.length])
        this.focusActive()
        break
      case 'Home':
        event.preventDefault()
        this.activeIndex.set(focusable[0])
        this.focusActive()
        break
      case 'End':
        event.preventDefault()
        this.activeIndex.set(focusable[focusable.length - 1])
        this.focusActive()
        break
      case 'Tab':
        this.handleClose()
        break
      default:
        break
    }
  }

  /**
   * The trigger click: toggles the menu (React's `handleTriggerClick`).
   */
  handleTriggerClick(): void {
    if (!this.isOpen()) this.pendingOpenFocus = 'first'
    this.setOpen(!this.isOpen())
  }

  /**
   * The trigger keydown: Enter/Space/ArrowDown open to the first item,
   * ArrowUp to the last (React's `handleTriggerKeyDown`).
   *
   * @param event - The key event.
   */
  handleTriggerKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        this.pendingOpenFocus = 'first'
        this.setOpen(true)
        break
      case 'ArrowDown':
        event.preventDefault()
        this.pendingOpenFocus = 'first'
        this.setOpen(true)
        break
      case 'ArrowUp':
        event.preventDefault()
        this.pendingOpenFocus = 'last'
        this.setOpen(true)
        break
      default:
        break
    }
  }

  /**
   * Closes the menu without moving focus (React's `handleClose`).
   */
  handleClose(): void {
    this.setOpen(false)
  }

  /**
   * Closes the menu and returns focus to the trigger (React's
   * `closeAndRefocusTrigger`).
   */
  closeAndRefocusTrigger(): void {
    this.handleClose()
    this.triggerEl?.focus()
  }

  /**
   * Adopts the projected trigger at view init (React's cloneElement), then
   * reconciles the menu once.
   */
  ngAfterViewInit(): void {
    this.adoptTrigger()
    this.syncMenu()
  }

  /**
   * Reconciles menu creation/destruction and the trigger's ARIA state on
   * every pass (props steps and state changes both land here).
   */
  ngDoCheck(): void {
    // Before the view (and its `@for`) updates: note whether the item still has focus.
    this.itemHadFocus = this.focusedItemEl !== null && document.activeElement === this.focusedItemEl
    this.syncMenu()
  }

  /** Removes the document listeners and the menu view (unmount). */
  ngOnDestroy(): void {
    this.removeListeners()
    this.destroyMenu()
  }

  /**
   * Moves the projected trigger out of its capture span and makes it the real
   * control: a single element is adopted bare; anything else is wrapped in
   * React's fallback `role="button"` container.
   */
  private adoptTrigger(): void {
    const capture = this.triggerCapture?.nativeElement
    if (!capture) return
    const host = this.host
    // React's root is a fragment, so the trigger is a sibling of the host
    // element's content, not a child of a wrapper: the adopted trigger is
    // placed beside the (display: contents) host so the rendered tree and the
    // focus path match React's exactly.
    const parent = host.parentElement
    // Insert BEFORE the host so the trigger is the parent's first element
    // child — the host is display: contents and unwrapped in snapshots, so
    // the rendered tree and the focus path match React's fragment exactly.
    const anchor = host
    const children = Array.from(capture.childNodes)
    const elements = children.filter((n) => n.nodeType === 1)
    const hasText = children.some((n) => n.nodeType === 3 && (n.textContent ?? '').trim())
    const single = elements.length === 1 && !hasText
    if (!parent) return
    if (single) {
      const target = elements[0] as HTMLElement
      for (const node of children) parent.insertBefore(node, anchor)
      this.triggerEl = target
      this.listen(target)
    } else {
      const wrapper = this.renderer.createElement('div') as HTMLDivElement
      this.renderer.setAttribute(wrapper, 'role', 'button')
      this.renderer.setAttribute(wrapper, 'tabindex', '0')
      this.renderer.setAttribute(wrapper, 'aria-haspopup', 'menu')
      this.renderer.addClass(wrapper, this.cm().dropdownTrigger)
      this.triggerEl = wrapper
      parent.insertBefore(wrapper, anchor)
      for (const node of children) wrapper.appendChild(node)
      this.listen(wrapper)
    }
    this.renderer.removeChild(host, capture)
    this.syncTrigger()
  }

  /**
   * Attaches the click and keydown listeners to the adopted trigger.
   *
   * @param target - The trigger element.
   */
  private listen(target: HTMLElement): void {
    this.removedListeners.push(
      this.renderer.listen(target, 'click', () => this.handleTriggerClick()),
      this.renderer.listen(target, 'keydown', (event: KeyboardEvent) =>
        this.handleTriggerKeyDown(event),
      ),
    )
  }

  /** The non-separator, non-disabled item indexes (React's `focusableItemIndexes`). */
  private focusableIndexes(): number[] {
    const out: number[] = []
    this.items.forEach((item, index) => {
      if (!item.separator && !item.disabled) out.push(index)
    })
    return out
  }

  /**
   * The menu element's `[role="menuitem"]` elements, in DOM order.
   * @returns The item elements.
   */
  private itemElements(): HTMLElement[] {
    if (!this.menuEl) return []
    return Array.from(this.menuEl.querySelectorAll<HTMLElement>('[role="menuitem"]'))
  }

  /**
   * The DOM element for an item index (separators have none).
   * @param index - The item index in `items`.
   * @returns The element, or null.
   */
  private elementForIndex(index: number): HTMLElement | null {
    let position = 0
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].separator) continue
      if (i === index) return this.itemElements()[position] ?? null
      position += 1
    }
    return null
  }

  /** Moves DOM focus to the roving-tabindex active item (React's focus effect). */
  private focusActive(): void {
    if (!this.isOpen() || this.activeIndex() < 0) return
    const el = this.elementForIndex(this.activeIndex())
    el?.focus()
    this.focusedItemEl = el
  }

  /**
   * After the view (and its `@for` reorder) has updated: React's keyed
   * reconciliation moves the focused menu item's node without detaching it,
   * so its DOM focus survives an items update, while `@for` detaches the
   * views it moves and drops focus to the body. After an items update, while
   * the menu is open, put focus back on the item only if it had focus before
   * the update. Focus the user moved elsewhere stays there, as in React.
   */
  ngAfterViewChecked(): void {
    const itemsChanged = this.items !== this.checkedItems
    this.checkedItems = this.items
    if (!this.isOpen()) {
      this.focusedItemEl = null
      return
    }
    if (!itemsChanged || !this.itemHadFocus || !this.menuEl) return
    const restore = this.focusedItemEl
    if (restore?.isConnected && document.activeElement !== restore) restore.focus()
  }

  /**
   * Reconciles everything React's render + effects derive from state: the
   * trigger ARIA attributes, menu creation/destruction, the active item and
   * the position update.
   */
  private syncMenu(): void {
    const open = this.isOpen()
    if (open) {
      // The menu view can only be created once the view queries resolve
      // (ngAfterViewInit), so creation is keyed on its absence, not on an
      // open-state transition.
      if (!this.menuEl) this.openMenu()
      else if (this.placement !== this.lastPlacement || this.align !== this.lastAlign)
        this.schedulePosition()
      this.updateMenuWidth()
    } else if (this.menuEl) {
      this.destroyMenu()
    }
    this.lastOpen = open
    this.lastPlacement = this.placement
    this.lastAlign = this.align
    this.syncTrigger()
  }

  /** Creates the menu view, moves it into `document.body` and starts the effects. */
  private openMenu(): void {
    const anchor = this.menuAnchor
    const template = this.menuTpl
    if (!this.menuEl && anchor && template) {
      const view = anchor.createEmbeddedView(template)
      this.menuView = view
      const root = view.rootNodes.find((node: Node) => node.nodeType === 1) as
        HTMLDivElement | undefined
      if (root) {
        this.menuEl = root
        document.body.appendChild(root)
      }
      // The view is created in "create" mode; run its first update now so the
      // menu element's attributes (role, tabindex, classes) exist before focus.
      view.detectChanges()
    }
    this.updateMenuWidth()
    // React's open-transition effect: focus the first (or last) item.
    const focusable = this.focusableIndexes()
    if (focusable.length > 0) {
      this.activeIndex.set(
        this.pendingOpenFocus === 'last' ? focusable[focusable.length - 1] : focusable[0],
      )
    }
    this.pendingOpenFocus = 'first'
    this.focusActive()
    this.addListeners()
    this.schedulePosition()
    this.syncTrigger()
  }

  /** Destroys the menu view (moving its DOM back under the host first). */
  private destroyMenu(): void {
    this.removeListeners()
    this.activeIndex.set(-1)
    if (this.menuEl?.parentNode === document.body) this.host.appendChild(this.menuEl)
    this.menuView?.destroy()
    this.menuView = undefined
    this.menuEl = null
  }

  /** React's menu width: the trigger width, a number, or the raw value. */
  private updateMenuWidth(): void {
    this.menuWidth =
      this.width === 'trigger'
        ? this.triggerEl?.offsetWidth
        : typeof this.width === 'number'
          ? this.width
          : (this.width as string | undefined)
  }

  /** Schedules a position measurement on the next animation frame (React's effect). */
  private schedulePosition(): void {
    requestAnimationFrame(() => this.updatePosition())
  }

  /** Measures the trigger and menu and updates the position (React's `updatePosition`). */
  private updatePosition(): void {
    if (!this.triggerEl || !this.menuEl) return
    const triggerRect = this.triggerEl.getBoundingClientRect()
    const menuRect = this.menuEl.getBoundingClientRect()
    this.position.set(calculatePosition(triggerRect, menuRect, this.placement, this.align))
    this.updateMenuWidth()
  }

  /** Adds the outside-mousedown and Escape listeners while open (React's effect). */
  private addListeners(): void {
    this.removeListeners()
    this.removedListeners.push(
      this.renderer.listen('document', 'mousedown', (event: MouseEvent) => {
        const target = event.target as Node | null
        if (!target) return
        if (this.triggerEl?.contains(target)) return
        if (this.menuEl?.contains(target)) return
        this.handleClose()
      }),
      this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape') this.closeAndRefocusTrigger()
      }),
    )
  }

  /** Removes every listener added while open. */
  private removeListeners(): void {
    for (const off of this.removedListeners) off()
    this.removedListeners = []
  }

  /** Applies React's cloned-trigger attributes to the adopted trigger. */
  private syncTrigger(): void {
    const target = this.triggerEl
    if (!target) return
    const open = this.isOpen()
    if (target.getAttribute('role') === 'button' && !target.hasAttribute('data-mol-menu-trigger')) {
      // The fallback wrapper: React's own attributes on the wrapper element.
      this.renderer.setAttribute(target, 'role', 'button')
      this.renderer.setAttribute(target, 'tabindex', '0')
    } else if (!target.hasAttribute('tabindex')) {
      this.renderer.setAttribute(target, 'tabindex', '0')
    }
    this.renderer.setAttribute(target, 'aria-haspopup', 'menu')
    this.renderer.setAttribute(target, 'aria-expanded', open ? 'true' : 'false')
    if (open) this.renderer.setAttribute(target, 'aria-controls', this.menuId)
    else this.renderer.removeAttribute(target, 'aria-controls')
    if (this.testId) this.renderer.setAttribute(target, 'data-testid', this.testId)
    else this.renderer.removeAttribute(target, 'data-testid')
  }
}

/**
 * DropdownLabel component: a group label inside a menu.
 */
@Component({
  selector: 'div[mol-dropdown-label]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content></ng-content>`,
})
export class DropdownLabel {
  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().dropdownLabel, this.className)
  }
}

/**
 * DropdownSeparator component: a dividing rule inside a menu.
 */
@Component({
  selector: 'div[mol-dropdown-separator]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
    role: 'separator',
  },
  template: ``,
})
export class DropdownSeparator {
  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().dropdownSeparator, this.className)
  }
}
