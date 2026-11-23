/**
 * ModerationQueue component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, signal, TemplateRef } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import { MolModerationChecked } from './checked.js'
import type {
  ModerationBulkAction,
  ModerationItem,
  ModerationItemKind,
  ModerationItemSeverity,
} from './types.js'

/** The leading glyph of each content kind. */
const KIND_GLYPH: Record<ModerationItemKind, string> = {
  post: '\u{1F4DD}',
  comment: '\u{1F4AC}',
  image: '\u{1F5BC}',
  message: '✉',
  profile: '\u{1F464}',
}

/** The severity → `ColorVariant` mapping. */
const SEVERITY_COLOR: Record<ModerationItemSeverity, ColorVariant> = {
  low: 'info',
  medium: 'warning',
  high: 'error',
}

/**
 * Translates a severity to its `ColorVariant`. Exported for tests and
 * downstream consumers (chips, badges, summary tiles).
 *
 * @param severity - Severity bucket (`'low'`, `'medium'`, `'high'`) or undefined.
 * @returns Mapped `ColorVariant`, defaulting to `'info'` when severity is omitted.
 */
export function severityColor(severity: ModerationItemSeverity | undefined): ColorVariant {
  return severity ? SEVERITY_COLOR[severity] : 'info'
}

/**
 * Moderation queue — a list of flagged items with kind icon, content preview,
 * reason chip, severity color, per-row action buttons (approve / reject /
 * escalate / mute), and a bulk-select toolbar (select-all checkbox +
 * apply-to-selected action buttons).
 *
 * React's root element changes with the branch (loading / empty / list), so the
 * rendered root stands in front of the host's place and the host itself leaves
 * the page (`placeContentBefore` + `setElementPresent`). Selection state
 * is internal, as React's `useState` is: a bulk action is reported through
 * `onBulkAction` and the selection clears afterwards.
 *
 * All user-visible text comes from i18n keys in
 * `@molecule/app-locales-moderation-queue`. Styling is driven exclusively
 * through `getClassMap()`.
 */
@Component({
  selector: 'div[mol-moderation-queue]',
  standalone: true,
  imports: [NgTemplateOutlet, MolModerationChecked, Button],
  hostDirectives: [MolPlacement],
  inputs: [
    'items',
    'onApprove',
    'onReject',
    'onEscalate',
    'onMute',
    'onBulkAction',
    'loading',
    'emptyState',
    'className',
  ],
  // prettier-ignore
  template: `@if (loading) {<div role="status" aria-live="polite" data-mol-id="moderation-queue-loading" [class]="loadingClasses()"><span>{{ loadingText() }}</span></div>}@else if (items.length === 0) {<div role="status" data-mol-id="moderation-queue-empty" [class]="emptyClasses()">@if (emptyTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (textOf(emptyState)) {{{ textOf(emptyState) }}}@else {<span [class]="emptyTextClasses()">{{ emptyText() }}</span>}</div>}@else {<div role="region" [attr.aria-label]="regionLabel()" data-mol-id="moderation-queue" [class]="rootClasses()"><div role="toolbar" [attr.aria-label]="toolbarLabel()" data-mol-id="moderation-queue-bulk-toolbar" [class]="toolbarClasses()"><label [class]="selectAllLabelClasses()" data-mol-id="moderation-queue-select-all-label"><input type="checkbox" mol-moderation-checked [molModerationChecked]="allSelected()" [molModerationIndeterminate]="someSelected()" (change)="toggleAll()" data-mol-id="moderation-queue-select-all" [attr.aria-label]="selectAllLabel()" /><span>@if (selectionCount() > 0) {{{ selectedCountText() }}}@else {{{ selectAllText() }}}</span></label>@if (onBulkAction) {<div [class]="bulkRowClasses()" data-mol-id="moderation-queue-bulk-actions"><button mol-button [variant]="'ghost'" [size]="'sm'" [color]="'success'" [disabled]="selectionCount() === 0" (click)="applyBulk('approve')" data-mol-id="moderation-queue-bulk-approve">{{ bulkApproveText() }}</button><button mol-button [variant]="'ghost'" [size]="'sm'" [color]="'error'" [disabled]="selectionCount() === 0" (click)="applyBulk('reject')" data-mol-id="moderation-queue-bulk-reject">{{ bulkRejectText() }}</button>@if (onEscalate) {<button mol-button [variant]="'ghost'" [size]="'sm'" [color]="'warning'" [disabled]="selectionCount() === 0" (click)="applyBulk('escalate')" data-mol-id="moderation-queue-bulk-escalate">{{ bulkEscalateText() }}</button>}@if (onMute) {<button mol-button [variant]="'ghost'" [size]="'sm'" [color]="'secondary'" [disabled]="selectionCount() === 0" (click)="applyBulk('mute')" data-mol-id="moderation-queue-bulk-mute">{{ bulkMuteText() }}</button>}</div>}</div><ul [class]="listClasses()" data-mol-id="moderation-queue-list" style="list-style: none; margin: 0px; padding: 0px">@for (item of items; track item.id) {<li data-mol-id="moderation-queue-row" [attr.data-mol-row-id]="item.id" [attr.data-mol-kind]="item.kind" [attr.data-mol-severity]="item.severity ?? 'unspecified'" [class]="rowClasses()"><input type="checkbox" mol-moderation-checked [molModerationChecked]="selected().has(item.id)" (change)="toggleOne(item.id)" data-mol-id="moderation-queue-row-select" [attr.aria-label]="selectRowLabel()" /><span aria-hidden="true" data-mol-id="moderation-queue-row-kind-icon" [class]="kindIconClasses()">{{ glyphOf(item.kind) }}</span><div [class]="bodyClasses()"><div [class]="metaClasses()" data-mol-id="moderation-queue-row-meta"><span [class]="semiboldClasses()">{{ kindLabel(item.kind) }}</span>@if (item.severity) {<span data-mol-id="moderation-queue-row-severity" [class]="severityClasses(item.severity)">{{ severityLabel(item.severity) }}</span>}@if (item.reportedBy) {<span data-mol-id="moderation-queue-row-reported-by">{{ reportedByLabel() }}&ngsp;<span [class]="semiboldClasses()">@if (isTemplate(item.reportedBy)) {<ng-container [ngTemplateOutlet]="templateOf(item.reportedBy)" />}@else {{{ textOf(item.reportedBy) }}}</span></span>}<span data-mol-id="moderation-queue-row-reported-at">@if (isTemplate(item.reportedAt)) {<ng-container [ngTemplateOutlet]="templateOf(item.reportedAt)" />}@else {{{ textOf(item.reportedAt) }}}</span></div><div data-mol-id="moderation-queue-row-preview" [class]="previewClasses()">@if (isTemplate(item.preview)) {<ng-container [ngTemplateOutlet]="templateOf(item.preview)" />}@else {{{ textOf(item.preview) }}}</div><div data-mol-id="moderation-queue-row-reason" [class]="metaClasses()"><span [class]="semiboldClasses()">{{ reasonLabel() }}:</span><span>@if (isTemplate(item.reason)) {<ng-container [ngTemplateOutlet]="templateOf(item.reason)" />}@else {{{ textOf(item.reason) }}}</span></div></div><div [class]="bulkRowClasses()" data-mol-id="moderation-queue-row-actions"><button mol-button [size]="'sm'" [variant]="'ghost'" [color]="'success'" (click)="approve(item.id)" data-mol-id="moderation-queue-row-approve" [attr.aria-label]="rowApproveLabel()">{{ rowApproveText() }}</button><button mol-button [size]="'sm'" [variant]="'ghost'" [color]="'error'" (click)="reject(item.id)" data-mol-id="moderation-queue-row-reject" [attr.aria-label]="rowRejectLabel()">{{ rowRejectText() }}</button>@if (onEscalate) {<button mol-button [size]="'sm'" [variant]="'ghost'" [color]="'warning'" (click)="escalate(item.id)" data-mol-id="moderation-queue-row-escalate" [attr.aria-label]="rowEscalateLabel()">{{ rowEscalateText() }}</button>}@if (onMute) {<button mol-button [size]="'sm'" [variant]="'ghost'" [color]="'secondary'" (click)="mute(item.id)" data-mol-id="moderation-queue-row-mute" [attr.aria-label]="rowMuteLabel()">{{ rowMuteText() }}</button>}</div></li>}</ul></div>}`,
})
export class ModerationQueue {
  /** Flagged items to display. */
  items: ModerationItem[] = []
  /** Approve the item — content is allowed / kept. */
  onApprove?: (id: string) => void
  /** Reject the item — content is removed / hidden. */
  onReject?: (id: string) => void
  /** Escalate to a senior moderator / human review. Optional. */
  onEscalate?: (id: string) => void
  /** Mute the reporter / poster. Optional. */
  onMute?: (id: string) => void
  /** Apply an action to the currently-selected ids, if bulk select is in use. */
  onBulkAction?: (action: ModerationBulkAction, ids: string[]) => void
  /** Loading state — replaces the list with a spinner row. */
  loading?: boolean
  /** Empty-state content (a template ref or text), rendered when `items` is empty. */
  emptyState?: unknown
  /** Extra classes for the outer container. */
  className?: string

  /** The internal selection state (React's `selected` set). */
  private readonly internalSelected = signal<ReadonlySet<string>>(new Set())

  /** The i18n handle (locale-reactive, read in an injection context). */
  private readonly i18n = useTranslation()

  /** The component's host element (React renders no element of its own). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the branch element itself: it renders in front of the host's place
    // and the host leaves the page.
    usePlacement(() => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
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
   * The currently selected ids.
   * @returns The selection.
   */
  selected(): ReadonlySet<string> {
    return this.internalSelected()
  }

  /**
   * The current items' ids.
   * @returns The ids, in render order.
   */
  ids(): string[] {
    return this.items.map((item) => item.id)
  }

  /**
   * Whether every item is selected (React's `allIds.length > 0 && every`).
   * @returns True when every id is selected.
   */
  allSelected(): boolean {
    const ids = this.ids()
    return ids.length > 0 && ids.every((id) => this.selected().has(id))
  }

  /**
   * Whether some, but not all, items are selected (React's `someSelected`).
   * @returns True for a partial selection.
   */
  someSelected(): boolean {
    const ids = this.ids()
    return !this.allSelected() && ids.some((id) => this.selected().has(id))
  }

  /**
   * How many of the current items are selected.
   * @returns The selection count.
   */
  selectionCount(): number {
    return this.ids().filter((id) => this.selected().has(id)).length
  }

  /**
   * Toggles one item's selection (React's `toggleOne`).
   * @param id - The item id.
   */
  toggleOne(id: string): void {
    const next = new Set(this.selected())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.internalSelected.set(next)
  }

  /**
   * Selects every item, or clears the selection when all are selected
   * (React's `toggleAll`).
   */
  toggleAll(): void {
    const ids = this.ids()
    const every = ids.length > 0 && ids.every((id) => this.selected().has(id))
    this.internalSelected.set(every ? new Set<string>() : new Set(ids))
  }

  /**
   * Applies a bulk action to the selected ids and clears the selection
   * (React's `applyBulk`).
   * @param action - The bulk action.
   */
  applyBulk(action: ModerationBulkAction): void {
    const ids = this.ids()
    const picked = Array.from(this.selected()).filter((id) => ids.includes(id))
    if (picked.length === 0) return
    this.onBulkAction?.(action, picked)
    this.internalSelected.set(new Set<string>())
  }

  /**
   * Runs a row's approve handler (React's `onApprove(item.id)`).
   * @param id - The item id.
   */
  approve(id: string): void {
    this.onApprove?.(id)
  }

  /**
   * Runs a row's reject handler (React's `onReject(item.id)`).
   * @param id - The item id.
   */
  reject(id: string): void {
    this.onReject?.(id)
  }

  /**
   * Runs a row's escalate handler (React's `onEscalate(item.id)`).
   * @param id - The item id.
   */
  escalate(id: string): void {
    this.onEscalate?.(id)
  }

  /**
   * Runs a row's mute handler (React's `onMute(item.id)`).
   * @param id - The item id.
   */
  mute(id: string): void {
    this.onMute?.(id)
  }

  /**
   * The glyph of one content kind.
   * @param kind - The item kind.
   * @returns The glyph.
   */
  glyphOf(kind: ModerationItemKind): string {
    return KIND_GLYPH[kind]
  }

  /**
   * Kind label — one literal `t()` call per `ModerationItemKind` value.
   * @param kind - Item kind.
   * @returns The translated kind label.
   */
  kindLabel(kind: ModerationItemKind): string {
    switch (kind) {
      case 'post':
        return this.i18n.t('moderationQueue.kind.post', {}, { defaultValue: 'Post' })
      case 'comment':
        return this.i18n.t('moderationQueue.kind.comment', {}, { defaultValue: 'Comment' })
      case 'image':
        return this.i18n.t('moderationQueue.kind.image', {}, { defaultValue: 'Image' })
      case 'message':
        return this.i18n.t('moderationQueue.kind.message', {}, { defaultValue: 'Message' })
      case 'profile':
        return this.i18n.t('moderationQueue.kind.profile', {}, { defaultValue: 'Profile' })
    }
  }

  /**
   * Severity label — one literal `t()` call per `ModerationItemSeverity` value.
   * @param severity - Severity bucket.
   * @returns The translated severity label.
   */
  severityLabel(severity: ModerationItemSeverity): string {
    switch (severity) {
      case 'low':
        return this.i18n.t('moderationQueue.severity.low', {}, { defaultValue: 'Low' })
      case 'medium':
        return this.i18n.t('moderationQueue.severity.medium', {}, { defaultValue: 'Medium' })
      case 'high':
        return this.i18n.t('moderationQueue.severity.high', {}, { defaultValue: 'High' })
    }
  }

  /**
   * A severity chip's class list (React's `sevToken` map + `fontWeight`): there
   * is no ClassMap token for secondary/info, so those fall back to
   * `textPrimary`, exactly as React does.
   * @param severity - The item's severity.
   * @returns The class string.
   */
  severityClasses(severity: ModerationItemSeverity): string {
    const token: Record<ColorVariant, string> = {
      primary: this.cm().textPrimary,
      secondary: this.cm().textPrimary,
      success: this.cm().textSuccess,
      warning: this.cm().textWarning,
      error: this.cm().textError,
      info: this.cm().textPrimary,
    }
    return this.cm().cn(this.cm().fontWeight('semibold'), token[severityColor(severity)])
  }

  /**
   * The loading branch's class list.
   * @returns The class string.
   */
  loadingClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'center' }),
      this.cm().sp('p', 4),
      this.className,
    )
  }

  /**
   * The empty branch's class list.
   * @returns The class string.
   */
  emptyClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'center' }),
      this.cm().sp('p', 6),
      this.className,
    )
  }

  /**
   * The default empty-state text's class (`textSize('sm')`).
   * @returns The class string.
   */
  emptyTextClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * The list branch's root class list (`stack(2)` + `className`).
   * @returns The class string.
   */
  rootClasses(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * The toolbar's class list.
   * @returns The class string.
   */
  toolbarClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'md' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', 2),
    )
  }

  /**
   * The select-all label's class list.
   * @returns The class string.
   */
  selectAllLabelClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.cm().textSize('sm'))
  }

  /**
   * The bulk action row's class list.
   * @returns The class string.
   */
  bulkRowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The list element's class list (`stack(2)`).
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(this.cm().stack(2))
  }

  /**
   * A row's class list.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'start', gap: 'md' }), this.cm().sp('p', 3))
  }

  /**
   * The kind icon's class list (`textSize('lg')`).
   * @returns The class string.
   */
  kindIconClasses(): string {
    return this.cm().cn(this.cm().textSize('lg'))
  }

  /**
   * The row body's class list (`flex1` + `stack(1)`).
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1))
  }

  /**
   * The meta and reason rows' class list.
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.cm().textSize('xs'))
  }

  /**
   * The preview block's class list (`textSize('sm')`).
   * @returns The class string.
   */
  previewClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * The semibold label class.
   * @returns The class string.
   */
  semiboldClasses(): string {
    return this.cm().fontWeight('semibold')
  }

  /**
   * The loading text (literal `moderationQueue.loading`).
   * @returns The translated text.
   */
  loadingText(): string {
    return this.i18n.t('moderationQueue.loading', {}, { defaultValue: 'Loading moderation queue…' })
  }

  /**
   * The default empty-state text (literal `moderationQueue.empty`).
   * @returns The translated text.
   */
  emptyText(): string {
    return this.i18n.t(
      'moderationQueue.empty',
      {},
      { defaultValue: 'No items awaiting moderation.' },
    )
  }

  /**
   * The region's accessible name (literal `moderationQueue.aria.region`).
   * @returns The translated text.
   */
  regionLabel(): string {
    return this.i18n.t('moderationQueue.aria.region', {}, { defaultValue: 'Moderation queue' })
  }

  /**
   * The toolbar's accessible name (literal `moderationQueue.aria.bulkToolbar`).
   * @returns The translated text.
   */
  toolbarLabel(): string {
    return this.i18n.t(
      'moderationQueue.aria.bulkToolbar',
      {},
      { defaultValue: 'Bulk moderation actions' },
    )
  }

  /**
   * The select-all checkbox's accessible name (literal `moderationQueue.aria.selectAll`).
   * @returns The translated text.
   */
  selectAllLabel(): string {
    return this.i18n.t('moderationQueue.aria.selectAll', {}, { defaultValue: 'Select all' })
  }

  /**
   * The plain select-all label (literal `moderationQueue.selectAll`).
   * @returns The translated text.
   */
  selectAllText(): string {
    return this.i18n.t('moderationQueue.selectAll', {}, { defaultValue: 'Select all' })
  }

  /**
   * The selected-count label (literal `moderationQueue.selectedCount`).
   * @returns The translated text.
   */
  selectedCountText(): string {
    return this.i18n.t(
      'moderationQueue.selectedCount',
      { count: this.selectionCount() },
      { defaultValue: '{{count}} selected' },
    )
  }

  /**
   * A row checkbox's accessible name (literal `moderationQueue.aria.selectRow`).
   * @returns The translated text.
   */
  selectRowLabel(): string {
    return this.i18n.t('moderationQueue.aria.selectRow', {}, { defaultValue: 'Select item' })
  }

  /**
   * The "Reported by" prefix (literal `moderationQueue.reportedBy`).
   * @returns The translated text.
   */
  reportedByLabel(): string {
    return this.i18n.t('moderationQueue.reportedBy', {}, { defaultValue: 'Reported by' })
  }

  /**
   * The reason label (literal `moderationQueue.reason`).
   * @returns The translated text.
   */
  reasonLabel(): string {
    return this.i18n.t('moderationQueue.reason', {}, { defaultValue: 'Reason' })
  }

  /**
   * A row approve button's accessible name (literal `moderationQueue.aria.approve`).
   * @returns The translated text.
   */
  rowApproveLabel(): string {
    return this.i18n.t('moderationQueue.aria.approve', {}, { defaultValue: 'Approve' })
  }

  /**
   * A row reject button's accessible name (literal `moderationQueue.aria.reject`).
   * @returns The translated text.
   */
  rowRejectLabel(): string {
    return this.i18n.t('moderationQueue.aria.reject', {}, { defaultValue: 'Reject' })
  }

  /**
   * A row escalate button's accessible name (literal `moderationQueue.aria.escalate`).
   * @returns The translated text.
   */
  rowEscalateLabel(): string {
    return this.i18n.t('moderationQueue.aria.escalate', {}, { defaultValue: 'Escalate' })
  }

  /**
   * A row mute button's accessible name (literal `moderationQueue.aria.mute`).
   * @returns The translated text.
   */
  rowMuteLabel(): string {
    return this.i18n.t('moderationQueue.aria.mute', {}, { defaultValue: 'Mute' })
  }

  /**
   * The row approve button's text (literal `moderationQueue.action.approve`).
   * @returns The translated text.
   */
  rowApproveText(): string {
    return this.i18n.t('moderationQueue.action.approve', {}, { defaultValue: 'Approve' })
  }

  /**
   * The row reject button's text (literal `moderationQueue.action.reject`).
   * @returns The translated text.
   */
  rowRejectText(): string {
    return this.i18n.t('moderationQueue.action.reject', {}, { defaultValue: 'Reject' })
  }

  /**
   * The row escalate button's text (literal `moderationQueue.action.escalate`).
   * @returns The translated text.
   */
  rowEscalateText(): string {
    return this.i18n.t('moderationQueue.action.escalate', {}, { defaultValue: 'Escalate' })
  }

  /**
   * The row mute button's text (literal `moderationQueue.action.mute`).
   * @returns The translated text.
   */
  rowMuteText(): string {
    return this.i18n.t('moderationQueue.action.mute', {}, { defaultValue: 'Mute' })
  }

  /**
   * The bulk approve button's text (literal `moderationQueue.bulk.approve`).
   * @returns The translated text.
   */
  bulkApproveText(): string {
    return this.i18n.t('moderationQueue.bulk.approve', {}, { defaultValue: 'Approve' })
  }

  /**
   * The bulk reject button's text (literal `moderationQueue.bulk.reject`).
   * @returns The translated text.
   */
  bulkRejectText(): string {
    return this.i18n.t('moderationQueue.bulk.reject', {}, { defaultValue: 'Reject' })
  }

  /**
   * The bulk escalate button's text (literal `moderationQueue.bulk.escalate`).
   * @returns The translated text.
   */
  bulkEscalateText(): string {
    return this.i18n.t('moderationQueue.bulk.escalate', {}, { defaultValue: 'Escalate' })
  }

  /**
   * The bulk mute button's text (literal `moderationQueue.bulk.mute`).
   * @returns The translated text.
   */
  bulkMuteText(): string {
    return this.i18n.t('moderationQueue.bulk.mute', {}, { defaultValue: 'Mute' })
  }

  /**
   * The empty state as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  emptyTemplate(): TemplateRef<unknown> | null {
    return this.emptyState instanceof TemplateRef ? this.emptyState : null
  }

  /**
   * Whether a value is a node (an `ng-template` reference) rather than text.
   * @param value - The field value.
   * @returns True when it renders through a template outlet.
   */
  isTemplate(value: unknown): boolean {
    return value instanceof TemplateRef
  }

  /**
   * Narrows a value to its template.
   * @param value - The field value.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   * @param value - The field value.
   * @returns The text, or `''` for a node field.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
}
