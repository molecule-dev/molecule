/**
 * PhotoLightbox component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  type SimpleChanges,
  type TemplateRef,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import type { LightboxPhoto } from './types.js'

/** React's overlay style (`position: fixed`, `z-index: 100`; the scrim is `cm.bgScrim`'s class). */
const ROOT_STYLE =
  'position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center'

/**
 * Whether a node-valued caption is an Angular template (a projected node)
 * rather than plain text. Checked structurally — `TemplateRef` is a type-only
 * import in the emitted metadata, so `instanceof` is not dependable across
 * bundles.
 *
 * @param value - The prop value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * PhotoLightbox component.
 *
 * Fullscreen photo viewer with prev/next arrows, keyboard navigation
 * (← → Esc), close button, and optional captions. The host IS the overlay
 * (`div[mol-photo-lightbox]`), matching React's root exactly: the class and
 * the inline style live on it, it is `role="presentation"` (the
 * click-to-dismiss backdrop screen — clicking the host itself closes the
 * lightbox, clicks on the controls inside do not), and the `role="dialog"`
 * element with `aria-modal` and the accessible label is the `<div>` inside it,
 * as in React's DOM.
 *
 * React renders null while the lightbox is closed or the gallery is empty —
 * Angular's host element always exists, so it is detached from the DOM in that
 * state (the same approach `@molecule/app-announcement-bar-angular` takes) and
 * restored when it opens again. The document keydown listener (← → Esc) is
 * mounted with the component, as React's effect is while open.
 */
@Component({
  selector: 'div[mol-photo-lightbox]',
  standalone: true,
  imports: [Button, NgTemplateOutlet],
  inputs: ['photos', 'open', 'onClose', 'initialIndex', 'onIndexChange'],
  host: {
    role: 'presentation',
    '[class]': 'classes()',
    '[style]': 'rootStyle()',
    '(click)': 'onHostClick($event)',
  },
  template: `@if (isVisible()) {
    <div role="dialog" aria-modal="true" [attr.aria-label]="ariaLabel()">
      <button
        mol-button
        [variant]="'ghost'"
        [size]="'sm'"
        (click)="close($event)"
        [attr.aria-label]="closeLabel()"
        [className]="arrowClasses()"
      >
        ✕
      </button>
      @if (total() > 1) {
        <button
          mol-button
          [variant]="'ghost'"
          [size]="'sm'"
          (click)="setIdx(index() - 1)"
          [attr.aria-label]="previousLabel()"
          [className]="arrowClasses()"
          [style]="previousStyle"
        >
          ‹
        </button>
      }
      <figure
        [style.margin]="'0'"
        [style.max-width]="'90vw'"
        [style.max-height]="'90vh'"
        [style.text-align]="'center'"
      >
        <img
          [attr.src]="photo().src"
          [attr.alt]="imageAlt()"
          [style.max-width]="'100%'"
          [style.max-height]="'80vh'"
          [style.object-fit]="'contain'"
        />
        @if (captionTemplate(); as caption) {
          <figcaption
            [class]="textOnToneClasses()"
            [style.padding]="'12px'"
            [style.font-size]="'14px'"
          >
            <ng-container [ngTemplateOutlet]="caption" />
          </figcaption>
        } @else if (captionText(); as text) {
          <figcaption
            [class]="textOnToneClasses()"
            [style.padding]="'12px'"
            [style.font-size]="'14px'"
          >
            {{ text }}
          </figcaption>
        }
      </figure>
      @if (total() > 1) {
        <button
          mol-button
          [variant]="'ghost'"
          [size]="'sm'"
          (click)="setIdx(index() + 1)"
          [attr.aria-label]="nextLabel()"
          [className]="arrowClasses()"
          [style]="nextStyle"
        >
          ›
        </button>
      }
      <div
        [class]="textOnToneClasses()"
        [style.position]="'absolute'"
        [style.bottom]="'16px'"
        [style.left]="'0'"
        [style.right]="'0'"
        [style.text-align]="'center'"
        [style.font-size]="'12px'"
      >
        {{ index() + 1 }} / {{ total() }}
      </div>
    </div>
  }`,
})
export class PhotoLightbox implements OnChanges, OnInit, AfterViewInit, DoCheck, OnDestroy {
  /** Photos to browse. */
  photos: LightboxPhoto[] = []
  /** Whether the lightbox is open. */
  open = false
  /** Called when the user closes (close button, backdrop, Escape). */
  onClose?: (event?: MouseEvent) => void
  /** Initial active index (defaults to `0` at read time). */
  initialIndex?: number
  /** Called whenever the active index changes (arrows, keyboard). */
  onIndexChange?: (index: number) => void

  /** React's previous-arrow style. */
  readonly previousStyle: Record<string, unknown> = {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
  }
  /** React's next-arrow style. */
  readonly nextStyle: Record<string, unknown> = {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
  }

  /** The active photo index (React's `useState(initialIndex)`). */
  private readonly index = signal(0)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the labels on a locale switch.
   */
  private readonly i18n = useTranslation()
  /** The host element (the root `<div>`), for the null-render detach. */
  private readonly el = inject(ElementRef)
  /** Where the detached host lives, for the restore. */
  private detachedParent: Node | null = null
  /** The node the detached host is restored before. */
  private detachedAnchor: Node | null = null

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root class list (React's `cm.cn(cm.position('fixed'), cm.bgScrim)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('fixed'), this.cm().bgScrim)
  }

  /**
   * The caption/counter text class (React's `cm.textOnTone` — readable text on
   * the scrim). Routed through `cn` like every other binding: `cn` of a single
   * token is the token, and ClassMap mocks that model string properties as
   * zero-arg resolvers stay bound to whatever a bond provides.
   * @returns The class string.
   */
  textOnToneClasses(): string {
    return this.cm().cn(this.cm().textOnTone)
  }

  /**
   * The arrows' shared class list (React's `cm.position('absolute')`).
   * @returns The class string.
   */
  arrowClasses(): string {
    return this.cm().position('absolute')
  }

  /**
   * The root inline style (React's overlay style object).
   * @returns The `style` attribute text.
   */
  rootStyle(): string {
    return ROOT_STYLE
  }

  /**
   * The number of photos.
   * @returns The gallery length.
   */
  total(): number {
    return this.photos.length
  }

  /**
   * The active photo.
   * @returns The current {@link LightboxPhoto}.
   */
  photo(): LightboxPhoto {
    return this.photos[this.index()]
  }

  /**
   * Whether the lightbox renders (React's `open && total > 0`).
   * @returns True while open with at least one photo.
   */
  isVisible(): boolean {
    return this.open && this.photos.length > 0
  }

  /**
   * The dialog's accessible label (React's `photo.alt ?? "Image N of total"`).
   * @returns The label, or null while nothing renders.
   */
  ariaLabel(): string | null {
    if (!this.isVisible()) return null
    return this.photo().alt ?? `Image ${this.index() + 1} of ${this.photos.length}`
  }

  /**
   * The image's alternative text (React's `photo.alt ?? "Image N"`).
   * @returns The alt text.
   */
  imageAlt(): string {
    return this.photo().alt ?? `Image ${this.index() + 1}`
  }

  /**
   * The close button's accessible label.
   * @returns The translated label.
   */
  closeLabel(): string {
    return this.i18n.t('lightbox.close', {}, { defaultValue: 'Close' })
  }

  /**
   * The previous button's accessible label.
   * @returns The translated label.
   */
  previousLabel(): string {
    return this.i18n.t('lightbox.previous', {}, { defaultValue: 'Previous' })
  }

  /**
   * The next button's accessible label.
   * @returns The translated label.
   */
  nextLabel(): string {
    return this.i18n.t('lightbox.next', {}, { defaultValue: 'Next' })
  }

  /**
   * The active photo's caption as a template, when the caller passed a node.
   * @returns The caption template, or null.
   */
  captionTemplate(): TemplateRef<unknown> | null {
    const caption = this.photo()?.caption
    return isTemplate(caption) ? caption : null
  }

  /**
   * The active photo's caption as text (React renders any truthy string node).
   * @returns The text, or null when absent or a template.
   */
  captionText(): string | null {
    const caption = this.photo()?.caption
    if (caption === null || caption === undefined || isTemplate(caption)) return null
    const text = String(caption)
    return text ? text : null
  }

  /**
   * Clamps an index into the gallery (React's modulo wrap) and reports it.
   *
   * @param next - The requested index.
   */
  setIdx(next: number): void {
    const total = this.photos.length
    const clamped = (next + total) % total
    this.index.set(clamped)
    this.onIndexChange?.(clamped)
  }

  /**
   * Calls `onClose` with the click event, as React's `Button onClick` does.
   *
   * @param event - The native click event.
   */
  close(event: MouseEvent): void {
    this.onClose?.(event)
  }

  /**
   * React's backdrop click: close only when the overlay itself was clicked.
   *
   * @param event - The native click event.
   */
  onHostClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.onClose?.()
  }

  /**
   * React's `useEffect(() => { if (open) setIndex(initialIndex) }, [open, initialIndex])`:
   * reset the active index when `open` or `initialIndex` changes.
   *
   * @param changes - Angular's changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] || changes['initialIndex']) && this.open) {
      this.index.set(this.initialIndex ?? 0)
    }
  }

  /** React's keydown handler: ← → navigate, Escape closes. */
  private readonly onKey = (event: KeyboardEvent): void => {
    if (!this.open) return
    if (event.key === 'Escape') this.onClose?.()
    else if (event.key === 'ArrowLeft') this.setIdx(this.index() - 1)
    else if (event.key === 'ArrowRight') this.setIdx(this.index() + 1)
  }

  /** Attaches the document keydown listener (React's effect while open). */
  ngOnInit(): void {
    document.addEventListener('keydown', this.onKey)
  }

  /** Removes the host element from the DOM while React would render null. */
  syncHostVisibility(): void {
    const host = this.el.nativeElement as HTMLElement
    if (!this.isVisible()) {
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

  /**
   * Applies the mount-time visibility decision once the host is in the
   * document (a closed lightbox renders nothing, as React's `null` does).
   */
  ngAfterViewInit(): void {
    this.syncHostVisibility()
  }

  /** Re-reconciles host visibility after input writes. */
  ngDoCheck(): void {
    this.syncHostVisibility()
  }

  /** Detaches the keydown listener and restores the host before removal. */
  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.onKey)
    const host = this.el.nativeElement as HTMLElement
    // The host must be inside its parent for Angular's own removal to succeed.
    if (!host.isConnected && this.detachedParent) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }
}
