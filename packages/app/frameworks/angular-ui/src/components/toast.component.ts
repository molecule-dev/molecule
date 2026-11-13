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
  Renderer2,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { I18nError } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import type { ColorVariant, ToastProps, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { findDomContext, provideDomContext, removeDomContext } from '../utilities/dom-context.js'
import type { ResolvedIcon } from '../utilities/render-icon.js'
import { MolIconSvg, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'
import { hasNodes, SlotWrapper } from './button.component.js'
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
   * @returns Its generated id.
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
  ],
  outputs: ['dismiss'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.role]': 'role()',
    '[attr.data-state]': 'visible() ? "open" : null',
    '(mouseenter)': 'pauseTimer()',
    '(mouseleave)': 'resumeTimer()',
    '(focusin)': 'pauseTimer()',
    '(focusout)': 'resumeTimer()',
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
export class Toast implements AfterViewInit, DoCheck, OnDestroy {
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

  /** Fires when the toast dismisses itself or its close button is pressed. */
  @Output() readonly dismiss = new EventEmitter<void>()

  /** The description wrapper (always in the template; detached when empty). */
  @ViewChild('descriptionSlot') descriptionSlot?: ElementRef<HTMLDivElement>
  /** The children capture point. */
  @ViewChild('childrenSlot') childrenSlot?: ElementRef<HTMLSpanElement>

  /** Whether the toast is still rendered (React's `isVisible`). */
  readonly visible = signal(true)

  private readonly el = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly renderer = inject(Renderer2)
  private readonly host: HTMLElement = this.el.nativeElement
  private readonly sync = new SlotWrapper(this.el, this.renderer)
  private remaining: number
  private startedAt: number | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private lastDuration: number
  private descriptionParent: HTMLElement | null = null
  private childrenParent: HTMLElement | null = null
  private hasChildren = false
  private adoptedChildren: Node[] = []
  private detachedParent: Node | null = null
  private detachedAnchor: Node | null = null

  /** Prepares the countdown state (the timer starts at view init). */
  constructor() {
    this.remaining = this.duration
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
   * The announced role: assertive for warnings/errors, polite otherwise.
   * @returns The role attribute value.
   */
  role(): 'alert' | 'status' {
    return this.variant() === 'warning' || this.variant() === 'error' ? 'alert' : 'status'
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
    this.visible.set(false)
    this.dismiss.emit()
  }

  /** Pauses the countdown, keeping the time left (React's `pauseTimer`). */
  pauseTimer(): void {
    if (this.startedAt === null) return
    const elapsed = Date.now() - this.startedAt
    this.remaining = Math.max(0, this.remaining - elapsed)
    this.clearTimer()
  }

  /** Resumes the countdown with the remaining time (React's `resumeTimer`). */
  resumeTimer(): void {
    if (this.remaining > 0) this.startTimer(this.remaining)
  }

  /**
   * Detects the first view and the `duration` input changes, and starts the
   * countdown (React's mount effect, with `[duration]` deps).
   */
  ngAfterViewInit(): void {
    this.descriptionParent = this.descriptionSlot?.nativeElement.parentElement ?? null
    this.childrenParent = this.childrenSlot?.nativeElement.parentElement ?? null
    this.hasChildren = hasNodes(this.childrenSlot?.nativeElement)
    this.adoptChildren()
    this.restart()
  }

  /**
   * Re-reconciles children visibility on later passes.
   */
  ngDoCheck(): void {
    if (this.duration !== this.lastDuration) {
      this.lastDuration = this.duration
      this.restart()
    }
    this.syncDescription()
    this.syncHostVisibility()
  }

  /** Stops the countdown (React's unmount cleanup). */
  ngOnDestroy(): void {
    this.clearTimer()
    this.adoptedChildren = []
    // The host must be inside its parent for Angular's own removal to succeed.
    if (!this.host.isConnected && this.detachedParent) {
      this.detachedParent.insertBefore(this.host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }

  /** React's effect body: reset the remaining time and start counting. */
  private restart(): void {
    this.remaining = this.duration
    this.startTimer(this.duration)
  }

  /** Clears the running timer (React's `clearTimer`). */
  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    this.startedAt = null
  }

  /**
   * Starts the countdown (React's `startTimer`).
   * @param ms - Milliseconds until dismissal.
   */
  private startTimer(ms: number): void {
    this.clearTimer()
    if (ms <= 0) return
    this.startedAt = Date.now()
    this.timer = setTimeout(() => {
      this.visible.set(false)
      this.dismiss.emit()
    }, ms)
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
    if (wrapper && !descWins && this.hasChildren) {
      this.adoptedChildren = Array.from(span.childNodes)
      for (const node of this.adoptedChildren) wrapper.appendChild(node)
    }
    this.sync.sync(span, false, this.childrenParent ?? undefined)
    this.syncDescription()
  }

  /**
   * Removes the host element from the DOM when React renders null (the toast
   * dismissed itself), and restores it before Angular removes it on destroy.
   */
  private syncHostVisibility(): void {
    const host = this.host
    if (!this.visible()) {
      if (host.isConnected) {
        this.detachedParent = host.parentNode
        this.detachedAnchor = host.nextSibling
        host.parentNode?.removeChild(host)
      }
    } else if (this.detachedParent && !host.isConnected) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }

  /** Applies React's `{!!(description || children) && <div>…</div>}`. */
  private syncDescription(): void {
    const wrapper = this.descriptionSlot?.nativeElement
    if (!wrapper) return
    const hasDescription = this.descriptionText() !== null || this.descriptionTemplate() !== null
    this.sync.sync(wrapper, hasDescription || this.hasChildren, this.descriptionParent ?? undefined)
  }
}

/**
 * Toast container: positions toasts on screen via a body portal.
 *
 * React's root is a portal, so the host is unwrapped
 * (`data-parity-unwrap`, `display: contents`) and the container `<div>` is
 * moved into `document.body`.
 */
@Component({
  selector: 'mol-toast-container',
  standalone: true,
  inputs: ['position', 'className'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<div #container [class]="classes()"><ng-content></ng-content></div>`,
})
export class ToastContainer implements AfterViewInit, OnDestroy {
  /** The container position (default `bottom-right`). */
  position: ToastPosition = 'bottom-right'
  /** Extra classes. */
  className?: string

  /** The container element (moved to `document.body`). */
  @ViewChild('container') container?: ElementRef<HTMLDivElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

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

  /** Moves the container to `document.body` (React's portal). */
  ngAfterViewInit(): void {
    const el = this.container?.nativeElement
    if (el && typeof document !== 'undefined') document.body.appendChild(el)
  }

  /** Moves the container back under the host so Angular can remove it. */
  ngOnDestroy(): void {
    const el = this.container?.nativeElement
    if (el && this.host.nativeElement.parentNode) this.host.nativeElement.appendChild(el)
  }
}

/**
 * ToastProvider: manages global toast state and renders children plus a
 * positioned toast container (React's context provider + portal).
 *
 * The context value is registered on the host element (React context flows
 * through the rendered tree, which Angular DI cannot reach for projected
 * content); `useToast()` reads it through the DOM ancestors.
 */
@Component({
  selector: 'mol-toast-provider',
  standalone: true,
  imports: [Toast],
  inputs: ['position'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
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
          (dismiss)="removeToast(toast.id)"
        ></div>
      }
    </div>`,
})
export class ToastProvider implements AfterViewInit, OnDestroy {
  /** The default position for toasts (default `bottom-right`). */
  position: ToastPosition = 'bottom-right'

  /** The children capture point (removed once children are adopted). */
  @ViewChild('childrenCapture') childrenCapture?: ElementRef<HTMLSpanElement>
  /** The toast container (moved to `document.body`). */
  @ViewChild('container') container?: ElementRef<HTMLDivElement>

  /** The current toasts. */
  readonly toasts = signal<(ToastProps & { id: string })[]>([])

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  private readonly renderer = inject(Renderer2)
  private readonly sync = new SlotWrapper(this.host, this.renderer)
  private adopted: Node[] = []

  /** Registers the toast context on the host (before any projected child resolves it). */
  constructor() {
    provideDomContext(this.host.nativeElement, new ToastContextImplementation(this))
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
   * Adds a toast and returns its generated id (React's `addToast`).
   * @param toast - The toast to add.
   * @returns The id.
   */
  addToast(toast: Omit<ToastProps, 'onDismiss'>): string {
    const id = `toast-${++toastCounter}`
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

  /**
   * Adopts the children bare into the host and moves the container to
   * `document.body` (React's portal).
   */
  ngAfterViewInit(): void {
    const capture = this.childrenCapture?.nativeElement
    const host = this.host.nativeElement
    if (capture) {
      this.adopted = Array.from(capture.childNodes)
      for (const node of this.adopted) host.appendChild(node)
      this.sync.sync(capture, false, host)
    }
    const container = this.container?.nativeElement
    if (container && typeof document !== 'undefined') document.body.appendChild(container)
  }

  /** Removes the context registration and restores the container (unmount). */
  ngOnDestroy(): void {
    removeDomContext(this.host.nativeElement)
    const container = this.container?.nativeElement
    if (container && this.host.nativeElement.parentNode)
      this.host.nativeElement.appendChild(container)
    this.adopted = []
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
   * @returns The generated id.
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
    const found = findDomContext<ToastContextValue>(el?.nativeElement ?? null)
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
