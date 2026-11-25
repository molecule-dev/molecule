/**
 * Toast family (React parity): Toast, ToastContainer, ToastProvider and the
 * `useToast` hook.
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
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeContent,
  placeContentBefore,
  placeElement,
  setElementPresent,
  type SlotReader,
  useHostPresence,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import { I18nError } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import { focusStaysWithin } from '@molecule/app-overlay-dom'
import type { ColorVariant, ToastProps, UIClassMap } from '@molecule/app-ui'
import { getClassMap, ToastCountdown } from '@molecule/app-ui'

import { createDomContext } from '../utilities/dom-context.js'
import { type HasElement, hostElement } from '../utilities/element.js'
import type { ResolvedIcon } from '../utilities/render-icon.js'
import { MolIconSvg, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'
import { MolTemplateOutlet } from './template-outlet.directive.js'

/** Toast status → class-map variant. */
const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  primary: 'default',
  secondary: 'default',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
}

/** Toast status variant → default glyph name. */
const STATUS_ICON: Record<string, IconName> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}

/** Module-global toast id counter (React's `toastCounter`). */
let toastCounter = 0

/** The toast context value (React's `ToastContextValue`). */
export interface ToastContextValue {
  /** The current toasts, each with its id. */
  toasts: (ToastProps & { id: string })[]
  /**
   * Adds a toast.
   * @param toast - The toast to add.
   * @returns Its id (the caller's when given).
   */
  addToast: (toast: Omit<ToastProps, 'onDismiss'>) => string
  /**
   * Removes a toast by id.
   * @param id - The toast's id.
   */
  removeToast: (id: string) => void
}

/** The toast positions React's `ToastProps` accepts. */
type ToastPosition = ToastProps['position']

/**
 * Toast component.
 *
 * The host is the toast `<div>` (`div[mol-toast]`), exactly React's root. The
 * auto-dismiss countdown pauses on hover AND focus (WCAG 2.2.1) and resumes
 * with the remaining time; the announced role follows `status`
 * (`warning`/`error` assertive, everything else polite).
 */
@Component({
  selector: 'div[mol-toast]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [MolIconSvg, MolTemplateOutlet],
  inputs: [
    'title',
    'description',
    'status',
    'duration',
    'dismissible',
    'closeLabel',
    'className',
    'style',
    'testId',
    'position',
    'automationId',
    'dataMolId: data-mol-id',
    'id',
    'roleOverride: role',
    'live: aria-live',
  ],
  outputs: ['dismiss'],
  host: {
    // `title` is this component's heading, which React renders as text; Angular would also keep a
    // static `title="…"` on the host, where the browser shows it as a tooltip.
    '[attr.title]': 'null',
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
    '[attr.id]': 'id',
    '[attr.role]': 'role()',
    '[attr.aria-live]': 'live',
    '[attr.data-state]': 'visible() ? "open" : null',
    '(mouseenter)': 'setHovered(true)',
    '(mouseleave)': 'setHovered(false)',
    '(focusin)': 'setFocused(true)',
    '(focusout)': 'leaveFocus($event)',
  },
  template: `@if (statusIcon(); as icon) {
      <span [class]="cm().toastIconWrapper"><svg mol-icon [data]="icon" /></span>
    }
    <div [class]="cm().toastContentWrapper">
      @if (title) {
        <div [class]="cm().toastTitle">{{ title }}</div>
      }
      <div #descriptionSlot [class]="cm().toastDescription">
        @if (descriptionText(); as descriptionTextValue) {
          {{ descriptionTextValue }}
        }
        <ng-container [molTemplateOutlet]="descriptionTemplate()"></ng-container
        ><span #childrenSlot><ng-content></ng-content></span>
      </div>
    </div>
    @if (dismissible) {
      <button
        type="button"
        [class]="cm().toastClose"
        [attr.aria-label]="closeText()"
        (click)="handleDismiss()"
      >
        <svg mol-icon [data]="closeIcon()" />
      </button>
    }`,
})
export class Toast implements AfterViewInit, DoCheck, OnDestroy, HasElement<HTMLDivElement> {
  /** The toast title. */
  title?: string
  /** The toast description (a string or a node value rendered as a template). */
  description?: unknown
  /** The toast status. */
  status: ColorVariant = 'info'
  /** Auto-dismiss delay in ms (`0` keeps it until dismissed). */
  duration = 5000
  /** Whether the close button renders. */
  dismissible = true
  /** The close button's accessible label. */
  closeLabel?: string
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** Accepted for prop parity; positioning is the container's job. */
  position?: ToastPosition
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string
  /** The toast's DOM `id` (React spreads the toast record, id included, onto `<Toast>`). */
  id?: string
  /** Overrides the status-derived role. */
  roleOverride?: ToastProps['role']
  /** Overrides the live-region priority, including `off`. */
  live?: ToastProps['aria-live']

  /** Fires when the toast dismisses itself or its close button is pressed. */
  @Output() readonly dismiss = new EventEmitter<void>()

  /** The description wrapper (always in the template; detached when empty). */
  @ViewChild('descriptionSlot') descriptionSlot?: ElementRef<HTMLDivElement>
  /** The children capture point. */
  @ViewChild('childrenSlot') childrenSlot?: ElementRef<HTMLSpanElement>

  /** Whether the toast is still rendered (React's `isVisible`). */
  readonly visible = signal(true)

  private readonly el = inject(ElementRef)
  private readonly hostRef: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.hostRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly host: HTMLElement = this.el.nativeElement
  private readonly countdown = new ToastCountdown(() => {
    this.visible.set(false)
    this.dismiss.emit()
  })
  private lastDuration: number
  private hasChildren = false

  /** Prepares the countdown state (the timer starts at view init). */
  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
    // Leaves no element in the page while the toast is hidden (React renders null).
    useHostPresence(() => this.visible())
    this.lastDuration = this.duration
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The mapped class-map variant.
   * @returns The variant.
   */
  variant(): 'default' | 'success' | 'warning' | 'error' | 'info' {
    return STATUS_VARIANT[this.status] || 'default'
  }

  /**
   * The toast class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().toast({ variant: this.variant() }), this.className)
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return this.automationId ?? this.dataMolId ?? this.host.getAttribute('data-mol-id') ?? undefined
  }

  /**
   * The announced role: assertive for warnings/errors, polite otherwise.
   * @returns The role attribute value.
   */
  role(): string {
    return (
      this.roleOverride ??
      (this.variant() === 'warning' || this.variant() === 'error' ? 'alert' : 'status')
    )
  }

  /**
   * The status glyph, when the variant has one.
   * @returns The resolved icon, or null.
   */
  statusIcon(): ResolvedIcon | null {
    const name = STATUS_ICON[this.variant()]
    return name ? resolveIcon(name, this.cm().iconMd) : null
  }

  /**
   * The close button's X glyph.
   * @returns The resolved icon.
   */
  closeIcon(): ResolvedIcon {
    return resolveIcon('x-mark', this.cm().iconSm)
  }

  /**
   * The string description, when the description is a string.
   * @returns The text, or null.
   */
  descriptionText(): string | null {
    return typeof this.description === 'string' ? this.description : null
  }

  /**
   * The description as a template, when it is a node value.
   * @returns The template, or null.
   */
  descriptionTemplate(): TemplateRef<unknown> | null {
    return this.description instanceof TemplateRef ? this.description : null
  }

  /**
   * The close button's accessible label.
   * @returns The label text.
   */
  closeText(): string {
    return this.closeLabel ?? this.i18n.t('ui.toast.close', undefined, { defaultValue: 'Close' })
  }

  /** Dismisses the toast and calls the callback (React's `handleDismiss`). */
  handleDismiss(): void {
    this.countdown.dismiss()
  }

  /** Tracks the pointer's presence on the notification. */
  setHovered(hovered: boolean): void {
    this.countdown.setPaused('hover', hovered)
  }

  /** Tracks focus anywhere inside the notification. */
  setFocused(focused: boolean): void {
    this.countdown.setPaused('focus', focused)
  }

  /** Keeps the countdown paused when focus moves to another toast control. */
  leaveFocus(event: FocusEvent): void {
    if (!focusStaysWithin(event)) this.setFocused(false)
  }

  /**
   * Detects the first view and the `duration` input changes, and starts the
   * countdown (React's mount effect, with `[duration]` deps).
   */
  ngAfterViewInit(): void {
    this.countdown.start(this.duration)
  }

  /**
   * Restarts the countdown when the `duration` input changes (React's
   * `[duration]` effect).
   */
  ngDoCheck(): void {
    if (this.duration !== this.lastDuration) {
      this.lastDuration = this.duration
      this.countdown.start(this.duration)
    }
  }

  /** Stops the countdown (React's unmount cleanup). */
  ngOnDestroy(): void {
    this.countdown.stop()
  }

  /**
   * Reads the children slot and moves the projected children into the
   * description wrapper (React renders them there) unless the description
   * prop wins.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    this.hasChildren = hasContent(this.childrenSlot?.nativeElement)
    this.adoptChildren()
  }

  /**
   * Moves the projected children into the description wrapper (React renders
   * them there) unless the description prop wins.
   */
  private adoptChildren(): void {
    const span = this.childrenSlot?.nativeElement
    if (!span) return
    const wrapper = this.descriptionSlot?.nativeElement
    const descWins = this.descriptionText() !== null || this.descriptionTemplate() !== null
    setElementPresent(span, false)
    if (wrapper && !descWins && this.hasChildren) placeContent(span, wrapper)
    else placeContent(span, null)
    this.syncDescription()
  }

  /** Applies React's `{!!(description || children) && <div>…</div>}`. */
  private syncDescription(): void {
    const wrapper = this.descriptionSlot?.nativeElement
    if (!wrapper) return
    const hasDescription = this.descriptionText() !== null || this.descriptionTemplate() !== null
    setElementPresent(wrapper, hasDescription || this.hasChildren)
  }
}

/**
 * Toast container: positions toasts on screen via a body portal.
 *
 * React's root is a portal: the container `<div>` is moved into
 * `document.body` and the host element leaves the page, so nothing is left at
 * the component's place.
 */
@Component({
  selector: 'mol-toast-container',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['position', 'className'],
  template: `<div #container [class]="classes()"><ng-content></ng-content></div>`,
})
export class ToastContainer implements HasElement<HTMLDivElement> {
  /** The container position (default `bottom-right`). */
  position: ToastPosition = 'bottom-right'
  /** Extra classes. */
  className?: string

  /** The container element (moved to `document.body`). */
  private container?: ElementRef<HTMLDivElement>
  /** The container view query; also feeds the caller's ref element. */
  @ViewChild('container')
  set containerQuery(ref: ElementRef<HTMLDivElement> | undefined) {
    this.container = ref
    this.inner.set(ref?.nativeElement ?? null)
  }

  private readonly inner = signal<HTMLDivElement | null>(null)
  /** The element a caller's ref receives: the positioned container `<div>`. */
  readonly element = this.inner.asReadonly()

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Renders the container in `document.body` (React's portal) and takes the host out of the page. */
  constructor() {
    usePlacement(() => {
      if (typeof document !== 'undefined')
        placeElement(this.container?.nativeElement, document.body)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The container class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().toastContainer({ position: this.position }), this.className)
  }
}

/**
 * ToastProvider: manages global toast state and renders children plus a
 * positioned toast container (React's context provider + portal).
 *
 * The context value is registered on a DOM element (React context flows
 * through the rendered tree, which Angular DI cannot reach for projected
 * content); `useToast()` reads it through the DOM ancestors. React's provider
 * renders its children and the container's portal, no element of its own, so
 * the children render in front of the host and the host leaves the page; the
 * context is registered on the parent element, the one whose child list the
 * children now belong to.
 */
@Component({
  selector: 'mol-toast-provider',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Toast],
  inputs: ['position'],
  template: `<span #childrenCapture><ng-content></ng-content></span>
    <div #container [class]="containerClasses()">
      @for (toast of toasts(); track toast.id) {
        <div
          mol-toast
          [title]="toast.title"
          [description]="toast.description"
          [status]="toast.status ?? 'info'"
          [duration]="toast.duration ?? 5000"
          [dismissible]="toast.dismissible ?? true"
          [closeLabel]="toast.closeLabel"
          [className]="toast.className"
          [style]="toast.style"
          [testId]="toast.testId"
          [automationId]="toast.automationId"
          [id]="toast.id"
          [role]="toast.role"
          [aria-live]="toast['aria-live']"
          (dismiss)="removeToast(toast.id)"
        ></div>
      }
    </div>`,
})
export class ToastProvider implements OnDestroy {
  /** The default position for toasts (default `bottom-right`). */
  position: ToastPosition = 'bottom-right'

  /** The children capture point (removed once children are adopted). */
  @ViewChild('childrenCapture') childrenCapture?: ElementRef<HTMLSpanElement>
  /** The toast container (moved to `document.body`). */
  @ViewChild('container') container?: ElementRef<HTMLDivElement>

  /** The current toasts. */
  readonly toasts = signal<(ToastProps & { id: string })[]>([])

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  /** The value consumers read; its closures keep the live toast state. */
  private readonly value = new ToastContextImplementation(this)

  /**
   * Renders the children in front of the host (which leaves the page),
   * registers the context where they render, and portals the container.
   */
  constructor() {
    ToastDomContext.provide(this.host.nativeElement, this.value)
    usePlacement(() => {
      const capture = this.childrenCapture?.nativeElement
      const host = this.host.nativeElement
      if (capture) {
        placeContentBefore(capture, host)
        setElementPresent(capture, false)
      }
      setElementPresent(host, false)
      if (typeof document !== 'undefined')
        placeElement(this.container?.nativeElement, document.body)
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The container class list.
   * @returns The class string.
   */
  containerClasses(): string {
    return this.cm().toastContainer({ position: this.position })
  }

  /**
   * Adds a toast and returns its handle (React's `addToast`). A caller's `id`
   * is the handle and the toast element's id; otherwise one is generated.
   * @param toast - The toast to add.
   * @returns The id.
   */
  addToast(toast: Omit<ToastProps, 'onDismiss'>): string {
    const id = toast.id ?? `toast-${++toastCounter}`
    this.toasts.update((prev) => [...prev, { ...toast, id }])
    return id
  }

  /**
   * Removes a toast by id (React's `removeToast`).
   * @param id - The toast's id.
   */
  removeToast(id: string): void {
    this.toasts.update((prev) => prev.filter((toast) => toast.id !== id))
  }

  /** Removes the context registration (unmount). */
  ngOnDestroy(): void {
    ToastDomContext.remove(this.host.nativeElement)
  }
}

/** The toast context a `ToastProvider` registers. */
class ToastContextImplementation implements ToastContextValue {
  /**
   * Creates the context for a provider.
   *
   * @param provider - The owning provider.
   */
  constructor(private readonly provider: ToastProvider) {}

  /** The current toasts. */
  get toasts(): (ToastProps & { id: string })[] {
    return this.provider.toasts()
  }

  /**
   * Adds a toast.
   * @param toast - The toast to add.
   * @returns Its id (the caller's when given).
   */
  addToast(toast: Omit<ToastProps, 'onDismiss'>): string {
    return this.provider.addToast(toast)
  }

  /**
   * Removes a toast by id.
   * @param id - The toast's id.
   */
  removeToast(id: string): void {
    this.provider.removeToast(id)
  }
}

/**
 * Accesses the toast context for adding and removing toasts.
 *
 * Must be called in an injection context (a component field initializer or
 * constructor).
 *
 * @returns The toast context value.
 * @throws {Error} When there is no enclosing `ToastProvider` (React throws too).
 */
export function useToast(): ToastContextValue {
  const el = inject(ElementRef, { optional: true }) as ElementRef<HTMLElement> | null
  const resolve = (): ToastContextValue => {
    const found = ToastDomContext.find(el?.nativeElement ?? null)
    if (!found) {
      // Thrown outside rendering (a hook used outside its provider), so the
      // English fallback travels with the error instead of the static `t`.
      throw new I18nError(
        'react.error.useToastOutsideProvider',
        undefined,
        'useToast must be used within a ToastProvider',
      )
    }
    return found
  }
  // Resolved at CALL time (a probe resolves the context in its constructor,
  // before Angular has inserted its host into the DOM).
  return {
    get toasts() {
      return resolve().toasts
    },
    addToast: (toast) => resolve().addToast(toast),
    removeToast: (id) => resolve().removeToast(id),
  }
}

/** The context a provider registers and its consumers find. */
const ToastDomContext = createDomContext<ToastContextValue>('ToastDomContext')
