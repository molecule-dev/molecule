/**
 * Modal component (React parity): a `document.body` portal dialog.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  type OnDestroy,
  Output,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { ModalSize, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { createScrollLock, getFocusableElements } from '../utilities/focus.js'
import type { ResolvedIcon } from '../utilities/render-icon.js'
import { MolIconSvg, resolveIcon } from '../utilities/render-icon.js'
import { moveRestAttributes } from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'

/** Module-level open-modal stack (Escape/Tab act only for the topmost). */
const openModalStack: number[] = []

/** Pushes a modal onto the stack (it becomes the topmost). */
const pushModalStack = (id: number): void => {
  if (!openModalStack.includes(id)) openModalStack.push(id)
}

/** Removes a modal from the stack. */
const popModalStack = (id: number): void => {
  const index = openModalStack.indexOf(id)
  if (index !== -1) openModalStack.splice(index, 1)
}

/** Whether the given modal is currently the topmost of the stack. */
const isTopOfModalStack = (id: number): boolean =>
  openModalStack.length > 0 && openModalStack[openModalStack.length - 1] === id

let modalInstance = 0

/**
 * Modal component.
 *
 * React's root is a FRAGMENT portaled into `document.body` (an overlay
 * `<div>` and a centering wrapper `<div>`), so the host is unwrapped
 * (`data-parity-unwrap`, `display: contents`) and both elements are moved
 * into the body. Implements the WAI-ARIA APG modal dialog pattern (focus
 * into the dialog on open, trapped Tab, focus restored on close, Escape for
 * the topmost dialog only, reference-counted body scroll lock).
 */
@Component({
  selector: 'mol-modal',
  standalone: true,
  imports: [MolIconSvg],
  inputs: [
    'open',
    'title',
    'size',
    'showCloseButton',
    'closeOnOverlayClick',
    'closeOnEscape',
    'footer',
    'centered',
    'closeLabel',
    'preventScroll',
    'className',
    'style',
    'testId',
  ],
  outputs: ['close'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<div #overlay [class]="cm().dialogOverlay" aria-hidden="true"></div>
    <div
      #wrapper
      [class]="cm().dialogWrapper"
      [style]="wrapperStyle()"
      (click)="handleOverlayClick($event)"
    >
      <div
        #dialog
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="title ? titleId : null"
        tabindex="-1"
        [class]="dialogClasses()"
        [style]="dialogStyle()"
        [attr.data-testid]="testId"
        (click)="stopPropagation($event)"
      >
        @if (title) {
          <div [class]="cm().dialogHeader">
            <h2 [id]="titleId" [class]="cm().dialogTitle">{{ title }}</h2>
            @if (showCloseButton) {
              <button
                type="button"
                (click)="requestCloseFromButton($event)"
                [class]="cm().dialogClose"
                data-mol-id="modal-close"
                [attr.aria-label]="closeText()"
              >
                <svg mol-icon [data]="closeIcon()" />
              </button>
            }
          </div>
        } @else {
          @if (showCloseButton) {
            <button
              type="button"
              (click)="requestCloseFromButton($event)"
              [class]="cm().dialogCloseFloating"
              data-mol-id="modal-close"
              [attr.aria-label]="closeText()"
            >
              <svg mol-icon [data]="closeIcon()" />
            </button>
          }
        }
        <div [class]="cm().dialogBody"><ng-content></ng-content></div>
        <div #footerSlot [class]="cm().dialogFooter">
          <ng-content select="[slot=footer]"></ng-content>
        </div>
      </div>
    </div>`,
})
export class Modal implements AfterViewInit, DoCheck, OnDestroy {
  /** Whether the dialog is open. */
  open = false
  /** The dialog title. */
  title?: string
  /** Dialog width preset. */
  size: ModalSize = 'md'
  /** Whether the header/close button renders. */
  showCloseButton = true
  /** Whether clicking the overlay closes the dialog. */
  closeOnOverlayClick = true
  /** Whether Escape closes the dialog. */
  closeOnEscape = true
  /** Footer content (node-valued prop). */
  footer?: unknown
  /** Whether the dialog is vertically centered. */
  centered = true
  /** The close button's accessible label. */
  closeLabel?: string
  /** Whether body scroll is locked while open. */
  preventScroll = true
  /** Extra classes for the dialog. */
  className?: string
  /** Inline style object for the dialog (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the dialog. */
  testId?: string

  /** Fires when the dialog asks to close (React's `onClose`). */
  @Output() readonly close = new EventEmitter<MouseEvent | undefined>()

  /** The overlay element (moved to `document.body`). */
  @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>
  /** The centering wrapper (moved to `document.body`). */
  @ViewChild('wrapper') wrapper?: ElementRef<HTMLDivElement>
  /** The dialog element. */
  @ViewChild('dialog') dialog?: ElementRef<HTMLDivElement>
  /** The footer wrapper (detached when unused). */
  @ViewChild('footerSlot') footerSlot?: ElementRef<HTMLDivElement>

  /** The per-instance title id (the normalizer renumbers it). */
  readonly titleId = `mol-modal-title-${++modalInstance}`
  /** The instance's stack id. */
  private readonly stackId = modalInstance

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly sync = createScrollLock()
  private lastOpen = false
  private lastFooter = false
  private footerParent: HTMLElement | null = null
  private previouslyFocused: HTMLElement | null = null
  private listeners: (() => void)[] = []
  private locked = false
  private moved = false

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The dialog class list.
   * @returns The class string.
   */
  dialogClasses(): string {
    return this.cm().cn(this.cm().modal({ size: this.size }), this.className)
  }

  /**
   * Serializes the dialog's inline style.
   * @returns The style attribute text.
   */
  dialogStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * The wrapper's inline style (top-anchored when not centered).
   * @returns The style attribute text.
   */
  wrapperStyle(): string | null {
    return styleText(this.centered ? undefined : { alignItems: 'flex-start' })
  }

  /**
   * The close button's accessible label.
   * @returns The label text.
   */
  closeText(): string {
    return this.closeLabel ?? this.i18n.t('ui.modal.close', undefined, { defaultValue: 'Close' })
  }

  /**
   * The close button's X glyph.
   * @returns The resolved icon.
   */
  closeIcon(): ResolvedIcon {
    return resolveIcon('x-mark', this.cm().iconMd)
  }

  /**
   * Stops a click inside the dialog from reaching the overlay handler.
   *
   * @param event - The click event.
   */
  stopPropagation(event: MouseEvent): void {
    event.stopPropagation()
  }

  /**
   * Closes when the click is on the wrapper itself (not bubbled content).
   *
   * @param event - The click event.
   */
  handleOverlayClick(event: MouseEvent): void {
    if (this.closeOnOverlayClick && event.target === event.currentTarget) this.requestClose()
  }

  /** Emits the close request (React's `onClose`). */
  requestClose(): void {
    this.close.emit()
  }

  /**
   * Emits the close request from the close button — React's close button is
   * `onClick={onClose}`, so the click event reaches the callback.
   *
   * @param event - The click event.
   */
  requestCloseFromButton(event: MouseEvent): void {
    this.close.emit(event)
  }

  /**
   * Reads the view queries (they resolve only at view init), moves the portal
   * content into `document.body` and applies the initial open state.
   */
  ngAfterViewInit(): void {
    const overlay = this.overlay?.nativeElement
    const wrapper = this.wrapper?.nativeElement
    const dialog = this.dialog?.nativeElement
    this.footerParent = this.footerSlot?.nativeElement.parentElement ?? null
    if (dialog) moveRestAttributes(this.host.nativeElement, dialog)
    this.lastFooter = this.hasFooter()
    this.syncFooter()
    const open = !!this.open
    if (open) {
      this.previouslyFocused = (document.activeElement as HTMLElement | null) ?? null
      pushModalStack(this.stackId)
      if (overlay && wrapper) this.attachPortal()
      if (dialog) {
        const focusables = getFocusableElements(dialog)
        ;(focusables[0] ?? dialog).focus()
      }
      this.addListeners()
    } else if (overlay && wrapper) {
      // React renders nothing while closed.
      this.detachPortal()
    }
    this.syncScrollLock()
    this.lastOpen = open
  }

  /**
   * Reconciles the open state and the footer on later passes.
   */
  ngDoCheck(): void {
    const open = !!this.open
    if (open !== this.lastOpen) {
      this.lastOpen = open
      this.transition(open)
    }
    this.lastFooter = this.hasFooter()
    this.syncFooter()
    this.syncScrollLock()
  }

  /** Removes listeners, unlocks scroll and restores the portal nodes (unmount). */
  ngOnDestroy(): void {
    this.removeListeners()
    popModalStack(this.stackId)
    if (this.locked) {
      this.sync.unlock()
      this.locked = false
    }
    // The portal nodes must be children of the host again for Angular's own
    // removal to succeed.
    const host = this.host.nativeElement
    if (this.moved) {
      const overlay = this.overlay?.nativeElement
      const wrapper = this.wrapper?.nativeElement
      if (overlay?.parentNode === document.body) host.appendChild(overlay)
      if (wrapper?.parentNode === document.body) host.appendChild(wrapper)
      this.moved = false
    }
  }

  /**
   * Whether the footer slot carries nodes (read each pass so a later props
   * step adding it still renders).
   * @returns True when the footer wrapper should render.
   */
  private hasFooter(): boolean {
    const slot = this.footerSlot?.nativeElement
    if (!slot) return false
    for (const node of Array.from(slot.childNodes)) {
      if (node.nodeType === 1) return true
      if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
    }
    return false
  }

  /** Applies React's `{!!footer && <div className={dialogFooter}>…</div>}`. */
  private syncFooter(): void {
    const slot = this.footerSlot?.nativeElement
    if (!slot) return
    const shouldRender = this.lastFooter
    if (shouldRender && !slot.isConnected) {
      ;(this.footerParent ?? this.dialog?.nativeElement ?? null)?.appendChild(slot)
    } else if (!shouldRender && slot.isConnected) {
      slot.remove()
    }
  }

  /**
   * Applies an open/closed transition (React mounts/unmounts the portal and
   * its effects).
   *
   * @param open - The new open state.
   */
  private transition(open: boolean): void {
    if (open) {
      this.previouslyFocused = (document.activeElement as HTMLElement | null) ?? null
      pushModalStack(this.stackId)
      this.attachPortal()
      const dialog = this.dialog?.nativeElement
      if (dialog) {
        const focusables = getFocusableElements(dialog)
        ;(focusables[0] ?? dialog).focus()
      }
      this.addListeners()
    } else {
      popModalStack(this.stackId)
      this.removeListeners()
      this.detachPortal()
      const toRestore = this.previouslyFocused
      if (toRestore && document.contains(toRestore)) toRestore.focus()
    }
    this.syncScrollLock()
  }

  /** Re-inserts the portal nodes into `document.body` (in React's order). */
  private attachPortal(): void {
    const overlay = this.overlay?.nativeElement
    const wrapper = this.wrapper?.nativeElement
    if (!overlay || !wrapper) return
    document.body.appendChild(overlay)
    document.body.appendChild(wrapper)
    this.moved = true
  }

  /** Removes the portal nodes from the document (React renders null). */
  private detachPortal(): void {
    this.overlay?.nativeElement.remove()
    this.wrapper?.nativeElement.remove()
    this.moved = false
  }

  /** Locks or unlocks body scroll for React's `open && preventScroll`. */
  private syncScrollLock(): void {
    const shouldLock = !!this.open && this.preventScroll
    if (shouldLock && !this.locked) {
      this.sync.lock()
      this.locked = true
    } else if (!shouldLock && this.locked) {
      this.sync.unlock()
      this.locked = false
    }
  }

  /** Adds Escape and the Tab focus trap while open (React's effect). */
  private addListeners(): void {
    this.removeListeners()
    const onKeyDown = (event: KeyboardEvent): void => this.handleKeyDown(event)
    document.addEventListener('keydown', onKeyDown)
    this.listeners.push(() => document.removeEventListener('keydown', onKeyDown))
  }

  /** Removes the document listeners. */
  private removeListeners(): void {
    for (const off of this.listeners) off()
    this.listeners = []
  }

  /**
   * Escape closes the topmost dialog; Tab wraps inside it.
   *
   * @param event - The key event.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.closeOnEscape && isTopOfModalStack(this.stackId)) this.requestClose()
      return
    }
    if (event.key !== 'Tab' || !isTopOfModalStack(this.stackId)) return
    const el = this.dialog?.nativeElement
    if (!el) return
    const focusables = getFocusableElements(el)
    if (focusables.length === 0) {
      event.preventDefault()
      el.focus()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (event.shiftKey) {
      if (active === first || !el.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last || !el.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }
}
