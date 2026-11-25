/**
 * Modal component (React parity): a `document.body` portal dialog.
 *
 * @module
 */

import { isPlatformBrowser } from '@angular/common'
import {
  afterNextRender,
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  EnvironmentInjector,
  EventEmitter,
  inject,
  type OnDestroy,
  Output,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeElement,
  placeElementBefore,
  setElementPresent,
  setHostRoot,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import { OverlayLayer } from '@molecule/app-overlay-dom'
import type { ModalSize, MouseEventHandler, OverlayTarget, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { HasElement } from '../utilities/element.js'
import type { ResolvedIcon } from '../utilities/render-icon.js'
import { MolIconSvg, resolveIcon } from '../utilities/render-icon.js'
import { adoptHostDataMolId } from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'

let modalInstance = 0

/**
 * Modal component.
 *
 * React's root is a FRAGMENT portaled into `document.body` (an overlay
 * `<div>` and a centering wrapper `<div>`), so the host element leaves the
 * page and both elements are moved into the body while open: the rendered
 * tree is React's, with no wrapper at the component's place. Implements the
 * WAI-ARIA APG modal dialog pattern (focus
 * into the dialog on open, trapped Tab, focus restored on close, Escape for
 * the topmost dialog only, reference-counted body scroll lock).
 *
 * Projected content is created with the consumer's view, so a closed modal's body and footer exist
 * while hidden: their components, effects and fetches run. React mounts them only while shown, and
 * again each time they show. Write content with state as `*molLazy` (`MolLazy` from
 * `@molecule/app-angular`): it is created when it shows and destroyed when it hides, as React's is.
 *
 * @example
 * ```html
 * <mol-modal [open]="open" title="Edit profile" (close)="open = false">
 *   <form *molLazy>…</form>
 *   <div slot="footer" *molLazy><button mol-button (click)="save()">Save</button></div>
 * </mol-modal>
 * ```
 */
@Component({
  selector: 'mol-modal',
  standalone: true,
  hostDirectives: [MolPlacement],
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
    'initialFocus',
    'className',
    'style',
    'testId',
    'automationId',
    'dataMolId: data-mol-id',
    'onDoubleClick',
  ],
  outputs: ['close'],
  template: `<div #overlay [class]="cm().dialogOverlay" aria-hidden="true"></div>
    <div
      #wrapper
      [class]="cm().dialogWrapper"
      [style]="wrapperStyle()"
      role="presentation"
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
        [attr.data-mol-id]="molId()"
        (dblclick)="onDoubleClick?.($event)"
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
export class Modal
  implements AfterViewInit, AfterViewChecked, DoCheck, OnDestroy, HasElement<HTMLDivElement>
{
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
  /** The control that takes focus when the dialog opens; the first focusable control without it. */
  initialFocus?: OverlayTarget
  /** Extra classes for the dialog. */
  className?: string
  /** Inline style object for the dialog (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the dialog. */
  testId?: string
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string
  /**
   * A caller's double-click handler on the dialog (React spreads rest onto it).
   *
   * @deprecated Bind `(dblclick)` on the tag: what a caller binds there lands on the dialog.
   */
  onDoubleClick?: MouseEventHandler

  /** Fires when the dialog asks to close (React's `onClose`). */
  @Output() readonly close = new EventEmitter<MouseEvent | undefined>()

  /** The overlay element (moved to `document.body`). */
  @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>
  /** The centering wrapper (moved to `document.body`). */
  @ViewChild('wrapper') wrapper?: ElementRef<HTMLDivElement>
  /** The dialog element. */
  @ViewChild('dialog', { static: true }) dialog?: ElementRef<HTMLDivElement>
  /** The footer wrapper (detached when unused). */
  @ViewChild('footerSlot') footerSlot?: ElementRef<HTMLDivElement>

  /** The per-instance title id (the normalizer renumbers it). */
  readonly titleId = `mol-modal-title-${++modalInstance}`
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID))
  private readonly environmentInjector = inject(EnvironmentInjector)
  private readonly layer = new OverlayLayer((focus) => {
    // DoCheck and view destruction can be in the middle of another component's check.
    // The read phase is a render's last: content a slot stamps once its place is in the page
    // (`*molLazy`, in `mixedReadWrite`) exists by then, so the initial focus can be in it.
    if (!this.environmentInjector.destroyed)
      afterNextRender({ read: focus }, { injector: this.environmentInjector })
  })
  private readonly inner = signal<HTMLDivElement | null>(null)
  /** The element a caller's ref receives: the dialog, or `null` while closed. */
  readonly element = this.inner.asReadonly()

  /** Applies React's `{!!footer && <div className={dialogFooter}>…</div>}`. */
  constructor() {
    usePlacement((hasContent) => this.reconcileFooter(hasContent))
  }

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private lastOpen: boolean | undefined
  private lastFooter = false
  /** The `data-mol-id` a caller bound on the host (React spreads it onto the dialog). */
  private externalMolId: string | undefined

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
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return this.automationId ?? this.dataMolId ?? this.externalMolId
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
   * The wrapper is a presentation layer around the dialog: a click on the
   * wrapper itself (the backdrop) closes when `closeOnOverlayClick` allows it,
   * and a click that bubbled up from inside the dialog stops here, so it never
   * reaches whatever rendered the modal. Escape closes from the keyboard.
   *
   * @param event - The click event.
   */
  handleOverlayClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      event.stopPropagation()
      return
    }
    this.layer.dismissBackdrop()
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
    const dialog = this.dialog?.nativeElement
    if (dialog) {
      adoptHostDataMolId(
        this.host.nativeElement,
        dialog,
        (id) => {
          this.externalMolId = id
        },
        () => this.molId(),
      )
    }
    this.syncOpen()
  }

  /** Reconciles open transitions and option changes after the view exists. */
  ngDoCheck(): void {
    this.syncOpen()
  }

  /**
   * Follows a `data-mol-id` the caller binds on the tag on every pass: React
   * merges it with `automationId` on the dialog. Every other attribute, class,
   * style and listener on the tag reaches the dialog through
   * {@link setHostRoot}.
   */
  ngAfterViewChecked(): void {
    adoptHostDataMolId(
      this.host.nativeElement,
      this.dialog?.nativeElement,
      (id) => {
        this.externalMolId = id
      },
      () => this.molId(),
    )
  }

  /** Releases the layer when its parent destroys the view. */
  ngOnDestroy(): void {
    this.layer.release()
  }

  /**
   * Applies React's `{!!footer && <div className={dialogFooter}>…</div>}`, and
   * takes the host out of the page: everything React renders lives in the
   * `document.body` portal, nothing at the component's place. What the caller
   * binds on the tag lands on the dialog, React's `{...rest}` target.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcileFooter(hasContent: SlotReader): void {
    this.lastFooter = hasContent(this.footerSlot?.nativeElement)
    setElementPresent(this.footerSlot?.nativeElement, this.lastFooter)
    setElementPresent(this.host.nativeElement, false)
    setHostRoot(this.host.nativeElement, this.wrapper ? this.dialog?.nativeElement : null, {
      except: ['data-mol-id'],
    })
  }

  /** Applies a portal transition and updates the open layer’s options. */
  private syncOpen(): void {
    const dialog = this.dialog?.nativeElement
    if (!dialog) return
    const open = !!this.open
    // The unconditional dialog query resolves before embedded views are checked.
    // Register in that order, and place the nodes once the view is initialized.
    if (open && this.browser) this.syncLayer(dialog)
    if (!this.wrapper) return

    if (open !== this.lastOpen) {
      this.lastOpen = open
      if (open) this.attachPortal()
      else {
        this.layer.release()
        this.detachPortal()
      }
    }
  }

  /** Registers the open layer before later overlays can enter the stack. */
  private syncLayer(dialog: HTMLDivElement): void {
    this.layer.sync({
      open: true,
      kind: 'modal',
      surface: { current: dialog },
      dismissKey: this.closeOnEscape,
      dismissBackdrop: this.closeOnOverlayClick,
      focus: { trap: true, initial: this.initialFocus, restore: 'opener' },
      lockScroll: this.preventScroll,
      onDismiss: () => this.requestClose(),
    })
  }

  /** Moves the browser dialog to its own body and keeps the server dialog inline. */
  private attachPortal(): void {
    const overlay = this.overlay?.nativeElement
    const wrapper = this.wrapper?.nativeElement
    if (!overlay || !wrapper) return
    if (this.browser) {
      const { body } = wrapper.ownerDocument
      placeElement(overlay, body)
      placeElement(wrapper, body)
    } else {
      placeElementBefore(overlay, this.host.nativeElement)
      placeElementBefore(wrapper, this.host.nativeElement)
    }
    this.inner.set(this.dialog?.nativeElement ?? null)
  }

  /** Removes the portal nodes while closed. */
  private detachPortal(): void {
    placeElement(this.overlay?.nativeElement, null)
    setElementPresent(this.overlay?.nativeElement, false)
    placeElement(this.wrapper?.nativeElement, null)
    setElementPresent(this.wrapper?.nativeElement, false)
    this.inner.set(null)
  }
}
