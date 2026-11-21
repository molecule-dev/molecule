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
  type OnDestroy,
  type OnInit,
  signal,
  type TemplateRef,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { asTemplate, Icon, styleText, Switch } from '@molecule/app-ui-angular'

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
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyleMap()',
    'data-mol-id': 'margin-notes',
  },
  // prettier-ignore
  template: `@if (hasNotes() && kindsCount() > 0) {<div [class]="sideSwitchesClasses()"><ng-container [ngTemplateOutlet]="switchesTpl" [ngTemplateOutletContext]="{ placement: 'side' }"></ng-container></div>}<div [class]="textClasses()">@for (row of rows(); track row.id) {<div [class]="rowClasses()" [attr.data-mol-id]="'margin-notes-row-' + row.id"><div [class]="cm().flex1" [style]="blockColumnStyle()">@for (block of row.blocks; track block.id) {<div [attr.id]="block.id" [attr.data-mol-id]="'margin-notes-block-' + block.id" [attr.data-block-marked]="block.marked ? 'true' : null" [attr.data-block-pinned]="pinnedBlock() === block.id ? 'true' : null" (mouseenter)="enterBlock(block)" (mouseleave)="leaveBlock()" (focusin)="enterBlock(block)" (focusout)="leaveBlock()" [class]="blockClasses(block)">@if (block.marked) {<span [attr.role]="markNamed() ? 'img' : null" [attr.aria-label]="markNamed() ? markLabel : null" [attr.aria-hidden]="markNamed() ? null : 'true'" [attr.data-mol-id]="'margin-notes-mark-' + block.id" [class]="markClasses()" [style]="markStyle()"></span>}@if (templateOf(block.content); as contentTpl) {<ng-container [ngTemplateOutlet]="contentTpl"></ng-container>} @else if (textOf(block.content) !== null) {{{ textOf(block.content) }}}@if (isInteractive(block)) {<div [class]="pinRowClasses()"><button type="button" [attr.aria-pressed]="pinnedBlock() === block.id ? 'true' : 'false'" [attr.aria-label]="pinLabel()" [attr.data-mol-id]="'margin-notes-pin-' + block.id" (click)="togglePin(block.id)" [class]="pinButtonClasses()"><svg mol-icon-root [name]="'pin'" [size]="16" [ariaHidden]="'true'"></svg></button></div>}</div>}</div>@if (hasNotes()) {<div [class]="gutterClasses()" [style]="gutterStyle(row)" [attr.aria-label]="notesLabel()" role="complementary">@for (note of row.notes; track note.id) {<ng-container [ngTemplateOutlet]="noteTpl" [ngTemplateOutletContext]="{ note: note, where: 'gutter' }"></ng-container>}</div>}</div>}</div>@if (hasNotes()) {<div [class]="cm().hiddenFrom('md')" [style]="spacerStyle()" aria-hidden="true"></div><div [class]="barClasses()" [style]="barStyle()" data-mol-id="margin-notes-bar"><div role="region" aria-live="polite" [attr.aria-label]="panelLabel()" [style]="panelStyle()" data-mol-id="margin-notes-panel">@for (note of panelNotes(); track note.id) {<ng-container [ngTemplateOutlet]="noteTpl" [ngTemplateOutletContext]="{ note: note, where: 'panel' }"></ng-container>}@if (pinnedBlock()) {<button type="button" (click)="unpin()" [class]="dismissClasses()" data-mol-id="margin-notes-dismiss">{{ dismissLabel() }}</button>}</div><ng-container [ngTemplateOutlet]="switchesTpl" [ngTemplateOutletContext]="{ placement: 'bar' }"></ng-container></div>}<ng-template #switchesTpl let-placement="placement">@if (kindsCount() > 0) {<div role="group" [attr.aria-label]="togglesLabel()" [class]="switchesClasses(placement)" [attr.data-mol-id]="'margin-notes-switches-' + placement">@for (kind of kinds; track kind.id) {<mol-switch [label]="kind.label" [checked]="isKindShown(kind.id)" (change)="onSwitchChange(kind.id, $event)" [className]="placement === 'bar' ? cm().touchTarget : cm().touchTargetCompact" [attr.data-mol-id]="'margin-notes-switch-' + placement + '-' + kind.id"></mol-switch>}</div>}</ng-template><ng-template #noteTpl let-note="note" let-where="where"><aside [attr.hidden]="hiddenFor(note, where)" [attr.tabindex]="where === 'gutter' ? 0 : -1" [attr.data-note-kind]="note.kind" [attr.data-note-emphasis]="isEmphasised(note) ? 'true' : null" [attr.data-mol-id]="'margin-note-' + where + '-' + note.id" (mouseenter)="enterNote(note, where)" (mouseleave)="leaveNote(where)" (focusin)="enterNote(note, where)" (focusout)="leaveNote(where)" [class]="noteClasses(note)">@if (templateOf(note.content); as noteTplContent) {<ng-container [ngTemplateOutlet]="noteTplContent"></ng-container>} @else if (textOf(note.content) !== null) {{{ textOf(note.content) }}}</aside></ng-template>`,
})
export class MarginNotes implements OnInit, AfterViewInit, OnDestroy {
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
  /** Inline style for the outer wrapper (React's camelCase style object). */
  style?: Record<string, string | number | undefined>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()
  /** The component host (React's root element). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  /** Bumped by scroll and resize, so the panel and offsets re-render. */
  private readonly scrollTick = signal(0)

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

  /** Follows the reader's scroll and viewport changes. */
  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return
    window.addEventListener('scroll', this.onScroll, { passive: true })
    window.addEventListener('resize', this.onScroll)
  }

  /** Removes the listeners. */
  ngOnDestroy(): void {
    if (typeof window === 'undefined') return
    window.removeEventListener('scroll', this.onScroll)
    window.removeEventListener('resize', this.onScroll)
  }

  /** Schedules a re-render after a scroll or resize. */
  private readonly onScroll = (): void => {
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
    this.setShown(kind, (event.target as HTMLInputElement).checked)
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
   * Marks a block as hovered/focused when it has notes.
   *
   * @param block - The block.
   */
  enterBlock(block: MarginNotesBlock): void {
    if (!this.isInteractive(block)) return
    this.activeBlock.set(block.id)
  }

  /** Clears the hovered/focused block. */
  leaveBlock(): void {
    this.activeBlock.set(null)
  }

  /**
   * Marks a gutter note as hovered/focused (the phone panel never does).
   * @param note - The note.
   * @param where - Which surface renders it.
   */
  enterNote(note: MarginNote, where: NotePlacement): void {
    if (where !== 'gutter') return
    this.activeNote.set(note.id)
  }

  /**
   * Clears the hovered/focused note.
   * @param where - Which surface rendered it.
   */
  leaveNote(where: NotePlacement): void {
    if (where !== 'gutter') return
    this.activeNote.set(null)
  }

  /**
   * The block wrapping element, found inside this component's host.
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
   * reading line, as React's effect computes it from the row geometry.
   * @returns The row id.
   */
  readingRow(): string | null {
    void this.scrollTick()
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
   * The offsets that push each row's notes down to its first line.
   * @returns Offsets by row id.
   */
  private noteOffsets(): Record<string, number> {
    void this.scrollTick()
    const next: Record<string, number> = {}
    if (!this.hasNotes()) return next
    for (const row of this.rows()) {
      if (row.notes.length === 0) continue
      const rowEl = this.rowElement(row.id)
      const blockEl = document.getElementById(row.blocks[0].id)
      const first = blockEl?.firstElementChild ?? blockEl
      if (!rowEl || !first) continue
      const top = first.getBoundingClientRect().top - rowEl.getBoundingClientRect().top
      const offset = Math.max(0, Math.round(top))
      if (offset) next[row.id] = offset
    }
    return next
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
   * `style` prop merged with the computed max width, as a style map Angular
   * applies through the CSSOM (so `calc(38rem + 18rem + 4rem)` serializes as
   * `calc(60rem)`, exactly as React's style object does).
   * @returns The style map.
   */
  hostStyleMap(): Record<string, string> {
    const merged = { ...(this.style ?? {}), maxWidth: this.maxWidth() }
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
      paddingTop: this.noteOffsets()[row.id],
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
