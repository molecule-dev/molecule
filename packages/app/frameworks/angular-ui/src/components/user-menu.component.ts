/**
 * UserMenu component (React parity): an avatar trigger that opens the app's
 * settings panel in a drawer.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  type OnDestroy,
  signal,
  ViewChild,
} from '@angular/core'

import { useRouter, useTranslation } from '@molecule/app-angular'
import type { IconName } from '@molecule/app-icons'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './button.component.js'
import { Icon } from './icon.component.js'
import { Modal } from './modal.component.js'
import { PanelCloseProvider } from './panel-close.component.js'

/**
 * UserMenu component.
 *
 * React's root is a FRAGMENT (the trigger button plus a drawer), so the host
 * is unwrapped (`data-parity-unwrap`, `display: contents`) and the trigger
 * button is adopted beside it — the rendered tree and focus paths match
 * React's (a route change must restore focus to the trigger). The panel
 * content is projected inside the drawer through `PanelCloseProvider`.
 */
@Component({
  selector: 'mol-user-menu',
  standalone: true,
  imports: [Button, Icon, Modal, PanelCloseProvider],
  inputs: [
    'ariaLabelKey',
    'ariaLabelDefault',
    'triggerIcon',
    'triggerIconSize',
    'dataMolId',
    'className',
    'disabled',
    'onClick',
    'side',
  ],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<button
      #trigger
      mol-button
      [variant]="'ghost'"
      [size]="'sm'"
      [className]="triggerClasses()"
      [disabled]="!!disabled"
      (click)="handleTriggerClick($event)"
      [attr.aria-label]="ariaLabel()"
      [attr.data-mol-id]="dataMolId"
    >
      <svg
        mol-icon-root
        [name]="triggerIcon ?? 'user'"
        [size]="triggerIconSize ?? 20"
      ></svg></button
    ><mol-modal
      [open]="isOpen()"
      (close)="isOpen.set(false)"
      [className]="drawerClasses()"
      [attr.aria-label]="panelLabel()"
      ><mol-panel-close-provider [close]="closePanel"
        ><ng-content></ng-content></mol-panel-close-provider
    ></mol-modal>`,
})
export class UserMenu implements AfterViewInit, OnDestroy {
  /** i18n key for the trigger's aria-label (default `userMenu.open`). */
  ariaLabelKey?: string
  /** Fallback aria-label (default `Open user menu`). */
  ariaLabelDefault?: string
  /** Icon name for the trigger (default `user`). */
  triggerIcon?: IconName
  /** Pixel size for the trigger icon (default 20). */
  triggerIconSize?: number
  /** `data-mol-id` for the trigger (default `user-menu`). */
  dataMolId = 'user-menu'
  /** Extra classes composed onto the trigger. */
  className?: string
  /** Whether the trigger is disabled. */
  disabled?: boolean
  /** Overrides the trigger click (called instead of opening the panel). */
  onClick?: () => void
  /** Which side the panel opens from (default `right`). */
  side: 'left' | 'right' = 'right'

  /** Whether the drawer is open. */
  readonly isOpen = signal(false)
  /** Router state: a route change closes the drawer (React's effect). */
  readonly router = useRouter()

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /** The trigger button (adopted beside the host). */
  @ViewChild('trigger', { read: ElementRef }) trigger?: ElementRef<HTMLButtonElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  private adopted = false
  private readonly routeEffect = effect(() => {
    const location = this.router.location()
    void `${location.pathname}${location.search}`
    // React's effect runs on mount too; closing an already-closed drawer is a no-op.
    this.isOpen.set(false)
  })

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The trigger's accessible label.
   * @returns The label text.
   */
  ariaLabel(): string {
    return this.i18n.t(
      this.ariaLabelKey ?? 'userMenu.open',
      {},
      {
        defaultValue: this.ariaLabelDefault ?? 'Open user menu',
      },
    )
  }

  /**
   * The drawer panel's accessible label.
   * @returns The label text.
   */
  panelLabel(): string {
    return this.i18n.t('userMenu.panelLabel', {}, { defaultValue: 'Account menu' })
  }

  /**
   * The trigger's class list (a 40x40 minimum target plus the caller's classes).
   * @returns The class string.
   */
  triggerClasses(): string {
    return this.cm().cn(this.cm().minH(10), this.cm().minW(10), this.className)
  }

  /**
   * The drawer's class list (side-aware).
   * @returns The class string.
   */
  drawerClasses(): string {
    return this.side === 'left'
      ? this.cm().cn(this.cm().drawer, this.cm().drawerLeft)
      : this.cm().drawer
  }

  /** Closes the drawer (the panel-close context's callback). */
  closePanel = (): void => {
    this.isOpen.set(false)
  }

  /**
   * Opens the drawer unless a custom click handler intercepts (React passes
   * the handler straight to the button, so it receives the click event).
   *
   * @param event - The click event.
   */
  handleTriggerClick(event: MouseEvent): void {
    if (this.onClick) (this.onClick as (e: MouseEvent) => void)(event)
    else this.isOpen.set(true)
  }

  /** Adopts the trigger beside the host (React's fragment root). */
  ngAfterViewInit(): void {
    const trigger = this.trigger?.nativeElement
    const host = this.host.nativeElement
    if (trigger && host.parentNode) {
      host.parentNode.insertBefore(trigger, host)
      this.adopted = true
    }
  }

  /** Restores the adopted trigger (unmount). */
  ngOnDestroy(): void {
    if (this.adopted) this.host.nativeElement.appendChild(this.trigger?.nativeElement as Node)
  }
}
