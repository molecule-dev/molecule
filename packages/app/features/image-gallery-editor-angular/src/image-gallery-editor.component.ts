/**
 * ImageGalleryEditor component (React parity).
 *
 * @module
 */

import {
  Component,
  type ElementRef,
  EventEmitter,
  type OnChanges,
  type OnDestroy,
  signal,
  type SimpleChanges,
  ViewChild,
} from '@angular/core'
import { fromByteArray } from 'base64-js'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import {
  createBrowserFileInput,
  filterPickedFiles,
  fromBrowserFile,
  type PickedFile,
} from '@molecule/app-filesystem'
import type { IconName } from '@molecule/app-icons'
import { warn } from '@molecule/app-logger'
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

/** Revokes the editor's object URLs once they are no longer needed. */
function releasePreviews(owned: Set<string>, keep: readonly (string | null)[]): void {
  for (const url of owned) {
    if (keep.includes(url)) continue
    URL.revokeObjectURL(url)
    owned.delete(url)
  }
}

/** Reads local previews from the portable file selection. */
async function createPreviews(files: readonly PickedFile[], owned: Set<string>): Promise<string[]> {
  const images = await Promise.all(
    files.map(async (file) => ({ type: file.type, data: await file.arrayBuffer() })),
  )
  const useObjectUrl =
    typeof HTMLImageElement !== 'undefined' &&
    typeof URL.createObjectURL === 'function' &&
    typeof URL.revokeObjectURL === 'function'
  return images.map(({ data, type }) => {
    if (!useObjectUrl) return `data:${type};base64,${fromByteArray(new Uint8Array(data))}`
    const url = URL.createObjectURL(new Blob([data], { type }))
    owned.add(url)
    return url
  })
}

/** Reports a chooser or preview failure. */
function reportSelectionError(error: unknown): void {
  warn('Image gallery could not use the selected files', { error })
}

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
 * The optional regions keep their capture points mounted and leave the page
 * while they have nothing to render, so content projected later comes back
 * (React would not render the region at all).
 */
@Component({
  selector: 'section[mol-image-gallery-editor]',
  standalone: true,
  imports: [ConfirmDialog, Icon],
  hostDirectives: [MolPlacement],
  outputs: ['change'],
  inputs: [
    'slots',
    'onChange',
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
  template: `<div #headerRowEl [class]="headerRowClasses()">
      @if (headerTextPresent) {
        {{ header }}
      }
      <span #headerCapt><ng-content select="[slot=header]" /></span>
      <div #placeholderEl></div>
      <span #counterEl [class]="counterClasses()">
        @if (counterTextPresent) {
          {{ counter }}
        }
        <ng-content select="[slot=counter]"
      /></span>
    </div>
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
          }
          <span #titleCapt><ng-content select="[slot=dropZoneTitle]" /></span>
          @if (titleFallbackShown()) {
            {{ titleText() }}
          }
        </p>
        <p #hintEl [class]="hintClasses()">
          @if (hintTextPresent) {
            {{ dropZoneHint }}
          }
          <span #hintCapt><ng-content select="[slot=dropZoneHint]" /></span>
          @if (hintFallbackShown()) {
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
    <p #statusEl [class]="statusClasses()" data-mol-id="image-gallery-editor-status">
      @if (statusTextPresent) {
        {{ statusMessage }}
      }
      <ng-content select="[slot=statusMessage]" />
    </p>
    <input
      #fileInput
      type="file"
      [attr.accept]="imageAccept"
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
export class ImageGalleryEditor implements OnChanges, OnDestroy {
  /** Ordered slots, `null` for empty. Length determines slot count. */
  slots?: (string | null)[]
  /** Called with the next slots array when a slot is filled or removed. */
  onChange?: ImageGalleryEditorProps['onChange']
  /** Returns URLs for the ordered selection. Defaults to local previews owned by the editor. */
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

  /** The Angular change output, used when no `onChange` callback is bound. */
  readonly change = new EventEmitter<(string | null)[]>()

  /** The header row (always in the template; detached while empty). */
  @ViewChild('headerRowEl', { static: true }) private headerRowEl?: ElementRef<HTMLDivElement>
  /** The placeholder div (React's `{header ?? <div />}`; detached while a header renders). */
  @ViewChild('placeholderEl', { static: true }) private placeholderEl?: ElementRef<HTMLDivElement>
  /** The projected header capture (its span never renders; `placeContentBefore` stands in its place). */
  @ViewChild('headerCapt', { static: true }) private headerCapt?: ElementRef<HTMLSpanElement>
  /** The counter span (always in the template; detached while empty). */
  @ViewChild('counterEl', { static: true }) private counterEl?: ElementRef<HTMLSpanElement>
  /** The drop-zone title paragraph (always in the template). */
  @ViewChild('titleEl', { static: true }) private titleEl?: ElementRef<HTMLParagraphElement>
  /** The projected title capture (its span never renders). */
  @ViewChild('titleCapt', { static: true }) private titleCapt?: ElementRef<HTMLSpanElement>
  /** The drop-zone hint paragraph (always in the template). */
  @ViewChild('hintEl', { static: true }) private hintEl?: ElementRef<HTMLParagraphElement>
  /** The projected hint capture (its span never renders). */
  @ViewChild('hintCapt', { static: true }) private hintCapt?: ElementRef<HTMLSpanElement>
  /** The status paragraph (always in the template; detached while empty). */
  @ViewChild('statusEl', { static: true }) private statusEl?: ElementRef<HTMLParagraphElement>
  /** The hidden file input (opened by a click or Enter/Space). */
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The slot that opened the picker (React's `uploadingSlot`). */
  private uploadingSlot: number | null = null
  /** The slot asking for removal, or null (React's `removeIndex`). */
  readonly removeIndex = signal<number | null>(null)

  /** File policy shared by the chooser and the hero drop target. */
  readonly imageAccept = 'image/*'
  private mounted = true
  private readonly ownedPreviews = new Set<string>()

  private readonly chooser = createBrowserFileInput(
    () => this.fileInput?.nativeElement,
    () => ({
      accept: this.imageAccept,
      onPickError: reportSelectionError,
      onFiles: (files) => {
        const slot = this.uploadingSlot
        this.uploadingSlot = null
        void this.placeFiles(files, slot)
      },
    }),
    fromBrowserFile,
  )

  private readonly drop = createBrowserFileInput(
    () => this.fileInput?.nativeElement,
    () => ({
      multiple: true,
      onPickError: reportSelectionError,
      onFiles: (files) => {
        const { accepted, rejected } = filterPickedFiles(files, {
          accept: this.imageAccept,
          multiple: true,
        })
        if (rejected.length === 0) void this.placeFiles(accepted, null)
      },
    }),
    fromBrowserFile,
  )

  /** Whether the drop-zone title falls back to the translated default text. */
  readonly titleFallbackShown = signal(false)
  /** Whether the drop-zone hint falls back to the translated default text. */
  readonly hintFallbackShown = signal(false)

  /**
   * Reconciles every optional region with React's conditional DOM, re-decided
   * whenever its inputs or its projected content change (a region taken away
   * and given back included): the header row and its placeholder, the counter,
   * the drop-zone title and hint fallbacks, and the status line.
   */
  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /** Releases previews replaced by the caller's updated slots. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slots']) releasePreviews(this.ownedPreviews, this.slotList())
  }

  /** Releases every preview when this gallery is destroyed. */
  ngOnDestroy(): void {
    this.mounted = false
    releasePreviews(this.ownedPreviews, [])
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
   * Applies React's conditions to every optional region: the header row
   * renders while `header || counter`; its placeholder while no header renders;
   * the counter while `counter`; the status line while `statusMessage`. Each
   * capture that is not a React element in its own right (the projected header,
   * title and hint) renders its content in the capture's place and leaves the
   * page, so only React's DOM remains.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const headerCapt = this.headerCapt?.nativeElement
    const headerGranted = this.headerTextPresent || (headerCapt ? hasContent(headerCapt) : false)
    placeContentBefore(headerCapt, headerCapt)
    setElementPresent(headerCapt, false)
    const counter = this.counterEl?.nativeElement
    const counterGranted = counter ? hasContent(counter) : false
    setElementPresent(counter, counterGranted)
    setElementPresent(this.headerRowEl?.nativeElement, headerGranted || counterGranted)
    setElementPresent(this.placeholderEl?.nativeElement, !headerGranted)
    const titleCapt = this.titleCapt?.nativeElement
    const titleGranted = this.titleTextPresent || (titleCapt ? hasContent(titleCapt) : false)
    this.titleFallbackShown.set(!titleGranted)
    placeContentBefore(titleCapt, titleCapt)
    setElementPresent(titleCapt, false)
    const hintCapt = this.hintCapt?.nativeElement
    const hintGranted = this.hintTextPresent || (hintCapt ? hasContent(hintCapt) : false)
    this.hintFallbackShown.set(!hintGranted)
    placeContentBefore(hintCapt, hintCapt)
    setElementPresent(hintCapt, false)
    const status = this.statusEl?.nativeElement
    setElementPresent(status, status ? hasContent(status) : false)
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
   * Delivers URLs for the ordered file selection to the chosen slot or empty slots.
   *
   * @param files - The portable files from the chooser or drop.
   * @param slot - The slot that opened the chooser, or null.
   */
  async placeFiles(files: readonly PickedFile[], slot: number | null): Promise<void> {
    const previews = new Set<string>()
    const limit = this.maxImages ?? 24
    try {
      const visible = this.slotList().slice(0, Math.max(0, limit))
      const available =
        slot === null ? visible.filter((url) => url === null).length : Number(slot < visible.length)
      const urls = this.onPickFiles
        ? await this.onPickFiles(files)
        : await createPreviews(files.slice(0, available), previews)
      if (!this.mounted) {
        releasePreviews(previews, [])
        return
      }
      const next = [...this.slotList()]
      if (slot !== null) {
        next[slot] = urls[0] ?? null
      } else {
        for (const url of urls) {
          const index = next.findIndex((value) => value === null)
          if (index < 0 || index >= limit) break
          next[index] = url ?? null
        }
      }
      const changed = next.slice(0, limit)
      releasePreviews(previews, changed)
      for (const url of previews) this.ownedPreviews.add(url)
      this.reportChange(changed)
      releasePreviews(this.ownedPreviews, [...this.slotList(), ...changed])
    } catch (error) {
      for (const url of previews) this.ownedPreviews.delete(url)
      releasePreviews(previews, [])
      reportSelectionError(error)
    }
  }

  /**
   * Opens the shared chooser at the given slot, or at the first empty slot from the hero.
   *
   * @param index - The slot that opened the chooser, or null.
   */
  openPicker(index: number | null = null): void {
    this.uploadingSlot = index
    this.chooser.onClick({ target: null, defaultPrevented: false })
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
      this.openPicker(index)
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
    this.drop.onDragOver(event)
  }

  /**
   * React's drop-zone `onDrop`: refuses a drop that carries anything the
   * picker (`accept="image/*"`) would refuse, and fills the empty slots in
   * order with the rest.
   *
   * @param event - The native drop event.
   */
  onDrop(event: DragEvent): void {
    this.drop.onDrop(event)
  }

  /**
   * Handles the native change locally so the host's change output only delivers slots.
   *
   * @param event - The chooser's native change event.
   */
  onFileChange(event: Event): void {
    event.stopPropagation()
    this.chooser.onChange()
  }

  /**
   * Delivers the next controlled slot values through the bound callback.
   *
   * @param slots - The next slot values.
   */
  private reportChange(slots: (string | null)[]): void {
    if (this.onChange) this.onChange(slots)
    else this.change.emit(slots)
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
    this.reportChange(next)
    this.removeIndex.set(null)
  }
}
