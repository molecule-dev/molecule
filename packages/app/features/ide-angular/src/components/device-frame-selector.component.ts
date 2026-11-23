/**
 * Device-frame selector for the preview panel — a themed dropdown menu.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `DeviceFrameSelector` (see
 * that file for the design notes): the same inputs (React prop names), the same
 * DOM for the same input, the same callbacks. The trigger shows the CURRENT
 * frame's icon plus a chevron-down affordance; opening it lists every device
 * frame with its bonded icon + i18n label, then — after a divider — the
 * preview's Rotate (`menuitemcheckbox` toggle, shown only where relevant) and
 * Open-in-new-tab actions sharing the frame rows' roving focus.
 *
 * The host IS React's root `<div>` (`div[mol-device-frame-selector]`), so the
 * wrapper's position/display style lives on the host. Inputs are one plain
 * field per React prop, named in the decorator's `inputs` array; the roving
 * focus is applied after each render once the menu exists (React's `useEffect`
 * on `[open, activeIndex]`), and the trigger takes focus back
 * synchronously in the closing handler while the menu is still mounted — the
 * same DOM state React's batched `setOpen(false)` produces.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express, serialized through `styleText` the way React writes
 * numbers (`8` → `8px`). All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  afterEveryRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  type OnDestroy,
  ViewChild,
} from '@angular/core'

import { useTranslation, type UseTranslationResult } from '@molecule/app-angular'
import type { IconName } from '@molecule/app-icons'
import type { DeviceFrameSelectorProps } from '@molecule/app-ide-panel-logic'
import { DEVICE_FRAMES, DEVICE_META } from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText, Tooltip } from '@molecule/app-ui-angular'

import { Icon } from './icon.component.js'

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

/**
 * The inline-style texts that never change, serialized once with `styleText`
 * (the conformance normalizer sorts declarations, so key order is free).
 * `border: medium` is the serialized form JSdom gives React's inline
 * `border: 'none'` shorthand, so the markup matches React's exactly.
 */
const STYLES = {
  /** The trigger's two glyphs: the chevron sits a pixel after the device icon. */
  chevron: 'margin-left: 1px',
  /** The menu: below the trigger, right-aligned, a lifted surface. */
  menu:
    'position: absolute; top: 100%; right: 0px; margin-top: 4px; min-width: 168px; padding: 4px; ' +
    'border-radius: 8px; display: flex; flex-direction: column; gap: 2px; z-index: 30',
  /** The divider between the frames and the action rows. */
  separator:
    'height: 1px; margin: 4px 0px; background: var(--mol-color-border, rgba(128,128,128,0.2))',
  /** The label span of a menu row. */
  rowLabel: styleText({ flex: '1 1 0%' }),
} as const

/**
 * A dropdown that selects the preview device frame and hosts the Rotate +
 * Open-in-new-tab actions. React renders it under the same name.
 */
@Component({
  selector: 'div[mol-device-frame-selector]',
  standalone: true,
  imports: [Icon, Tooltip],
  inputs: [
    'current',
    'onChange',
    'className',
    'canRotate',
    'rotated',
    'onRotate',
    'onOpenExternal',
  ],
  host: {
    style: 'position: relative; display: inline-flex',
  },
  // prettier-ignore
  template: `<mol-tooltip placement="bottom">
      <button #trigger type="button" data-mol-id="preview-device-cycle" aria-haspopup="menu" [attr.aria-expanded]="open" [attr.aria-label]="selectLabel() + ': ' + currentLabel()" (click)="onTriggerClick()" (keydown)="onTriggerKeyDown($event)" [class]="triggerClass()">
        <svg mol-icon [name]="meta[current].icon" [size]="16" aria-hidden="true"></svg>
        <svg mol-icon [name]="'chevron-down'" [size]="12" aria-hidden="true" [attr.style]="s.chevron"></svg>
      </button>
      <ng-container ngProjectAs="[slot=content]">{{ selectLabel() }}</ng-container>
    </mol-tooltip>
    @if (open) {<div #menu role="menu" [attr.aria-label]="selectLabel()" [attr.tabindex]="-1" (keydown)="onMenuKeyDown($event)" [class]="menuClass()" [attr.style]="s.menu">
      @for (frame of frames; track frame; let index = $index) {<button type="button" role="menuitemradio" [attr.aria-checked]="frame === current" [attr.tabindex]="index === activeIndex ? 0 : -1" [attr.data-mol-id]="optionId(frame)" (click)="select(frame)" (mouseenter)="activeIndex = index" [class]="cm.touchTargetCompact" [style.display]="'flex'" [style.align-items]="'center'" [style.gap]="'8px'" [style.width]="'100%'" [style.padding]="'6px 8px'" [style.text-align]="'left'" [style.border]="'none'" [style.border-radius]="'6px'" [style.color]="'inherit'" [style.cursor]="'pointer'" [style.font]="'inherit'" [style.background]="index === activeIndex ? 'var(--mol-color-surface-secondary, transparent)' : 'transparent'"><svg mol-icon [name]="meta[frame].icon" [size]="16" aria-hidden="true"></svg><span [attr.style]="s.rowLabel">{{ frameLabel(frame) }}</span>@if (frame === current) {<svg mol-icon [name]="'check'" [size]="14" aria-hidden="true"></svg>}</button>}
      @if (actionItems().length > 0) {<div role="separator" aria-hidden="true" data-mol-id="preview-device-menu-separator" [attr.style]="s.separator"></div>}
      @for (item of actionItems(); track item.id; let actionIdx = $index) {<button type="button" [attr.role]="item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'" [attr.aria-checked]="item.checked" [attr.tabindex]="frames.length + actionIdx === activeIndex ? 0 : -1" [attr.data-mol-id]="item.id" (click)="runAction(item.run)" (mouseenter)="activeIndex = frames.length + actionIdx" [class]="cm.touchTargetCompact" [style.display]="'flex'" [style.align-items]="'center'" [style.gap]="'8px'" [style.width]="'100%'" [style.padding]="'6px 8px'" [style.text-align]="'left'" [style.border]="'none'" [style.border-radius]="'6px'" [style.color]="'inherit'" [style.cursor]="'pointer'" [style.font]="'inherit'" [style.background]="frames.length + actionIdx === activeIndex ? 'var(--mol-color-surface-secondary, transparent)' : 'transparent'"><svg mol-icon [name]="item.icon" [size]="16" aria-hidden="true"></svg><span [attr.style]="s.rowLabel">{{ item.label }}</span>@if (item.checked) {<svg mol-icon [name]="'check'" [size]="14" aria-hidden="true"></svg>}</button>}
    </div>}`,
})
export class DeviceFrameSelector implements DeviceFrameSelectorProps, OnDestroy {
  /** The frame the preview currently shows. */
  current: Frame = 'none'

  /** Called with the chosen frame. */
  onChange: (device: Frame) => void = () => {}

  /** Class name for the trigger button (React's `className`). */
  className?: string

  /** Whether the current frame can be rotated — gates the Rotate item ("when/where relevant"). */
  canRotate?: boolean

  /** Whether the preview is currently rotated to landscape — renders Rotate as a CHECKED toggle. */
  rotated?: boolean

  /** Rotate the current fixed-frame device portrait ⇄ landscape. Omit to hide the Rotate item. */
  onRotate?: () => void

  /** Open the preview URL in a new browser tab. Omit to hide the Open-in-new-tab item. */
  onOpenExternal?: () => void

  /** The frame list, in display order (the template's row loop). */
  protected readonly frames = DEVICE_FRAMES

  /** Per-frame display metadata (icon + label key/default). */
  protected readonly meta = DEVICE_META

  /** The static style texts. */
  protected readonly s = STYLES

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t: UseTranslationResult['t'] = this.i18n.t

  /** Whether the menu is open. */
  protected open = false

  /** Index of the menu item with roving focus while the menu is open. */
  protected activeIndex = 0

  /** The trigger button, for the focus restore on close. */
  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>

  /** The open menu, for the roving-focus query. */
  @ViewChild('menu') private menu?: ElementRef<HTMLDivElement>

  /** The roving index last given DOM focus (so a change-detection pass does not refocus). */
  private focusedIndex = -1

  /** This component's host element (React's root `<div>`). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Marks the view dirty from the document-level outside-click listener. */
  private readonly cdr = inject(ChangeDetectorRef)

  /** The document outside-pointer-down listener while the menu is open. */
  private outsideListener: ((event: MouseEvent) => void) | null = null

  /**
   * Applies the roving focus after every render — React's `useEffect` on `[open, activeIndex]`.
   * An after-render hook, not a view-checked one: focusing a row blurs the trigger, whose
   * Tooltip hides on that focusout, and a state change made while the view is still being checked
   * is never rendered (the tooltip stayed open over the menu the keyboard had just opened).
   */
  constructor() {
    afterEveryRender({ write: () => this.applyRovingFocus() })
  }

  /**
   * Focuses the active row once per open/move. Guarded by the last focused index so an unrelated
   * render does not steal focus.
   */
  private applyRovingFocus(): void {
    if (!this.open) {
      this.focusedIndex = -1
      return
    }
    if (this.focusedIndex === this.activeIndex) return
    this.focusedIndex = this.activeIndex
    const rows = this.menu?.nativeElement.querySelectorAll<HTMLButtonElement>(
      '[role="menuitemradio"], [role="menuitem"], [role="menuitemcheckbox"]',
    )
    rows?.[this.activeIndex]?.focus()
  }

  /** Drops the outside-click listener when the card goes away. */
  ngOnDestroy(): void {
    this.removeOutsideListener()
  }

  /** Adds React's outside-pointer-down close (its `useEffect` on `open`). */
  private addOutsideListener(): void {
    if (this.outsideListener) return
    this.outsideListener = (event: MouseEvent): void => {
      if (!this.open) return
      const root = this.host.nativeElement
      if (root.contains(event.target as Node)) return
      this.open = false
      this.removeOutsideListener()
      this.cdr.markForCheck()
    }
    document.addEventListener('mousedown', this.outsideListener)
  }

  /** Removes the outside-pointer-down listener. */
  private removeOutsideListener(): void {
    if (!this.outsideListener) return
    document.removeEventListener('mousedown', this.outsideListener)
    this.outsideListener = null
  }

  /**
   * The in-dropdown action rows shown below the device frames (P4-04), after a
   * divider: Rotate (only "where relevant" — a rotatable frame AND a wired
   * handler) and Open in new tab (whenever a handler is wired).
   * @returns The rows, in display order.
   */
  protected actionItems(): ActionItem[] {
    return [
      ...(this.canRotate && this.onRotate
        ? [
            {
              id: 'preview-device-rotate',
              icon: 'rotate' as const,
              label: this.t('ide.device.rotate', undefined, { defaultValue: 'Rotate' }),
              run: this.onRotate,
              // Rotate is a TOGGLE (portrait ⇄ landscape) — show its state with
              // a check, so it reads as a toggle, not a one-shot action.
              checked: !!this.rotated,
            },
          ]
        : []),
      ...(this.onOpenExternal
        ? [
            {
              id: 'preview-open-external',
              icon: 'link-external' as const,
              label: this.t('ide.preview.openNewTab', undefined, {
                defaultValue: 'Open in new tab',
              }),
              run: this.onOpenExternal,
            },
          ]
        : []),
    ]
  }

  /**
   * The total roving-focus targets: device frames + the conditional action rows.
   * @returns The row count.
   */
  protected itemCount(): number {
    return this.frames.length + this.actionItems().length
  }

  /**
   * The current frame's index in the frame list.
   * @returns The index (0 when the frame is unknown, React's `Math.max`).
   */
  protected currentIndex(): number {
    return Math.max(0, this.frames.indexOf(this.current))
  }

  /**
   * The trigger's tooltip text (also the menu's accessible name).
   * @returns The translated label.
   */
  protected selectLabel(): string {
    return this.t('ide.device.select', undefined, { defaultValue: 'Device frame' })
  }

  /**
   * The current frame's translated label.
   * @returns The translated label.
   */
  protected currentLabel(): string {
    return this.frameLabel(this.current)
  }

  /**
   * The translated label for one frame's menu row.
   * @param frame - The frame.
   * @returns The translated label.
   */
  protected frameLabel(frame: Frame): string {
    return this.t(this.meta[frame].labelKey, undefined, { defaultValue: this.meta[frame].label })
  }

  /**
   * A frame row's `data-mol-id`.
   * @param frame - The frame.
   * @returns The attribute value.
   */
  protected optionId(frame: Frame): string {
    return `preview-device-option-${frame}`
  }

  /**
   * The trigger's class string.
   * @returns The resolved classes.
   */
  protected triggerClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'ghost', size: 'xs' }),
      this.cm.touchTarget,
      this.className,
    )
  }

  /**
   * The menu's class string.
   * @returns The resolved classes.
   */
  protected menuClass(): string {
    return this.cm.cn(
      this.cm.surface,
      this.cm.borderAll,
      this.cm.shadowLifted,
      this.cm.textSize('xs'),
    )
  }

  /**
   * Closes the menu, returning focus to the trigger unless the close should
   * leave focus where it is (React's `closeMenu(refocus)`). The trigger takes
   * focus while the menu is still mounted — React's batched `setOpen(false)`
   * leaves the menu in the DOM at that moment too.
   * @param refocus - Whether the trigger takes focus back (default `true`).
   */
  protected closeMenu(refocus = true): void {
    this.open = false
    this.removeOutsideListener()
    if (refocus) this.trigger?.nativeElement.focus()
  }

  /**
   * Opens the menu with roving focus on the given row.
   * @param index - The row the focus starts on.
   */
  protected openMenu(index: number): void {
    this.activeIndex = index
    this.open = true
    this.addOutsideListener()
  }

  /**
   * Selects a frame: fires `onChange` and closes the menu.
   * @param frame - The chosen frame.
   */
  protected select(frame: Frame): void {
    this.onChange(frame)
    this.closeMenu()
  }

  /**
   * Runs an action row (Rotate / Open in new tab) then closes the menu.
   * @param run - The action's callback.
   */
  protected runAction(run: () => void): void {
    run()
    this.closeMenu()
  }

  /** The trigger's click: toggle the menu (close without refocusing when open). */
  protected onTriggerClick(): void {
    if (this.open) this.closeMenu(false)
    else this.openMenu(this.currentIndex())
  }

  /**
   * The trigger's keyboard handling: ArrowDown / Enter / Space open at the
   * current frame, ArrowUp opens at the last row.
   * @param event - The key press.
   */
  protected onTriggerKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.openMenu(this.currentIndex())
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      this.openMenu(this.itemCount() - 1)
    }
  }

  /**
   * The menu's keyboard handling: the arrows move the roving focus with
   * wrapping, Home/End jump to the ends, Escape closes (refocusing the
   * trigger) and Tab lets focus leave while the menu collapses.
   * @param event - The key press.
   */
  protected onMenuKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.activeIndex = (this.activeIndex + 1) % this.itemCount()
        break
      case 'ArrowUp':
        event.preventDefault()
        this.activeIndex = (this.activeIndex - 1 + this.itemCount()) % this.itemCount()
        break
      case 'Home':
        event.preventDefault()
        this.activeIndex = 0
        break
      case 'End':
        event.preventDefault()
        this.activeIndex = this.itemCount() - 1
        break
      case 'Escape':
        event.preventDefault()
        this.closeMenu()
        break
      case 'Tab':
        // Let focus leave naturally, but collapse the menu.
        this.open = false
        this.removeOutsideListener()
        break
      default:
        break
    }
  }
}
