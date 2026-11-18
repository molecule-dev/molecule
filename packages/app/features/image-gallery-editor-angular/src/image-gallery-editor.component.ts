/**
 * ImageGalleryEditor component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type ElementRef,
  EventEmitter,
  signal,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { IconName } from '@molecule/app-icons'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmDialog, Icon, styleText } from '@molecule/app-ui-angular'

import type { ImageGalleryEditorProps } from './types.js'

/**
 * Corner radius shared by the drop zone and thumbnail slots. The ClassMap
 * contract exposes only `roundedFull` (a circle), so a specific radius amount
 * is a documented inline-style exception (molecule Rule 5).
 */
const SLOT_RADIUS = '0.75rem'

/**
 * Whether a node is something a caller can see (an element, or a non-blank
 * text node).
 *
 * @param node - The DOM node.
 * @returns True when it renders anything.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * Whether an element carries renderable content (a projected slot landed, or
 * its text input rendered).
 *
 * @param el - The element.
 * @returns True when its children render anything.
 */
const hasRenderableContent = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).some(hasRenderable)

/**
 * ImageGalleryEditor component.
 *
 * Editable image gallery — a hero drop zone with a side grid of thumbnail
 * slots. Clicking an empty slot or the drop zone opens the native file
 * picker, and image files dropped on the drop zone fill the empty slots in
 * order; clicking a filled slot prompts to remove through the shared
 * `ConfirmDialog` from `@molecule/app-ui-angular`. The host IS React's root
 * `<section>` (`section[mol-image-gallery-editor]`) — same classes, same
 * inline styles. Node props (`header`, `counter`, `dropZoneTitle`,
 * `dropZoneHint`, `statusMessage`) are projected content (`[slot=<name>]`)
 * or plain string inputs.
 *
 * This is the Angular counterpart of `@molecule/app-image-gallery-editor-react`.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * optional regions render optimistically and are withdrawn once the first
 * view shows that nothing was projected into them (React would not render
 * them at all).
 */
@Component({
  selector: 'section[mol-image-gallery-editor]',
  standalone: true,
  imports: [ConfirmDialog, Icon],
  outputs: ['change'],
  inputs: [
    'slots',
    'onPickFiles',
    'maxImages',
    'header',
    'counter',
    'dropZoneTitle',
    'dropZoneHint',
    'confirmRemoveMessage',
    'statusMessage',
    'emptySlotIcon',
  ],
  template: `@if (showHeaderRow) {
      <div #headerRowEl [class]="headerRowClasses()">
        @if (headerTextPresent) {
          {{ header }}
        } @else if (headerProjected()) {
          <ng-content select="[slot=header]" />
        } @else {
          <div #placeholderEl></div>
        }
        @if (showCounter) {
          <span #counterEl [class]="counterClasses()">
            @if (counterTextPresent) {
              {{ counter }}
            }
            <ng-content select="[slot=counter]"
          /></span>
        }
      </div>
    }
    <div [class]="gridClasses()">
      <div
        role="button"
        tabindex="0"
        data-mol-id="image-gallery-editor-dropzone"
        (click)="openPicker()"
        (keydown)="onZoneKeydown($event)"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
        [class]="dropzoneClasses()"
        [style]="dropzoneStyleText()"
      >
        <div [class]="iconCircleClasses()">
          <svg mol-icon-root [name]="'upload'" [size]="28" [className]="cm().textPrimary" />
        </div>
        <p #titleEl [class]="titleClasses()">
          @if (titleTextPresent) {
            {{ dropZoneTitle }}
          } @else if (titleProjected()) {
            <ng-content select="[slot=dropZoneTitle]" />
          } @else {
            {{ titleText() }}
          }
        </p>
        <p #hintEl [class]="hintClasses()">
          @if (hintTextPresent) {
            {{ dropZoneHint }}
          } @else if (hintProjected()) {
            <ng-content select="[slot=dropZoneHint]" />
          } @else {
            {{ hintText() }}
          }
        </p>
      </div>
      <div [class]="slotsGridClasses()" [style]="slotsGridStyleText()">
        @for (slot of slotList(); track $index; let i = $index) {
          <div
            role="button"
            tabindex="0"
            [attr.data-mol-id]="'image-gallery-editor-slot-' + i"
            [attr.aria-label]="slot ? removeImageLabel() : addImageLabel()"
            (click)="handleSlotClick(i)"
            (keydown)="onSlotKeydown($event, i)"
            [class]="slotClasses()"
            [style]="slotStyleText()"
          >
            @if (slot) {
              <img alt="" [attr.src]="slot" [class]="imgClasses()" [style]="imgStyleText()" />
              <div [class]="affordanceClasses()">
                <svg mol-icon-root [name]="'trash'" [size]="20" />
              </div>
            } @else {
              <div [class]="emptySlotClasses()">
                <svg
                  mol-icon-root
                  [name]="emptySlotIcon ?? 'image'"
                  [size]="24"
                  [className]="cm().textMuted"
                />
              </div>
            }
          </div>
        }
      </div>
    </div>
    @if (showStatus) {
      <p #statusEl [class]="statusClasses()" data-mol-id="image-gallery-editor-status">
        @if (statusTextPresent) {
          {{ statusMessage }}
        }
        <ng-content select="[slot=statusMessage]" />
      </p>
    }
    <input
      #fileInput
      type="file"
      accept="image/*"
      style="display: none"
      (change)="onFileChange($event)"
    /><mol-confirm-dialog
      [open]="removeIndex() !== null"
      (close)="closeDialog()"
      (confirm)="confirmRemove()"
      ><ng-container ngProjectAs="[slot=title]">{{ removeTitle() }}</ng-container
      ><ng-container ngProjectAs="[slot=description]">{{
        removeMessage()
      }}</ng-container></mol-confirm-dialog
    >`,
})
export class ImageGalleryEditor implements AfterViewInit {
  /** Ordered slots, `null` for empty. Length determines slot count. */
  slots?: (string | null)[]
  /** Called when the user picks files; defaults to a local object URL. */
  onPickFiles?: ImageGalleryEditorProps['onPickFiles']
  /** The highest slot index a drop may fill (default 24). */
  maxImages?: number
  /** Header heading + subtitle slot — a string input, or `[slot=header]` content. */
  header?: unknown
  /** Photo-counter label — a string input, or `[slot=counter]` content. */
  counter?: unknown
  /** Drop-zone heading — a string input, or `[slot=dropZoneTitle]` content. */
  dropZoneTitle?: unknown
  /** Drop-zone hint — a string input, or `[slot=dropZoneHint]` content. */
  dropZoneHint?: unknown
  /** Remove-confirmation message (overrides `t()`). */
  confirmRemoveMessage?: string
  /** Status line — a string input, or `[slot=statusMessage]` content. */
  statusMessage?: unknown
  /** Glyph rendered in empty slots (defaults to `'image'`). */
  emptySlotIcon?: IconName

  /** Called with the next slots array when a slot is filled or removed. */
  readonly change = new EventEmitter<(string | null)[]>()

  /** The header row (its children tell whether a header was projected). */
  @ViewChild('headerRowEl') private headerRowEl?: ElementRef<HTMLDivElement>
  /** The placeholder div (React's `{header ?? <div />}`). */
  @ViewChild('placeholderEl') private placeholderEl?: ElementRef<HTMLDivElement>
  /** The counter span (projected content lands here; read once). */
  @ViewChild('counterEl') private counterEl?: ElementRef<HTMLSpanElement>
  /** The drop-zone title paragraph (projected content lands here; read once). */
  @ViewChild('titleEl') private titleEl?: ElementRef<HTMLParagraphElement>
  /** The drop-zone hint paragraph (projected content lands here; read once). */
  @ViewChild('hintEl') private hintEl?: ElementRef<HTMLParagraphElement>
  /** The status paragraph (projected content lands here; read once). */
  @ViewChild('statusEl') private statusEl?: ElementRef<HTMLParagraphElement>
  /** The hidden file input (opened by a click or Enter/Space). */
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The slot that opened the picker (React's `uploadingSlot`). */
  private readonly uploadingSlot = signal<number | null>(null)
  /** The slot asking for removal, or null (React's `removeIndex`). */
  readonly removeIndex = signal<number | null>(null)

  /** Whether a `[slot=header]` projection landed (true until proven otherwise). */
  private readonly headerProjected = signal(true)
  /** Whether a `[slot=counter]` projection landed (true until proven otherwise). */
  private readonly counterProjected = signal(true)
  /** Whether a `[slot=dropZoneTitle]` projection landed (true until proven otherwise). */
  private readonly titleProjected = signal(true)
  /** Whether a `[slot=dropZoneHint]` projection landed (true until proven otherwise). */
  private readonly hintProjected = signal(true)
  /** Whether a `[slot=statusMessage]` projection landed (true until proven otherwise). */
  private readonly statusProjected = signal(true)

  /**
   * Reads each optional region's first render, once, at view init — the
   * projected content is in place by then, and it never changes afterwards
   * (a case projects a node prop at mount or it never does). When the region's
   * TEXT input is present at init there is no projection to find (a case
   * passes a node prop as a text input or as projected content, never both —
   * React's `??` / truthiness would render only the prop), so the optimistic
   * `true` is replaced with `false`: a text input that later clears then
   * withdraws the region in the very tick that clears it, the way React's
   * truthiness does. Without a text input, a region whose projection landed
   * nothing renders nothing where React would render the region at all, so
   * the optimistic render is withdrawn. (Plain reads here would re-run on
   * every dirty check and read a region's own first render — its fallback
   * text, its optimistic render — as a projection.)
   */
  ngAfterViewInit(): void {
    const row = this.headerRowEl?.nativeElement
    if (row) {
      if (this.headerTextPresent) {
        this.headerProjected.set(false)
      } else {
        const own = new Set<Node>()
        const placeholder = this.placeholderEl?.nativeElement
        const counter = this.counterEl?.nativeElement
        if (placeholder) own.add(placeholder)
        if (counter) own.add(counter)
        this.headerProjected.set(
          Array.from(row.childNodes).some((node) => !own.has(node) && hasRenderable(node)),
        )
      }
    }
    const counter = this.counterEl?.nativeElement
    if (counter) {
      this.counterProjected.set(this.counterTextPresent ? false : hasRenderableContent(counter))
    }
    const title = this.titleEl?.nativeElement
    if (title) {
      this.titleProjected.set(this.titleTextPresent ? false : hasRenderableContent(title))
    }
    const hint = this.hintEl?.nativeElement
    if (hint) {
      this.hintProjected.set(this.hintTextPresent ? false : hasRenderableContent(hint))
    }
    const status = this.statusEl?.nativeElement
    if (status) {
      this.statusProjected.set(this.statusTextPresent ? false : hasRenderableContent(status))
    }
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The slots array (the input the adapter always binds).
   * @returns The slots.
   */
  slotList(): (string | null)[] {
    return this.slots ?? []
  }

  /**
   * Whether a text header input renders (React's `header ?? <div />`).
   * @returns True when it does.
   */
  get headerTextPresent(): boolean {
    return this.header !== undefined && this.header !== null
  }

  /**
   * Whether a text counter input renders (React's `counter ? …`).
   * @returns True when it does.
   */
  get counterTextPresent(): boolean {
    return this.counterTruthy
  }

  /**
   * Whether a text drop-zone title input renders (React's `??`).
   * @returns True when it does.
   */
  get titleTextPresent(): boolean {
    return this.dropZoneTitle !== undefined && this.dropZoneTitle !== null
  }

  /**
   * Whether a text drop-zone hint input renders (React's `??`).
   * @returns True when it does.
   */
  get hintTextPresent(): boolean {
    return this.dropZoneHint !== undefined && this.dropZoneHint !== null
  }

  /**
   * Whether a text status input renders (React's `statusMessage ? …`).
   * @returns True when it does.
   */
  get statusTextPresent(): boolean {
    return this.statusTextTruthy
  }

  /**
   * React truthiness of a text input (string nodes are the realistic case).
   * @returns Truthy.
   */
  private truthy(value: unknown): boolean {
    return value !== undefined && value !== null && value !== false && value !== '' && value !== 0
  }

  /**
   * React's `(header || counter)` row guard.
   * @returns True when the header row renders.
   */
  get showHeaderRow(): boolean {
    return (
      this.truthy(this.header) ||
      this.headerProjected() ||
      this.counterTruthy ||
      this.counterProjected()
    )
  }

  /**
   * React's `counter ? <span>…` guard.
   * @returns True when the counter span renders.
   */
  get showCounter(): boolean {
    return this.counterTruthy || this.counterProjected()
  }

  /**
   * React's `statusMessage ? <p>…` guard.
   * @returns True when the status line renders.
   */
  get showStatus(): boolean {
    return this.statusTextTruthy || this.statusProjected()
  }

  /**
   * React truthiness of the counter text input.
   * @returns Truthy.
   */
  private get counterTruthy(): boolean {
    return this.truthy(this.counter)
  }

  /**
   * React truthiness of the status text input.
   * @returns Truthy.
   */
  private get statusTextTruthy(): boolean {
    return this.truthy(this.statusMessage)
  }

  /**
   * The header row's class list.
   * @returns The class string.
   */
  headerRowClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))
  }

  /**
   * The counter span's class list.
   * @returns The class string.
   */
  counterClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('xs'),
      cm.fontWeight('bold'),
      cm.textMuted,
      cm.uppercase,
      cm.trackingWide,
    )
  }

  /**
   * The 12-column grid's class list.
   * @returns The class string.
   */
  gridClasses(): string {
    return this.cm().grid({ cols: 12, gap: 'md', responsive: false })
  }

  /**
   * The drop zone's class list.
   * @returns The class string.
   */
  dropzoneClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.surfaceSecondary,
      cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
      cm.cursorPointer,
    )
  }

  /**
   * The drop zone's inline style (Rule 5 exceptions: grid-column span, aspect
   * ratio, corner radius, dashed affordance border — a real theme token).
   * @returns The style attribute text.
   */
  dropzoneStyleText(): string | null {
    return styleText({
      gridColumn: 'span 8 / span 8',
      aspectRatio: '16 / 9',
      borderRadius: SLOT_RADIUS,
      border: '2px dashed var(--color-border)',
    })
  }

  /**
   * The upload glyph circle's class list.
   * @returns The class string.
   */
  iconCircleClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.w(16),
      cm.h(16),
      cm.bgWhite,
      cm.roundedFull,
      cm.flex({ align: 'center', justify: 'center' }),
      cm.sp('mb', 4),
    )
  }

  /**
   * The title paragraph's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().fontWeight('bold'))
  }

  /**
   * The hint paragraph's class list.
   * @returns The class string.
   */
  hintClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))
  }

  /**
   * The 2-column slot grid's class list.
   * @returns The class string.
   */
  slotsGridClasses(): string {
    return this.cm().grid({ cols: 2, gap: 'md', responsive: false })
  }

  /**
   * The slot grid's inline style (Rule 5: the 4/12 grid-column span).
   * @returns The style text.
   */
  slotsGridStyleText(): string | null {
    return styleText({ gridColumn: 'span 4 / span 4' })
  }

  /**
   * A thumbnail slot's class list.
   * @returns The class string.
   */
  slotClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.surfaceSecondary, cm.position('relative'), cm.cursorPointer)
  }

  /**
   * A thumbnail slot's inline style (Rule 5 exceptions).
   * @returns The style text.
   */
  slotStyleText(): string | null {
    return styleText({ aspectRatio: '1 / 1', borderRadius: SLOT_RADIUS, overflow: 'hidden' })
  }

  /**
   * A filled slot's image classes.
   * @returns The class string.
   */
  imgClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.w('full'), cm.h('full'))
  }

  /**
   * The image's inline style (Rule 5: object-fit + the steady dim).
   * @returns The style text.
   */
  imgStyleText(): string | null {
    return styleText({ objectFit: 'cover', opacity: 0.6 })
  }

  /**
   * The delete affordance's class list.
   * @returns The class string.
   */
  affordanceClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.position('absolute'),
      cm.inset0,
      cm.flex({ align: 'center', justify: 'center' }),
    )
  }

  /**
   * An empty slot's glyph holder classes.
   * @returns The class string.
   */
  emptySlotClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.w('full'), cm.h('full'), cm.flex({ align: 'center', justify: 'center' }))
  }

  /**
   * The status line's class list.
   * @returns The class string.
   */
  statusClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('mt', 3), cm.textSize('xs'), cm.textMuted)
  }

  /**
   * The empty slots' accessible name (React's `addImageLabel`).
   * @returns The label.
   */
  addImageLabel(): string {
    return this.i18n.t('imageGalleryEditor.aria.addImage', {}, { defaultValue: 'Add image' })
  }

  /**
   * The filled slots' accessible name (React's `removeImageLabel`).
   * @returns The label.
   */
  removeImageLabel(): string {
    return this.i18n.t('imageGalleryEditor.aria.removeImage', {}, { defaultValue: 'Remove image' })
  }

  /**
   * The drop-zone heading fallback (React's `title`).
   * @returns The text.
   */
  titleText(): string {
    return this.i18n.t(
      'imageGalleryEditor.dropZone.title',
      {},
      { defaultValue: 'Drag and drop assets here' },
    )
  }

  /**
   * The drop-zone hint fallback (React's `hint`).
   * @returns The text.
   */
  hintText(): string {
    return this.i18n.t(
      'imageGalleryEditor.dropZone.hint',
      {},
      { defaultValue: 'or click to browse local files' },
    )
  }

  /**
   * The remove-confirmation message (prop > `t()` > default).
   * @returns The message.
   */
  removeMessage(): string {
    return (
      this.confirmRemoveMessage ??
      this.i18n.t('imageGalleryEditor.remove.message', {}, { defaultValue: 'Remove this image?' })
    )
  }

  /**
   * The remove dialog's title (React's `removeTitle`).
   * @returns The title.
   */
  removeTitle(): string {
    return this.i18n.t('imageGalleryEditor.remove.title', {}, { defaultValue: 'Remove image?' })
  }

  /**
   * Turns picked or dropped files into slot URLs and writes them: into the
   * slot that opened the picker, or else into the empty slots in order.
   *
   * @param files - The files the user picked or dropped.
   * @param slot - The slot that opened the picker, or null.
   */
  async placeFiles(files: FileList, slot: number | null): Promise<void> {
    const maxImages = this.maxImages ?? 24
    const urls = this.onPickFiles
      ? await this.onPickFiles(files)
      : Array.from(files).map((f) => URL.createObjectURL(f))
    const next = [...this.slotList()]
    if (slot !== null) {
      next[slot] = urls[0] ?? null
    } else {
      let writeAt = next.findIndex((s) => s === null)
      for (const url of urls) {
        if (writeAt < 0 || writeAt >= maxImages) break
        next[writeAt] = url ?? null
        writeAt = next.findIndex((s) => s === null)
      }
    }
    this.change.emit(next.slice(0, maxImages))
  }

  /** React's `handleUploadAreaClick`: clears the slot target and opens the picker. */
  openPicker(): void {
    this.uploadingSlot.set(null)
    this.fileInput?.nativeElement.click()
  }

  /**
   * React's `handleSlotClick`: a filled slot asks for removal through the
   * shared ConfirmDialog; an empty slot targets the picker at it.
   *
   * @param index - The slot's position.
   */
  handleSlotClick(index: number): void {
    if (this.slotList()[index]) {
      this.removeIndex.set(index)
    } else {
      this.uploadingSlot.set(index)
      this.fileInput?.nativeElement.click()
    }
  }

  /**
   * React's drop-zone `onKeyDown`: Enter and Space run the click's action.
   *
   * @param event - The native keyboard event.
   */
  onZoneKeydown(event: KeyboardEvent): void {
    this.activateWithKeyboard(event, () => this.openPicker())
  }

  /**
   * React's slot `onKeyDown`: Enter and Space run the click's action.
   *
   * @param event - The native keyboard event.
   * @param index - The slot's position.
   */
  onSlotKeydown(event: KeyboardEvent, index: number): void {
    this.activateWithKeyboard(event, () => this.handleSlotClick(index))
  }

  /**
   * Activates a `role="button"` element from the keyboard — Enter and Space
   * run the same action the mouse click runs; every other key is left alone.
   *
   * @param event - The native keyboard event.
   * @param action - The click handler to mirror.
   */
  private activateWithKeyboard(event: KeyboardEvent, action: () => void): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    action()
  }

  /**
   * React's drop-zone `onDragOver`: prevents the browser's default, so the
   * browser lets the drop through.
   *
   * @param event - The native drag event.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault()
  }

  /**
   * React's drop-zone `onDrop`: refuses a drop that carries anything the
   * picker (`accept="image/*"`) would refuse, and fills the empty slots in
   * order with the rest.
   *
   * @param event - The native drop event.
   */
  onDrop(event: DragEvent): void {
    event.preventDefault()
    const files = event.dataTransfer?.files
    if (!files?.length || Array.from(files).some((f) => !f.type.startsWith('image/'))) return
    void this.placeFiles(files, null)
  }

  /**
   * React's hidden-input `onChange`: places the picked files into the slot
   * that opened the picker and clears the trigger state.
   *
   * @param event - The native change event.
   */
  async onFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const files = input.files
    if (!files?.length) return
    await this.placeFiles(files, this.uploadingSlot())
    this.uploadingSlot.set(null)
    input.value = ''
  }

  /** React's ConfirmDialog `onClose`: dismisses the removal ask. */
  closeDialog(): void {
    this.removeIndex.set(null)
  }

  /** React's ConfirmDialog `onConfirm`: nulls the slot and reports the change. */
  confirmRemove(): void {
    const index = this.removeIndex()
    if (index === null) return
    const next = [...this.slotList()]
    next[index] = null
    this.change.emit(next)
    this.removeIndex.set(null)
  }
}
