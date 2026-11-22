/**
 * A colored context ring with progressive context, session and allowance
 * details — the Angular counterpart of `@molecule/app-ide-react`'s
 * `ContextUsageIndicator` (see that file for the design notes): the same
 * inputs (React prop names), the same DOM for the same input, the same
 * callbacks and service calls. The collapsed trigger is a ring whose arc
 * fills with the context ratio and whose percentage slides in on hover; the
 * details modal carries the summary, the live session rows, the refresh and
 * settings actions, the request-composition table, the token history chart
 * and the completed compactions. Session totals load on hover/open through
 * the `useContextSessionUsage` hook in `src/hooks`.
 *
 * React's export re-keys its stateful view per conversation
 * (`key={project}:{conversation}`), so navigation discards the open preview,
 * the modal and the in-flight request; this port renders its view content
 * inside an `@for` tracked on the same key, which destroys and re-creates it
 * the same way. `mergeContextHistory`,
 * the history/estimate merge that feeds the chart, comes from
 * `@molecule/app-ide-panel-logic`, as React's does.
 *
 * The component is a part (React renders it inside ChatPanel without
 * exporting it), so it lives in `src/parts/`. The host element IS React's
 * root wrapper `<div>` (`div[mol-context-usage-indicator]`), so the wrapper's
 * style and hover/focus listeners sit on it, and every derived value is a
 * method the template reads, so each change-detection pass renders the
 * current state the way React's render does.
 *
 * Styling uses `getClassMap()` (`cm.*`); inline styles appear exactly where
 * React uses them, as CSS strings for the plain elements and React-shaped
 * camelCase objects for the kit's components (their `styleText` conversion).
 * All user-facing text goes through `t()`; each label method reads the
 * locale, so a switch re-renders it the way React's whole-component render
 * does.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  type OnChanges,
  signal,
  type SimpleChanges,
  untracked,
} from '@angular/core'

import type { ContextCategory, ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { formatTokenCount } from '@molecule/app-ai-models'
import { useTranslation } from '@molecule/app-angular'
import { contextCategoryLabel, mergeContextHistory } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Modal, Progress, Tooltip } from '@molecule/app-ui-angular'

import { useContextSessionUsage } from '../hooks/useContextSessionUsage.js'
import { ContextSessionUsage } from './context-session-usage.component.js'

/** Props for {@link ContextUsageIndicator} — the React prop names, React's own contract. */
export interface ContextUsageIndicatorProps {
  /** The conversation's current usage sample. */
  usage: ContextUsage
  /** The earlier samples of the conversation, for the history chart. */
  history?: ContextUsage[]
  /** The completed compactions of the conversation. */
  compactions?: ContextCompaction[]
  /** The project whose session totals load; absent renders no refresh button. */
  projectId?: string
  /** The conversation the usage belongs to (`null` scopes the session to the project). */
  conversationId?: string | null
  /** Opens the chat settings; absent renders no settings button. */
  onOpenSettings?: () => void
}

/** The tooltip box's inline style, fixed for every case (React's literal). */
const TOOLTIP_STYLE: Record<string, string | number> = {
  width: 320,
  maxWidth: 'calc(100vw - 32px)',
  whiteSpace: 'normal',
}

/**
 * A colored context ring with progressive context, session and allowance
 * details.
 */
@Component({
  selector: 'div[mol-context-usage-indicator]',
  standalone: true,
  imports: [NgTemplateOutlet, Modal, Progress, Tooltip, ContextSessionUsage],
  inputs: ['usage', 'history', 'compactions', 'projectId', 'conversationId', 'onOpenSettings'],
  host: {
    style: 'margin-left: auto',
    '(mouseover)': 'onWrapperOver($event)',
    '(mouseout)': 'onWrapperOut($event)',
    '(focusin)': 'onWrapperFocusIn($event)',
    '(focusout)': 'preview.set(false)',
  },
  // prettier-ignore
  template: `<ng-template #summary><div [class]="summaryClass()"><div [class]="headerClass()"><strong>{{ status() }}</strong><strong [class]="color()">{{ percent() }}%</strong></div><div mol-progress [value]="percent()" [color]="tone()" [size]="'sm'" [label]="targetLabel()"></div><div [class]="mutedXs()">{{ tokensText() }} {{ tokenUnit() }}<div>{{ headroomText() }}</div></div></div></ng-template>@for (view of [sessionKey()]; track view) {<mol-tooltip placement="top-end" [style]="tooltipStyle()"><button type="button" [class]="triggerClass()" [attr.style]="triggerStyle()" data-mol-id="chat-context-usage" [attr.aria-label]="ariaLabel()" aria-haspopup="dialog" [attr.aria-expanded]="open() ? 'true' : 'false'" (click)="openModal()" (keydown)="onTriggerKeydown($event)"><span [class]="color()" aria-hidden="true" data-ctx-pct [attr.style]="pctStyle()">{{ percent() }}%</span><svg [class]="color()" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" stroke-width="2" opacity=".15"></circle><circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" stroke-width="2" [attr.stroke-dasharray]="dasharray()" [attr.stroke-dashoffset]="dashoffset()" transform="rotate(-90 9 9)" stroke-linecap="round"></circle></svg></button><ng-container ngProjectAs="[slot=content]"><div [class]="contentClass()" style="padding: 8px 0px" (mouseover)="onContentOver($event)" (mouseout)="onContentOut($event)"><ng-container [ngTemplateOutlet]="summary"></ng-container><div [class]="cm.borderT" style="padding-top: 12px"><div mol-context-session-usage [data]="sessionData()" [loading]="session.loading()" [failed]="session.failed()"></div></div><span [class]="hintClass()">{{ openDetailsText() }}</span></div></ng-container></mol-tooltip>@if (open()) {<mol-modal [open]="true" (close)="closeModal()" [title]="title()" [size]="'lg'"><div [class]="modalBodyClass()"><section [class]="cardClass()" [attr.style]="sectionStyle()"><ng-container [ngTemplateOutlet]="summary"></ng-container><div [class]="cm.borderT" style="margin-top: 16px; padding-top: 16px"><div mol-context-session-usage [data]="sessionData()" [loading]="session.loading()" [failed]="session.failed()"></div></div></section><div [class]="actionRowClass()">@if (projectId) {<button type="button" data-mol-id="chat-context-refresh" [class]="secondaryAction()" [disabled]="session.loading()" (click)="session.refresh()">{{ refreshLabel() }}</button>}@if (onOpenSettings) {<button type="button" data-mol-id="chat-context-settings" [class]="secondaryAction()" (click)="openSettings()">{{ settingsLabel() }}</button>}</div>@if (target() != null) {<p [class]="mutedSm()">{{ targetHelpText() }}</p>}<p [class]="mutedSm()">{{ windowSizeText() }}</p>@if (usage.composition) {<section [class]="compositionClass()"><h3 [class]="semibold()">{{ breakdownLabel() }}</h3><p>@if (usage.composition.actualInputTokens != null) { {{ actualText() }} } @else { {{ pendingText() }} }</p><p class="{{ cm.textMuted }}">{{ estimateText() }}</p>@if (usage.composition.unknownTokenItems > 0 || usage.composition.serializationFailures > 0) {<p class="{{ cm.textMuted }}">{{ unknownText() }}</p>}<div style="overflow-x: auto"><table [class]="cm.table" style="text-align: left"><caption class="{{ cm.srOnly }}">{{ breakdownLabel() }}</caption><thead><tr><th [class]="cm.tableHead">{{ categoryLabel() }}</th><th [class]="cm.tableHead">{{ tokensLabel() }}</th><th [class]="cm.tableHead">{{ shareLabel() }}</th><th [class]="cm.tableHead">{{ bytesLabel() }}</th></tr></thead><tbody>@for (category of categories(); track category.id) {<tr [class]="cm.tableRow"><th scope="row" [class]="cm.tableCell">{{ categoryLabelOf(category.id) }}</th><td [class]="cm.tableCell">{{ estimateCell(category) }}</td><td [class]="cm.tableCell">{{ shareCell(category) }}</td><td [class]="cm.tableCell">{{ category.bytes.toLocaleString() }}</td></tr>}</tbody></table></div></section>}@if (chart(); as chartValue) {<figure style="margin: 16px 0px"><figcaption [class]="semibold()">{{ historyLabel(chartValue.count) }}</figcaption><svg viewBox="0 0 320 96" role="img" [attr.aria-label]="chartLabel()" style="width: 100%; height: 120px"><line x1="8" x2="312" [attr.y1]="chartValue.targetY" [attr.y2]="chartValue.targetY" stroke="currentColor" opacity=".4" stroke-dasharray="4 4"></line><polyline [attr.points]="chartValue.points" fill="none" stroke="currentColor" stroke-width="2"></polyline></svg><div [class]="cm.textMuted" style="display: flex; justify-content: space-between"><span>{{ chartValue.startText }}</span><span>{{ chartValue.maxText }} {{ tokenUnit() }}</span><span>{{ chartValue.endText }}</span></div></figure>}@if (compactionList().length > 0) {<details data-mol-id="chat-context-compactions"><summary>{{ compactionsLabel() }}</summary><ul>@for (event of compactionList(); track $index) {<li>{{ compactionText(event) }}</li>}</ul></details>}</div></mol-modal>}}`,
})
export class ContextUsageIndicator implements OnChanges {
  /**
   * React re-keys its whole view per conversation, so a navigation discards
   * the preview and the modal; reset them when either id changes.
   *
   * @param changes - The inputs Angular reports as changed.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const changed = (key: 'projectId' | 'conversationId'): boolean => {
      const change = changes[key]
      return change !== undefined && change.previousValue !== change.currentValue
    }
    if (!changed('projectId') && !changed('conversationId')) return
    this.preview.set(false)
    this.open.set(false)
  }

  /** The conversation's current usage sample. */
  usage!: ContextUsage

  /** The earlier samples of the conversation, for the history chart. */
  history?: ContextUsage[]

  /** The completed compactions of the conversation. */
  compactions?: ContextCompaction[]

  /** The project whose session totals load; absent renders no refresh button. */
  projectId?: string

  /** The conversation the usage belongs to (`null` scopes the session to the project). */
  conversationId?: string | null

  /** Opens the chat settings; absent renders no settings button. */
  onOpenSettings?: () => void

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template's label bindings. */
  protected readonly t = this.i18n.t

  /** The active locale code (a change re-runs the bindings that read it). */
  protected readonly locale = this.i18n.locale

  /** The hover/preview state of this conversation's view. */
  protected readonly preview = signal(false)

  /** The details-modal state of this conversation's view. */
  protected readonly open = signal(false)

  /** The hook's bridges: the reactive props and visibility as signals. */
  protected readonly projectSignal = signal<string | undefined>(undefined)
  /** The conversation the hook scopes the totals to. */
  protected readonly conversationSignal = signal<string | null | undefined>(undefined)
  /** Whether the summary is visible (the preview showing or the modal open). */
  protected readonly activeSignal = signal(false)

  // The bridges mirror the inputs and the visibility; each effect re-runs the
  // way React's render hands the hook its arguments.
  constructor() {
    effect(() => this.projectSignal.set(this.projectId))
    effect(() => this.conversationSignal.set(this.conversationId))
    effect(() => this.activeSignal.set(this.open() || this.preview()))
    // A reply belongs to the conversation current when it arrived; React
    // unmounts the view on navigation, so an old reply reads as no data.
    effect(() => {
      void this.session.data()
      untracked(() => this.dataKey.set(this.sessionKey()))
    })
    // While the preview shows, Escape dismisses it from anywhere on the page:
    // the composer's Escape is a keyboard event that reaches the document, not
    // this trigger.
    effect(() => {
      const visible = this.preview()
      untracked(() => this.attachDismisser(visible))
    })
    inject(DestroyRef).onDestroy(() => this.attachDismisser(false))
    inject(DestroyRef) // the hook cleans up through its own injection context
  }

  /** Whether the page-wide Escape dismisser is attached. */
  private listening = false

  /**
   * Attaches or detaches the page-wide Escape dismisser for the preview.
   *
   * @param visible - Whether the preview is showing.
   */
  private attachDismisser(visible: boolean): void {
    if (typeof document === 'undefined') return
    if (visible && !this.listening) {
      document.addEventListener('keydown', this.onDocumentKeydown)
      this.listening = true
    } else if (!visible && this.listening) {
      document.removeEventListener('keydown', this.onDocumentKeydown)
      this.listening = false
    }
  }

  /** Dismisses an open preview on Escape from anywhere on the page. */
  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.preview.set(false)
  }

  /** The conversation whose reply the loaded totals belong to. */
  private readonly dataKey = signal('')

  /** The session-usage state (called in the injection context of the field). */
  protected readonly session = useContextSessionUsage(
    this.projectSignal,
    this.conversationSignal,
    this.activeSignal,
  )

  /**
   * The session totals for the conversation on screen: a reply for the
   * previous conversation reads as no data until the new reply arrives, the
   * way React's re-keyed view starts empty.
   */
  protected readonly sessionData = computed(() =>
    this.dataKey() === this.sessionKey() ? this.session.data() : null,
  )

  /**
   * Whether a bubbling over/out crossing the element's boundary counts as an
   * enter/leave the way React's synthetic mouseenter/mouseleave do: moving
   * between descendants fires over/out with the pointer still inside
   * (`relatedTarget` within the element), which is no boundary crossing.
   */
  protected crossedBoundary(element: HTMLElement, event: MouseEvent): boolean {
    return !element.contains(event.relatedTarget as Node)
  }

  /** React's wrapper hover: only a boundary crossing toggles the preview. */
  protected onWrapperOver(event: MouseEvent): void {
    if (this.crossedBoundary(event.currentTarget as HTMLElement, event)) this.preview.set(true)
  }

  /** React's wrapper leave: only a boundary crossing dismisses the preview. */
  protected onWrapperOut(event: MouseEvent): void {
    if (this.crossedBoundary(event.currentTarget as HTMLElement, event)) this.preview.set(false)
  }

  /** React's focus handler: reveal the preview only for a focus-visible focus. */
  protected onWrapperFocusIn(event: FocusEvent): void {
    const el = event.target as HTMLElement
    try {
      this.preview.set(typeof el.matches === 'function' && el.matches(':focus-visible'))
    } catch (_error) {
      // :focus-visible unsupported here — don't show on focus; hover still applies.
    }
  }

  /** Moving into the tooltip keeps the preview open. */
  protected onContentOver(event: MouseEvent): void {
    if (this.crossedBoundary(event.currentTarget as HTMLElement, event)) this.preview.set(true)
  }

  /** Leaving the tooltip dismisses the preview after the grace timer. */
  protected onContentOut(event: MouseEvent): void {
    if (this.crossedBoundary(event.currentTarget as HTMLElement, event)) this.preview.set(false)
  }

  /** Opens the modal and dismisses the preview (React's onClick). */
  protected openModal(): void {
    this.preview.set(false)
    this.open.set(true)
  }

  /** Closes the modal (React's onClose). */
  protected closeModal(): void {
    this.open.set(false)
  }

  /** The Escape keydown on the trigger dismisses the preview at once. */
  protected onTriggerKeydown(event: KeyboardEvent): void {
    // Escape is a keyboard event from the focused element, so it belongs on
    // this trigger (the only focusable thing the preview wrapper holds), not
    // on the wrapper div around it.
    if (event.key === 'Escape') this.preview.set(false)
  }

  /** Closes the modal and reports onOpenSettings. */
  protected openSettings(): void {
    this.open.set(false)
    this.onOpenSettings?.()
  }

  /** React's `key` for the view, from the project and conversation ids. */
  protected sessionKey(): string {
    return `${this.projectId ?? ''}:${this.conversationId ?? ''}`
  }

  /** The compaction threshold this sample rides on (may be undefined). */
  protected target(): number | undefined {
    return this.usage.backgroundCompactAtTokens ?? this.usage.compactAtTokens
  }

  /** The effective limit the ratio reads against (never below one). */
  protected limit(): number {
    return Math.max(1, this.target() ?? this.usage.contextWindow)
  }

  /** The context ratio, clamped at zero. */
  protected ratio(): number {
    return Math.max(0, this.usage.inputTokens / this.limit())
  }

  /** The rounded percentage the ring and the summary show. */
  protected percent(): number {
    return Math.round(this.ratio() * 100)
  }

  /** The semantic color class for the ratio. */
  protected color(): string {
    const cm = this.cm
    return this.ratio() < 0.5 ? cm.textSuccess : this.ratio() < 0.9 ? cm.textWarning : cm.textError
  }

  /** The progress bar's semantic tone for the ratio. */
  protected tone(): 'success' | 'warning' | 'error' {
    return this.ratio() < 0.5 ? 'success' : this.ratio() < 0.9 ? 'warning' : 'error'
  }

  /** The ring arcs' stroke-dasharray (the full circumference). */
  protected dasharray(): string {
    return `${16 * Math.PI}`
  }

  /** The second ring arc's stroke-dashoffset for the clamped ratio. */
  protected dashoffset(): string {
    return `${16 * Math.PI * (1 - Math.min(this.ratio(), 1))}`
  }

  /** The trigger's translated title (`Context usage`). */
  protected title(): string {
    void this.locale()
    return this.t('ide.chat.context.title', undefined, { defaultValue: 'Context usage' })
  }

  /** The limit's label: the compaction target, or the context window. */
  protected targetLabel(): string {
    void this.locale()
    return this.target()
      ? this.t('ide.chat.context.target', undefined, { defaultValue: 'Compaction target' })
      : this.t('ide.chat.context.window', undefined, { defaultValue: 'Context window' })
  }

  /** The status sentence above the bar. */
  protected status(): string {
    void this.locale()
    return this.target() != null && this.ratio() >= 1
      ? this.t('ide.chat.context.atTarget', undefined, { defaultValue: 'At compaction target' })
      : this.ratio() >= 0.9
        ? this.t('ide.chat.context.nearTarget', undefined, { defaultValue: 'Context nearly full' })
        : this.t('ide.chat.context.healthy', undefined, { defaultValue: 'Context has room' })
  }

  /** The trigger's aria label: the title, the tokens, the limit and the target. */
  protected ariaLabel(): string {
    void this.locale()
    const label = this.t(
      'ide.chat.context.indicator',
      {
        tokens: formatTokenCount(this.usage.inputTokens),
        limit: formatTokenCount(this.limit()),
        target: this.targetLabel(),
        percent: this.percent(),
      },
      { defaultValue: '{{tokens}} / {{limit}} tokens · {{target}} ({{percent}}%)' },
    )
    return `${this.title()}: ${label}`
  }

  /** The trigger button's style: the gap opens only while the preview shows. */
  protected triggerStyle(): string {
    return `display: inline-flex; gap: ${this.preview() ? '4px' : '0px'}`
  }

  /** The percentage span's style, from React's reveal widths. */
  protected pctStyle(): string {
    return `width: ${this.preview() ? 'auto' : '0px'}; opacity: ${this.preview() ? '1' : '0'}; overflow: hidden; white-space: nowrap; transition: opacity 150ms`
  }

  /** The tooltip box's inline style (React's literal, camelCase for the kit). */
  protected tooltipStyle(): Record<string, string | number> {
    return TOOLTIP_STYLE
  }

  /** The modal section's padding, from the ClassMap spacing helper. */
  protected sectionStyle(): string {
    return `padding: ${this.cm.sp({ p: 4 }).paddingTop}`
  }

  /** The merged samples behind the history chart. */
  protected samples(): ContextUsage[] {
    return mergeContextHistory(this.history ?? [], [this.usage])
  }

  /** The history chart's geometry (null while a lone sample draws no chart). */
  protected chart(): {
    points: string
    targetY: string
    count: number
    maxText: string
    startText: string
    endText: string
  } | null {
    void this.locale()
    const samples = this.samples()
    if (samples.length <= 1) return null
    const limit = this.limit()
    const maxTokens = Math.max(limit, ...samples.map((sample) => sample.inputTokens), 1)
    const start = Date.parse(samples[0]?.at ?? '') || 0
    const end = Date.parse(samples.at(-1)?.at ?? '') || start
    const points = samples
      .map((sample, i) => {
        const x =
          end > start
            ? 8 + 304 * ((Date.parse(sample.at ?? '') - start) / (end - start))
            : 8 + 304 * (i / Math.max(1, samples.length - 1))
        return `${x},${88 - (80 * sample.inputTokens) / maxTokens}`
      })
      .join(' ')
    return {
      points,
      targetY: `${88 - (80 * limit) / maxTokens}`,
      count: samples.length,
      maxText: formatTokenCount(maxTokens),
      startText: start ? new Date(start).toLocaleTimeString() : '',
      endText: end ? new Date(end).toLocaleTimeString() : '',
    }
  }

  /** The composition table's measurable rows, best estimate first. */
  protected categories(): ContextCategory[] {
    const composition = this.usage.composition
    if (!composition) return []
    return [...composition.categories]
      .filter((category) => category.bytes > 0 || category.unknownItems > 0)
      .sort((a, b) => (b.estimatedTokens ?? 0) - (a.estimatedTokens ?? 0))
  }

  /** The compactions, defaulting to the empty list React's default gives. */
  protected compactionList(): ContextCompaction[] {
    return this.compactions ?? []
  }

  /**
   * A row's estimate cell: the localized token count, plus the unknown mark.
   * @param category - The row's category.
   * @returns The cell text.
   */
  protected estimateCell(category: ContextCategory): string {
    return `${category.estimatedTokens?.toLocaleString() ?? '—'}${
      category.unknownItems > 0 ? ' + ?' : ''
    }`
  }

  /**
   * A row's share cell: the percent, or the em-dash when unknown.
   * @param category - The row's category.
   * @returns The cell text.
   */
  protected shareCell(category: ContextCategory): string {
    return category.percent == null ? '—' : `${category.percent}%`
  }

  /**
   * A row's localized category name.
   * @param id - The category id.
   * @returns The localized name.
   */
  protected categoryLabelOf(id: Parameters<typeof contextCategoryLabel>[1]): string {
    void this.locale()
    return contextCategoryLabel(this.t, id)
  }

  /**
   * A completed compaction's line (React's compaction interpolation).
   * @param event - The compaction event.
   * @returns The localized line.
   */
  protected compactionText(event: ContextCompaction): string {
    void this.locale()
    return this.t(
      'ide.chat.context.compaction',
      {
        at: new Date(event.at).toLocaleTimeString(),
        before: event.beforeChars.toLocaleString(),
        after: event.afterChars.toLocaleString(),
        seconds: Math.round(event.elapsedMs / 1000),
      },
      { defaultValue: '{{at}} · {{before}} → {{after}} characters · {{seconds}}s' },
    )
  }

  /** The summary rows' class list. */
  protected summaryClass(): string {
    return this.cm.flex({ direction: 'col', gap: 'sm' })
  }

  /** The summary header row's class list. */
  protected headerClass(): string {
    return this.cm.flex({ justify: 'between', align: 'center', gap: 'md' })
  }

  /** The muted xs line's class list. */
  protected mutedXs(): string {
    return this.cm.cn(this.cm.textMuted, this.cm.textSize('xs'))
  }

  /** The muted sm line's class list. */
  protected mutedSm(): string {
    return this.cm.cn(this.cm.textMuted, this.cm.textSize('sm'))
  }

  /** The action row's class list. */
  protected actionRowClass(): string {
    return this.cm.flex({ gap: 'sm', wrap: 'wrap' })
  }

  /** The refresh/settings buttons' class list. */
  protected secondaryAction(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'outline', color: 'secondary', size: 'sm' }),
      this.cm.touchTargetCompact,
    )
  }

  /** The trigger button's class list. */
  protected triggerClass(): string {
    return this.cm.cn(this.cm.button({ variant: 'ghost', size: 'xs' }), this.cm.touchTarget)
  }

  /** The semibold heading's class list. */
  protected semibold(): string {
    return this.cm.fontWeight('semibold')
  }

  /** The details hint's class list. */
  protected hintClass(): string {
    return this.cm.cn(this.cm.textMuted, this.cm.textSize('xs'))
  }

  /** The tooltip content wrapper's class list. */
  protected contentClass(): string {
    return this.cm.flex({ direction: 'col', gap: 'md' })
  }

  /** The modal body's class list. */
  protected modalBodyClass(): string {
    return this.cm.flex({ direction: 'col', gap: 'lg' })
  }

  /** The modal section's class list. */
  protected cardClass(): string {
    return this.cm.card({ variant: 'outline' })
  }

  /** The composition section's class list. */
  protected compositionClass(): string {
    return this.cm.flex({ direction: 'col', gap: 'sm' })
  }

  /** The summary's token line: the input over the limit, bare. */
  protected tokensText(): string {
    return `${formatTokenCount(this.usage.inputTokens)} / ${formatTokenCount(this.limit())}`
  }

  /** The token unit's localized word. */
  protected tokenUnit(): string {
    void this.locale()
    return this.t('ide.chat.context.tokenUnit', undefined, { defaultValue: 'tokens' })
  }

  /** The headroom line's localized text. */
  protected headroomText(): string {
    void this.locale()
    return this.t(
      'ide.chat.context.headroom',
      { tokens: formatTokenCount(Math.max(0, this.limit() - this.usage.inputTokens)) },
      { defaultValue: '{{tokens}} tokens of headroom' },
    )
  }

  /** The details hint's localized text. */
  protected openDetailsText(): string {
    void this.locale()
    return this.t('ide.chat.context.openDetails', undefined, {
      defaultValue: 'Click for breakdown, history and settings',
    })
  }

  /** The refresh button's localized label. */
  protected refreshLabel(): string {
    void this.locale()
    return this.t('ide.chat.context.refresh', undefined, { defaultValue: 'Refresh usage' })
  }

  /** The settings button's localized label. */
  protected settingsLabel(): string {
    void this.locale()
    return this.t('ide.chat.context.settings', undefined, { defaultValue: 'Chat settings' })
  }

  /** The target help line's localized text. */
  protected targetHelpText(): string {
    void this.locale()
    return this.t('ide.chat.context.targetHelp', undefined, {
      defaultValue:
        'Compaction is scheduled around this target; progress can continue while the summary is prepared.',
    })
  }

  /** The model window line's localized text. */
  protected windowSizeText(): string {
    void this.locale()
    return this.t(
      'ide.chat.context.windowSize',
      { tokens: formatTokenCount(this.usage.contextWindow) },
      { defaultValue: 'Model context window: {{tokens}} tokens.' },
    )
  }

  /** The breakdown heading's localized label. */
  protected breakdownLabel(): string {
    void this.locale()
    return this.t('ide.chat.context.breakdown', undefined, { defaultValue: 'Request composition' })
  }

  /** The provider-reported input line's localized text. */
  protected actualText(): string {
    void this.locale()
    const composition = this.usage.composition
    return this.t(
      'ide.chat.context.actual',
      { tokens: composition!.actualInputTokens!.toLocaleString() },
      { defaultValue: 'Provider-reported input: {{tokens}} tokens (including cached input).' },
    )
  }

  /** The pending-provider line's localized text. */
  protected pendingText(): string {
    void this.locale()
    return this.t('ide.chat.context.pending', undefined, {
      defaultValue: 'Provider usage is pending; current token counts are estimates.',
    })
  }

  /** The known-text estimate line's localized text. */
  protected estimateText(): string {
    void this.locale()
    const composition = this.usage.composition
    return this.t(
      'ide.chat.context.estimate',
      {
        tokens: composition!.estimatedTokens.toLocaleString(),
        bytes: composition!.totalBytes.toLocaleString(),
        chars: composition!.totalChars.toLocaleString(),
      },
      {
        defaultValue:
          'Known text estimate: {{tokens}} tokens. Request: {{chars}} characters / {{bytes}} bytes. Shares describe estimated tokens, not billed allocation.',
      },
    )
  }

  /** The unknown-cost line's localized text. */
  protected unknownText(): string {
    void this.locale()
    return this.t('ide.chat.context.unknown', undefined, {
      defaultValue:
        'Some image, attachment, or unmeasurable content has an unknown token cost and is excluded from estimated shares.',
    })
  }

  /** The table headers' localized labels. */
  protected categoryLabel(): string {
    void this.locale()
    return this.t('ide.chat.context.category', undefined, { defaultValue: 'Category' })
  }

  /** The token column's localized label. */
  protected tokensLabel(): string {
    void this.locale()
    return this.t('ide.chat.context.tokens', undefined, { defaultValue: 'Est. tokens' })
  }

  /** The share column's localized label. */
  protected shareLabel(): string {
    void this.locale()
    return this.t('ide.chat.context.share', undefined, { defaultValue: 'Share' })
  }

  /** The bytes column's localized label. */
  protected bytesLabel(): string {
    void this.locale()
    return this.t('ide.chat.context.bytes', undefined, { defaultValue: 'Bytes' })
  }

  /**
   * The history caption's localized text.
   * @param count - The sample count.
   * @returns The localized caption.
   */
  protected historyLabel(count: number): string {
    void this.locale()
    return this.t(
      'ide.chat.context.history',
      { count },
      { defaultValue: 'Context over time · {{count}} requests' },
    )
  }

  /** The chart's localized aria label. */
  protected chartLabel(): string {
    void this.locale()
    return this.t('ide.chat.context.chart', undefined, {
      defaultValue: 'Input tokens over time; dashed line marks the current target',
    })
  }

  /** The compactions summary's localized text. */
  protected compactionsLabel(): string {
    void this.locale()
    return this.t(
      'ide.chat.context.compactions',
      { count: this.compactionList().length },
      { defaultValue: 'Completed compactions: {{count}}' },
    )
  }
}
