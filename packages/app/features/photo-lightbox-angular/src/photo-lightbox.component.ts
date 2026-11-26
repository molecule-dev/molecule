/**
 * PhotoLightbox component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  effect,
  ElementRef,
  inject,
  type OnChanges,
  signal,
  type SimpleChanges,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-angular'

import type { LightboxPhoto } from './types.js'

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
 * (← → Esc), close button, and optional captions. The kit owns the
 * modal's focus, close controls and backdrop.
 */
@Component({
  selector: 'div[mol-photo-lightbox]',
  standalone: true,
  imports: [Button, Modal, NgTemplateOutlet],
  inputs: ['photos', 'open', 'onClose', 'initialIndex', 'onIndexChange'],
  hostDirectives: [MolPlacement],
  template: `@if (isVisible()) {
    <mol-modal
      [open]="true"
      [size]="'full'"
      [attr.aria-label]="ariaLabel()"
      [closeLabel]="closeLabel()"
      (close)="close($event)"
    >
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
        [style.margin]="'0 auto'"
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
            [class]="captionClasses()"
            [style.padding]="'12px'"
            [style.font-size]="'14px'"
          >
            <ng-container [ngTemplateOutlet]="caption" />
          </figcaption>
        } @else if (captionText(); as text) {
          <figcaption
            [class]="captionClasses()"
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
        [class]="captionClasses()"
        [style.position]="'absolute'"
        [style.bottom]="'16px'"
        [style.left]="'0'"
        [style.right]="'0'"
        [style.text-align]="'center'"
        [style.font-size]="'12px'"
      >
        {{ index() + 1 }} / {{ total() }}
      </div>
    </mol-modal>
  }`,
})
export class PhotoLightbox implements OnChanges {
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

  private readonly modal = signal<Modal | undefined>(undefined)

  /** Tracks when the kit dialog is created or removed. */
  @ViewChild(Modal)
  private set dialogComponent(modal: Modal | undefined) {
    this.modal.set(modal)
  }

  constructor() {
    const host: ElementRef<HTMLElement> = inject(ElementRef)
    usePlacement(() => {
      const element = host.nativeElement
      placeContentBefore(element, element)
      setElementPresent(element, false)
    })
    effect((onCleanup) => {
      const dialog = this.modal()?.element()
      if (!dialog) return
      dialog.addEventListener('keydown', this.navigate)
      onCleanup(() => dialog.removeEventListener('keydown', this.navigate))
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
   * The caption/counter text class from the dialog surface. Routed through `cn` like every other binding: `cn` of a single
   * token is the token, and ClassMap mocks that model string properties as
   * zero-arg resolvers stay bound to whatever a bond provides.
   * @returns The class string.
   */
  captionClasses(): string {
    return this.cm().cn(this.cm().textMuted)
  }

  /**
   * The arrows' shared class list (React's `cm.position('absolute')`).
   * @returns The class string.
   */
  arrowClasses(): string {
    return this.cm().position('absolute')
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
    return (
      this.photo().alt ??
      this.i18n.t(
        'lightbox.imageOfTotal',
        { index: this.index() + 1, total: this.total() },
        { defaultValue: 'Image {{index}} of {{total}}' },
      )
    )
  }

  /**
   * The image's alternative text (React's `photo.alt ?? "Image N"`).
   * @returns The alt text.
   */
  imageAlt(): string {
    return (
      this.photo().alt ??
      this.i18n.t(
        'lightbox.image',
        { index: this.index() + 1 },
        { defaultValue: 'Image {{index}}' },
      )
    )
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
   * Forwards the kit's close request. The close button supplies its click.
   * @param event - The close button's click, when it was pressed.
   */
  close(event?: MouseEvent): void {
    if (event) this.onClose?.(event)
    else this.onClose?.()
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

  /** Navigates while the key event comes from this lightbox. */
  private readonly navigate = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowLeft') this.setIdx(this.index() - 1)
    else if (event.key === 'ArrowRight') this.setIdx(this.index() + 1)
  }
}
