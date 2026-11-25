/**
 * MarginNotes component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
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
import { asTemplate, Icon, styleText, Switch } from '@molecule/app-ui-angular'

import { hoverChanged } from './hover.js'
import { buildRows, defaultShownKinds } from './rows.js'
import type { MarginNote, MarginNotesBlock, MarginNotesProps, MarginNotesRow } from './types.js'

/** Where a phone reader's "current section" is read: this fraction down the viewport. */
const READING_LINE = 0.35

/** Where a note is shown: the desktop notes column, or the phone bar's panel. */
type NotePlacement = 'gutter' | 'panel'

/** Where a switch group is shown: above the text, or in the phone bar. */
type SwitchPlacement = 'side' | 'bar'

/**
 * A plain-text node value, or null when the value is not text.
 *
 * @param value - The node value.
 * @returns The text to render, or null.
 */
const textOf = (value: unknown): string | null =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : null

/** Escapes special characters for a double-quoted CSS string (the React element's rule). */
const escapeCssString = (value: string): string =>
  value.replace(/["\\\n\r\f]/g, (character) => `\\${character.charCodeAt(0).toString(16)} `)

/**
 * A React element's `style` with its `coverImage` turned into the background
 * declarations the element paints: the image behind the contents, centred and
 * sized to cover the box. An empty URI paints none.
 *
 * @param style - The React-shaped style object.
 * @returns The same declarations, `coverImage` replaced where it stood.
 */
const elementStyle = (
  style: Record<string, string | number | undefined>,
): Record<string, string | number | undefined> =>
  Object.fromEntries(
    Object.entries(style).flatMap(([name, value]): [string, string | number | undefined][] =>
      name === 'coverImage'
        ? [
            ['backgroundImage', value ? `url("${escapeCssString(String(value))}")` : undefined],
            ['backgroundSize', 'cover'],
            ['backgroundPosition', 'center'],
          ]
        : [[name, value]],
    ),
  )

/**
 * Long-form text with notes beside each paragraph.
 *
 * Desktop: a prose column and, to its right, a narrower notes column; each
 * note lines up with the block(s) it belongs to and appears once. Phone: the
 * notes column disappears and a bar fixed to the bottom shows the notes for
 * the section being read (a noted block's pin button pins its notes, a second
 * press lets go), with the kind switches in the bar. Every default — which
 * kinds show, which surface a width gets — is decided in the first render and
 * by CSS, so server-rendered or prerendered HTML is right before any JavaScript
 * runs.
 *
 * The host IS React's root `<div>` (`div[mol-margin-notes]`): same classes,
 * same inline style, same `data-mol-id`. Node-valued props are `TemplateRef`
 * inputs (or plain text) rendered into the block and note wrappers.
 *
 * This is the Angular counterpart of `@molecule/app-margin-notes-react`.
 */
@Component({
  selector: 'div[mol-margin-notes]',
  standalone: true,
  imports: [NgTemplateOutlet, Icon, Switch],
  inputs: [
    'blocks',
    'notes',
    'kinds',
    'markLabel',
    'measure',
    'gutterWidth',
    'shownKinds',
    'onShownKindsChange',
    'className',
    'style',
    'webStyle',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyleMap()',
    'data-mol-id': 'margin-notes',
  },
  // prettier-ignore
  template: `@if (hasNotes() && kindsCount() > 0) {<div [class]="sideSwitchesClasses()"><ng-container [ngTemplateOutlet]="switchesTpl" [ngTemplateOutletContext]="{ placement: 'side' }"></ng-container></div>}<div [class]="textClasses()">@for (row of rows(); track row.id) {<div [class]="rowClasses()" [attr.data-mol-id]="'margin-notes-row-' + row.id"><div [class]="cm().flex1" [style]="blockColumnStyle()">@for (block of row.blocks; track block.id) {<div [attr.id]="block.id" [attr.data-mol-id]="'margin-notes-block-' + block.id" [attr.data-block-marked]="block.marked ? 'true' : null" [attr.data-block-pinned]="pinnedBlock() === block.id ? 'true' : null" (pointerenter)="blockHover($event, block, true)" (pointerleave)="blockHover($event, block, false)" (mouseenter)="blockHover($event, block, true)" (mouseleave)="blockHover($event, block, false)" (focusin)="focusBlock(block)" (focusout)="blurBlock()" [class]="blockClasses(block)">@if (block.marked) {<span [attr.role]="markNamed() ? 'img' : null" [attr.aria-label]="markNamed() ? markLabel : null" [attr.aria-hidden]="markNamed() ? null : 'true'" [attr.data-mol-id]="'margin-notes-mark-' + block.id" [class]="markClasses()" [style]="markStyle()"></span>}@if (templateOf(block.content); as contentTpl) {<ng-container [ngTemplateOutlet]="contentTpl"></ng-container>} @else if (textOf(block.content) !== null) {{{ textOf(block.content) }}}@if (isInteractive(block)) {<div [class]="pinRowClasses()"><button type="button" [attr.aria-pressed]="pinnedBlock() === block.id ? 'true' : 'false'" [attr.aria-label]="pinLabel()" [attr.data-mol-id]="'margin-notes-pin-' + block.id" (click)="togglePin(block.id)" [class]="pinButtonClasses()"><svg mol-icon-root [name]="'pin'" [size]="16" [ariaHidden]="'true'"></svg></button></div>}</div>}</div>@if (hasNotes()) {<div [class]="gutterClasses()" [style]="gutterStyle(row)" [attr.aria-label]="notesLabel()" role="complementary">@for (note of row.notes; track note.id) {<ng-container [ngTemplateOutlet]="noteTpl" [ngTemplateOutletContext]="{ note: note, where: 'gutter' }"></ng-container>}</div>}</div>}</div>@if (hasNotes()) {<div [class]="cm().hiddenFrom('md')" [style]="spacerStyle()" aria-hidden="true"></div><div [class]="barClasses()" [style]="barStyle()" data-mol-id="margin-notes-bar"><div role="region" aria-live="polite" [attr.aria-label]="panelLabel()" [style]="panelStyle()" data-mol-id="margin-notes-panel">@for (note of panelNotes(); track note.id) {<ng-container [ngTemplateOutlet]="noteTpl" [ngTemplateOutletContext]="{ note: note, where: 'panel' }"></ng-container>}@if (pinnedBlock()) {<button type="button" (click)="unpin()" [class]="dismissClasses()" data-mol-id="margin-notes-dismiss">{{ dismissLabel() }}</button>}</div><ng-container [ngTemplateOutlet]="switchesTpl" [ngTemplateOutletContext]="{ placement: 'bar' }"></ng-container></div>}<ng-template #switchesTpl let-placement="placement">@if (kindsCount() > 0) {<div role="group" [attr.aria-label]="togglesLabel()" [class]="switchesClasses(placement)" [attr.data-mol-id]="'margin-notes-switches-' + placement">@for (kind of kinds; track kind.id) {<mol-switch [label]="kind.label" [checked]="isKindShown(kind.id)" (change)="onSwitchChange(kind.id, $event)" [className]="placement === 'bar' ? cm().touchTarget : cm().touchTargetCompact" [attr.data-mol-id]="'margin-notes-switch-' + placement + '-' + kind.id"></mol-switch>}</div>}</ng-template><ng-template #noteTpl let-note="note" let-where="where"><aside [attr.hidden]="hiddenFor(note, where)" [attr.tabindex]="where === 'gutter' ? 0 : -1" [attr.data-note-kind]="note.kind" [attr.data-note-emphasis]="isEmphasised(note) ? 'true' : null" [attr.data-mol-id]="'margin-note-' + where + '-' + note.id" (pointerenter)="noteHover($event, note, where, true)" (pointerleave)="noteHover($event, note, where, false)" (mouseenter)="noteHover($event, note, where, true)" (mouseleave)="noteHover($event, note, where, false)" (focusin)="focusNote(note, where)" (focusout)="blurNote()" [class]="noteClasses(note)">@if (templateOf(note.content); as noteTplContent) {<ng-container [ngTemplateOutlet]="noteTplContent"></ng-container>} @else if (textOf(note.content) !== null) {{{ textOf(note.content) }}}</aside></ng-template>`,
})
export class MarginNotes implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  /** The text, in reading order. */
  blocks: MarginNotesBlock[] = []
  /** Every note the blocks refer to. */
  notes: MarginNote[] = []
  /** The note kinds, in the order their switches appear. */
  kinds: MarginNotesProps['kinds'] = []
  /**
   * Accessible name of the margin mark, already translated. Without it (or with
   * a blank one) the mark is decorative and hidden from assistive technology —
   * a margin mark carries no meaning on its own.
   */
  markLabel?: string
  /** Width of the prose column (defaults to `'38rem'` at read time). */
  measure?: string
  /** Width of the notes column (defaults to `'18rem'` at read time). */
  gutterWidth?: string
  /** Controlled: the ids of the kinds currently shown. */
  shownKinds?: string[]
  /** Called with the new list of shown kind ids whenever the reader flips a switch. */
  onShownKindsChange?: (shown: string[]) => void
  /** Extra classes on the outer wrapper. */
  className?: string
  /**
   * Inline style for the outer wrapper (React's camelCase style object). Its
   * `coverImage` (an image URI) paints the image behind the wrapper, centred and
   * sized to cover it.
   */
  style?: Record<string, string | number | undefined>
  /**
   * Web-only inline style for the outer wrapper (React's `webStyle`), applied
   * after `style`. The notes layout's own max width still wins.
   */
  webStyle?: Record<string, string | number | undefined>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()
  /** The component host (React's root element). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  /** Bumped when the blocks or the notes change: a new document is read and aligned afresh. */
  private readonly documentTick = signal(0)
  /** Bumped once per animation frame in which the document scrolled or the viewport was resized. */
  private readonly scrollTick = signal(0)
  /** Bumped once per animation frame that followed a resize, which also realigns the notes. */
  private readonly resizeTick = signal(0)
  /** The frame a queued read of the viewport waits for, or 0 when none is queued. */
  private frame = 0
  /** Whether the viewport was resized since the last read. */
  private resized = false
  /**
   * Each row's note offset with the document and the viewport size it was
   * measured for, by row id.
   */
  private readonly offsets = new Map<
    string,
    { document: number; resize: number; offset: number | undefined }
  >()

  /** The reader's own switch state (React's `useState(() => defaultShownKinds(kinds))`). */
  private readonly ownShown = signal<string[]>([])
  /** The block whose notes are emphasised (hover/focus). */
  private readonly activeBlock = signal<string | null>(null)
  /** The note whose blocks are tinted (hover/focus). */
  private readonly activeNote = signal<string | null>(null)
  /** The block the reader pinned, if any. */
  private readonly pinnedBlock = signal<string | null>(null)

  /** Seeds the switch state from the kinds, as React's initializer does. */
  ngOnInit(): void {
    this.ownShown.set(defaultShownKinds(this.kinds ?? []))
  }

  /**
   * Reads and aligns a new document, as React's observer does when its rows
   * change (its effect depends on them).
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ('blocks' in changes || 'notes' in changes) this.documentTick.update((value) => value + 1)
  }

  /**
   * Follows every scroll in the document, a nested scroller's included, and
   * every resize.
   */
  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return
    window.addEventListener('scroll', this.onScroll, { capture: true, passive: true })
    window.addEventListener('resize', this.onResize)
  }

  /** Removes the listeners and the queued read. */
  ngOnDestroy(): void {
    if (typeof window === 'undefined') return
    window.removeEventListener('scroll', this.onScroll, true)
    window.removeEventListener('resize', this.onResize)
    if (this.frame) window.cancelAnimationFrame(this.frame)
  }

  /** Queues one read of the viewport, so a frame of scroll events is read once. */
  private readonly onScroll = (): void => {
    if (!this.frame) this.frame = window.requestAnimationFrame(this.readViewport)
  }

  /** Queues the read of a resize, which realigns the notes too. */
  private readonly onResize = (): void => {
    this.resized = true
    this.onScroll()
  }

  /**
   * Reads the viewport for its frame, exactly as React's `useReadingPosition`
   * does: a resize realigns the notes (the viewport's size is what a note was
   * aligned to), and a scroll or a resize re-reads the section being read.
   */
  private readonly readViewport = (): void => {
    this.frame = 0
    if (this.resized) {
      this.resized = false
      this.resizeTick.update((value) => value + 1)
    }
    this.scrollTick.update((value) => value + 1)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The translated pin label.
   * @returns The label.
   */
  pinLabel(): string {
    return this.i18n.t('marginNotes.aria.pin', undefined, {
      defaultValue: 'Pin the notes for this section',
    })
  }

  /**
   * The translated switch-group label.
   * @returns The label.
   */
  togglesLabel(): string {
    return this.i18n.t('marginNotes.aria.toggles', undefined, {
      defaultValue: 'Show or hide notes',
    })
  }

  /**
   * The translated notes-column label.
   * @returns The label.
   */
  notesLabel(): string {
    return this.i18n.t('marginNotes.aria.notes', undefined, { defaultValue: 'Notes' })
  }

  /**
   * The translated phone-panel label.
   * @returns The label.
   */
  panelLabel(): string {
    return this.i18n.t('marginNotes.aria.panel', undefined, {
      defaultValue: 'Notes for this section',
    })
  }

  /**
   * The translated dismiss label.
   * @returns The label.
   */
  dismissLabel(): string {
    return this.i18n.t('marginNotes.dismiss', undefined, { defaultValue: 'Hide notes' })
  }

  /**
   * The layout rows (React's `useMemo(() => buildRows(blocks, notes))`).
   * @returns The rows, in reading order.
   */
  rows(): MarginNotesRow[] {
    return buildRows(this.blocks ?? [], this.notes ?? [])
  }

  /**
   * Notes by id.
   * @returns The map.
   */
  notesById(): Map<string, MarginNote> {
    return new Map((this.notes ?? []).map((n) => [n.id, n]))
  }

  /**
   * Whether the document has any notes to show.
   * @returns True when at least one row carries a note.
   */
  hasNotes(): boolean {
    return this.rows().some((r) => r.notes.length > 0)
  }

  /**
   * The number of switchable kinds.
   * @returns The count.
   */
  kindsCount(): number {
    return (this.kinds ?? []).length
  }

  /**
   * The ids of the kinds currently shown (controlled or own).
   * @returns The ids.
   */
  private shown(): string[] {
    return this.shownKinds ?? this.ownShown()
  }

  /**
   * Whether a kind's switch reads on.
   * @param id - The kind id.
   * @returns True when shown.
   */
  isKindShown(id: string): boolean {
    return this.shown().includes(id)
  }

  /**
   * The switchable kind ids.
   * @returns The set.
   */
  private switchable(): Set<string> {
    return new Set((this.kinds ?? []).map((k) => k.id))
  }

  /**
   * Whether a note is shown (its kind is not switchable, or its switch is on).
   * @param note - The note.
   * @returns True when shown.
   */
  private isShown(note: MarginNote): boolean {
    return !this.switchable().has(note.kind) || this.shown().includes(note.kind)
  }

  /**
   * Records a switch flip (React's `setShown`).
   * @param kind - The kind id.
   * @param on - Whether it is now on.
   */
  private setShown(kind: string, on: boolean): void {
    const next = on ? [...new Set([...this.shown(), kind])] : this.shown().filter((k) => k !== kind)
    if (this.shownKinds === undefined) this.ownShown.set(next)
    this.onShownKindsChange?.(next)
  }

  /**
   * Handles a switch's genuine native `change` event.
   * @param kind - The kind id.
   * @param event - The event.
   */
  onSwitchChange(kind: string, event: Event): void {
    const target = event.target
    if (target && 'checked' in target && typeof target.checked === 'boolean') {
      this.setShown(kind, target.checked)
    }
  }

  /**
   * The note ids of the block the reader is hovering/focusing.
   * @returns The set.
   */
  private activeBlockNotes(): Set<string> {
    const id = this.activeBlock()
    const b = id ? (this.blocks ?? []).find((x) => x.id === id) : undefined
    return new Set(b?.noteIds ?? [])
  }

  /**
   * Marks a block as hovered, or clears it, when it has notes and the pointer or
   * mouse event reporting the move is a real hover (see `hoverChanged`).
   * @param event - The enter or the leave.
   * @param block - The block.
   * @param entered - Whether it is an entry.
   */
  blockHover(event: Event, block: MarginNotesBlock, entered: boolean): void {
    if (!this.isInteractive(block) || !hoverChanged(event, entered)) return
    this.activeBlock.set(entered ? block.id : null)
  }

  /**
   * Marks a block as focused when it has notes.
   * @param block - The block.
   */
  focusBlock(block: MarginNotesBlock): void {
    if (!this.isInteractive(block)) return
    this.activeBlock.set(block.id)
  }

  /** Clears the hovered or focused block. */
  blurBlock(): void {
    this.activeBlock.set(null)
  }

  /**
   * Marks a gutter note as hovered, or clears it, when the pointer or mouse
   * event reporting the move is a real hover (the phone panel never does).
   * @param event - The enter or the leave.
   * @param note - The note.
   * @param where - Which surface renders it.
   * @param entered - Whether it is an entry.
   */
  noteHover(event: Event, note: MarginNote, where: NotePlacement, entered: boolean): void {
    if (where !== 'gutter' || !hoverChanged(event, entered)) return
    this.activeNote.set(entered ? note.id : null)
  }

  /**
   * Marks a gutter note as focused (the phone panel never does).
   * @param note - The note.
   * @param where - Which surface renders it.
   */
  focusNote(note: MarginNote, where: NotePlacement): void {
    if (where !== 'gutter') return
    this.activeNote.set(note.id)
  }

  /** Clears the hovered or focused note. */
  blurNote(): void {
    this.activeNote.set(null)
  }

  /**
   * The block wrapping element this component rendered, found inside its host.
   * Two documents on a page can repeat block ids, and a lookup by id in the whole
   * document answers with the first one's.
   * @param id - The block id.
   * @returns The element, or null.
   */
  private blockElement(id: string): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(
      `[data-mol-id="margin-notes-block-${id}"]`,
    )
  }

  /**
   * The row element, found inside this component's host.
   * @param id - The row id.
   * @returns The element, or null.
   */
  private rowElement(id: string): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(
      `[data-mol-id="margin-notes-row-${id}"]`,
    )
  }

  /**
   * The first row that carries notes (React's `firstWithNotes`).
   * @returns The row id, or null.
   */
  private firstWithNotes(): string | null {
    return this.rows().find((r) => r.noteIds.length > 0)?.id ?? null
  }

  /**
   * The section being read: the last noted row whose top is at or above the
   * reading line, as React computes it from the row geometry.
   * @returns The row id.
   */
  readingRow(): string | null {
    void this.scrollTick()
    void this.documentTick()
    if (!this.hasNotes() || typeof window === 'undefined') return this.firstWithNotes()
    const line = window.innerHeight * READING_LINE
    let current: string | null = null
    for (const row of this.rows()) {
      const el = this.rowElement(row.id)
      if (!el) continue
      if (el.getBoundingClientRect().top > line) break
      if (row.noteIds.length > 0) current = row.id
    }
    return current ?? this.firstWithNotes()
  }

  /**
   * The note ids the phone panel shows.
   * @returns The ids.
   */
  private panelNoteIds(): string[] {
    const pinned = this.pinnedBlock()
    if (pinned) return (this.blocks ?? []).find((b) => b.id === pinned)?.noteIds ?? []
    const ids = this.rows().find((r) => r.id === this.readingRow())?.noteIds ?? []
    const byId = this.notesById()
    const tapOnly = this.tapOnly()
    // A tap kind follows the reader too once its switch is ON.
    return ids.filter((id) => {
      const note = byId.get(id)
      return !!note && (!tapOnly.has(note.kind) || this.isShown(note))
    })
  }

  /**
   * The ids of the kinds that reach the panel only through a pin.
   * @returns The set.
   */
  private tapOnly(): Set<string> {
    return new Set((this.kinds ?? []).filter((k) => k.panel === 'tap').map((k) => k.id))
  }

  /**
   * Whether the phone panel shows a note (a pin reveals tap-kind notes).
   * @param note - The note.
   * @returns True when shown.
   */
  private inPanel(note: MarginNote): boolean {
    return this.isShown(note) || (this.pinnedBlock() !== null && this.tapOnly().has(note.kind))
  }

  /**
   * The notes the phone panel renders.
   * @returns The notes.
   */
  panelNotes(): MarginNote[] {
    const byId = this.notesById()
    return this.panelNoteIds()
      .map((id) => byId.get(id))
      .filter((n): n is MarginNote => !!n && this.inPanel(n))
  }

  /**
   * Whether a note is emphasised by the current hover/focus.
   * @param note - The note.
   * @returns True when emphasised.
   */
  isEmphasised(note: MarginNote): boolean {
    return this.activeBlockNotes().has(note.id) || this.activeNote() === note.id
  }

  /**
   * The note's hidden state (React's `hidden` attribute).
   * @param note - The note.
   * @param where - Which surface renders it.
   * @returns `''` when hidden, null otherwise.
   */
  hiddenFor(note: MarginNote, where: NotePlacement): '' | null {
    const hidden = where === 'panel' ? !this.inPanel(note) : !this.isShown(note)
    return hidden ? '' : null
  }

  /**
   * Whether a block is interactive (it refers to at least one note).
   * @param block - The block.
   * @returns True when it carries note ids.
   */
  isInteractive(block: MarginNotesBlock): boolean {
    return (block.noteIds ?? []).length > 0
  }

  /**
   * Toggles a block's pin (a second press lets go).
   * @param id - The block id.
   */
  togglePin(id: string): void {
    this.pinnedBlock.set(this.pinnedBlock() === id ? null : id)
  }

  /** Clears the pin. */
  unpin(): void {
    this.pinnedBlock.set(null)
  }

  /**
   * A node value as a template, when it is one.
   * @param value - The node value.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return asTemplate(value)
  }

  /**
   * A node value as plain text, when it is text.
   * @param value - The node value.
   * @returns The text, or null.
   */
  textOf(value: unknown): string | null {
    return textOf(value)
  }

  /**
   * How far a row's notes sit below the row's top, so the first note lines up
   * with the first line of the block the row opens with: the block this
   * component rendered (React's `alignGutter`). Measured when the row renders
   * for a new document or after a resize, as React measures then, and kept
   * until the next one.
   * @param row - The row.
   * @returns The offset in pixels, or undefined when the notes need none.
   */
  private noteOffset(row: MarginNotesRow): number | undefined {
    const document = this.documentTick()
    const resize = this.resizeTick()
    const known = this.offsets.get(row.id)
    if (known && known.document === document && known.resize === resize) return known.offset
    const offset = this.measureOffset(row)
    this.offsets.set(row.id, { document, resize, offset })
    return offset
  }

  /**
   * Measures one row's note offset: its own registered block's first line
   * against the row's top.
   * @param row - The row.
   * @returns The offset in pixels, or undefined when the notes need none.
   */
  private measureOffset(row: MarginNotesRow): number | undefined {
    if (row.notes.length === 0 || !this.hasNotes()) return undefined
    const rowEl = this.rowElement(row.id)
    const blockEl = this.blockElement(row.blocks[0].id)
    const first = blockEl?.firstElementChild ?? blockEl
    if (!rowEl || !first) return undefined
    const top = first.getBoundingClientRect().top - rowEl.getBoundingClientRect().top
    const offset = Math.max(0, Math.round(top))
    return offset || undefined
  }

  /**
   * The host's class list (React's root classes).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().mxAuto, this.cm().w('full'), this.className)
  }

  /**
   * The host's max width (React's `containerStyle.maxWidth`).
   * @returns The CSS length.
   */
  maxWidth(): string {
    return this.hasNotes()
      ? `calc(${this.measure ?? '38rem'} + ${this.gutterWidth ?? '18rem'} + 4rem)`
      : (this.measure ?? '38rem')
  }

  /**
   * The host's inline style (React's `containerStyle`): the caller's React-shaped
   * `style` prop (its `coverImage` painted as the React element paints it), then
   * the element's `webStyle` (the web-only paint), then the computed max width,
   * as a style map Angular applies through the CSSOM (so
   * `calc(38rem + 18rem + 4rem)` serializes as `calc(60rem)`, exactly as React's
   * style object does).
   * @returns The style map.
   */
  hostStyleMap(): Record<string, string> {
    const merged = {
      ...elementStyle(this.style ?? {}),
      ...this.webStyle,
      maxWidth: this.maxWidth(),
    }
    const map: Record<string, string> = {}
    for (const [key, value] of Object.entries(merged)) {
      const text = styleText({ [key]: value })
      if (!text) continue
      const colon = text.indexOf(':')
      map[text.slice(0, colon).trim()] = text.slice(colon + 1).trim()
    }
    return map
  }

  /**
   * The switches wrapper above the text.
   * @returns The class string.
   */
  sideSwitchesClasses(): string {
    return this.cm().cn(this.cm().hiddenBelow('md'), this.cm().sp('mb', 6))
  }

  /**
   * The text column.
   * @returns The class string.
   */
  textClasses(): string {
    return this.cm().cn(this.cm().textSize('xl'), this.cm().stack(0))
  }

  /**
   * One row.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ direction: 'row', align: 'start', gap: 'xl' })
  }

  /**
   * The prose column of a row.
   * @returns The `style` attribute text.
   */
  blockColumnStyle(): string | null {
    return styleText({ maxWidth: this.measure ?? '38rem', minWidth: 0 })
  }

  /**
   * One block wrapper.
   * @param block - The block.
   * @returns The class string.
   */
  blockClasses(block: MarginNotesBlock): string {
    const tinted = !!this.activeNote() && (block.noteIds ?? []).includes(this.activeNote()!)
    return this.cm().cn(this.cm().position('relative'), tinted && this.cm().bgPrimarySubtle)
  }

  /**
   * Whether the margin mark is named (a non-blank `markLabel`); an unnamed mark
   * is decorative (axe-core rejects an image with no name).
   * @returns True when a label is set.
   */
  markNamed(): boolean {
    return typeof this.markLabel === 'string' && this.markLabel.trim().length > 0
  }

  /**
   * The margin mark.
   * @returns The class string.
   */
  markClasses(): string {
    return this.cm().cn(
      this.cm().position('absolute'),
      this.cm().roundedFull,
      this.cm().bgPrimary,
      this.cm().hiddenBelow('md'),
    )
  }

  /**
   * The margin mark's inline style.
   * @returns The `style` attribute text.
   */
  markStyle(): string | null {
    return styleText({ left: '-0.9rem', top: '0.75em', width: '6px', height: '6px' })
  }

  /**
   * The pin row under an interactive block.
   * @returns The class string.
   */
  pinRowClasses(): string {
    return this.cm().cn(this.cm().hiddenFrom('md'), this.cm().flex({ justify: 'end' }))
  }

  /**
   * The pin button.
   * @returns The class string.
   */
  pinButtonClasses(): string {
    return this.cm().button({ variant: 'ghost', size: 'sm' })
  }

  /**
   * The notes column of a row.
   * @returns The class string.
   */
  gutterClasses(): string {
    return this.cm().cn(this.cm().hiddenBelow('md'), this.cm().stack(3))
  }

  /**
   * The notes column's inline style.
   * @param row - The row.
   * @returns The `style` attribute text.
   */
  gutterStyle(row: MarginNotesRow): string | null {
    return styleText({
      width: this.gutterWidth ?? '18rem',
      flexShrink: 0,
      paddingTop: this.noteOffset(row),
    })
  }

  /**
   * One note's classes.
   * @param note - The note.
   * @returns The class string.
   */
  noteClasses(note: MarginNote): string {
    const emphasised = this.isEmphasised(note)
    return this.cm().cn(
      this.cm().sp('p', 3),
      this.cm().textSize('sm'),
      this.cm().textMuted,
      emphasised && this.cm().bgPrimarySubtle,
      emphasised && this.cm().shadowLifted,
    )
  }

  /**
   * The phone bar's spacer.
   * @returns The `style` attribute text.
   */
  spacerStyle(): string | null {
    return styleText({ height: '14rem' })
  }

  /**
   * The phone bar.
   * @returns The class string.
   */
  barClasses(): string {
    return this.cm().cn(
      this.cm().hiddenFrom('md'),
      this.cm().position('fixed'),
      this.cm().surface,
      this.cm().borderT,
      this.cm().shadowLifted,
      this.cm().sp('p', 3),
      this.cm().stack(2),
    )
  }

  /**
   * The phone bar's inline style.
   * @returns The `style` attribute text.
   */
  barStyle(): string | null {
    return styleText({ left: 0, right: 0, bottom: 0, zIndex: 20 })
  }

  /**
   * The phone panel's inline style.
   * @returns The `style` attribute text.
   */
  panelStyle(): string | null {
    return styleText({ maxHeight: '40vh', overflowY: 'auto' })
  }

  /**
   * The dismiss button.
   * @returns The class string.
   */
  dismissClasses(): string {
    return this.cm().cn(this.cm().button({ variant: 'ghost', size: 'sm' }), this.cm().touchTarget)
  }

  /**
   * One switch group.
   * @param placement - Where the group is rendered.
   * @returns The class string.
   */
  switchesClasses(placement: SwitchPlacement): string {
    void placement
    return this.cm().flex({ direction: 'row', wrap: 'wrap', gap: 'md', align: 'center' })
  }
}
