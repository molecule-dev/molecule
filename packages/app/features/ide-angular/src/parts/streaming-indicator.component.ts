/**
 * Streaming indicator — animated molecule spinner with rotating status
 * messages. Replaces the blinking block cursor during AI response streaming.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `StreamingIndicator` (see
 * that file for the design notes): the same inputs (React prop names), the
 * same DOM for the same input. A real, non-empty `label` takes over from the
 * rotating phrases; `startedAt` adds a live `m:ss` elapsed timer (tenths while
 * the wait is short); `tokens` adds the estimated-output counter whose tooltip
 * carries the output-only qualifier. `inline` renders the spinner alone, as a
 * compact cursor replacement. The component is a part (React renders it inside
 * ChatPanel without exporting it), so it lives in `src/parts/` and is exported
 * under the React name.
 *
 * React's root element is a `<span>` for `inline` and a `<div role="status">`
 * otherwise, so the template's element renders in front of the host
 * (`placeContentBefore`) and the host leaves the DOM: the rendered tree is
 * React's, with no wrapper element of its own. The spinner SVG is the
 * platform's single mark (`moleculeSpinnerMarkSvg` from `@molecule/app-ui`),
 * written into the element's `innerHTML` (the bond is the trust boundary, the
 * same injection React's `dangerouslySetInnerHTML` makes — Angular's own
 * template sanitizer would strip the SMIL animation). All styling is inline
 * through `styleText`, serialized the way React writes numbers (13 → `13px`,
 * `opacity`/`flexShrink` stay unitless): React's component reads no ClassMap
 * classes.
 *
 * @module
 */

import type { OnChanges, SimpleChanges } from '@angular/core'
import { Component, DestroyRef, ElementRef, inject, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import { moleculeSpinnerMarkSvg } from '@molecule/app-ui'
import { styleText, Tooltip } from '@molecule/app-ui-angular'

import { useNarrowViewport } from '../hooks/useViewport.js'

/**
 * Molecule-themed status phrases, in rotation order. The agent, Synthase, is
 * named after ATP synthase — the enzyme that synthesizes the cell's energy —
 * so the spinner rotates through a biochemical reaction (synthesize → analyze
 * structure → trace pathway → compose → react → catalyze → bond → crystallize)
 * instead of generic "Thinking…/Working…". The keys are unchanged so the
 * existing per-locale translations stay valid — the theme is an English
 * flourish in these defaults (the same convention the preview phrases use).
 */
const MESSAGES: ReadonlyArray<{ key: string; defaultValue: string }> = [
  { key: 'ide.chat.streaming.thinking', defaultValue: 'Synthesizing...' },
  { key: 'ide.chat.streaming.analyzing', defaultValue: 'Analyzing the structure...' },
  { key: 'ide.chat.streaming.reasoning', defaultValue: 'Tracing the pathway...' },
  { key: 'ide.chat.streaming.crafting', defaultValue: 'Composing the response...' },
  { key: 'ide.chat.streaming.working', defaultValue: 'Reacting to your request...' },
  { key: 'ide.chat.streaming.processing', defaultValue: 'Catalyzing...' },
  { key: 'ide.chat.streaming.connecting', defaultValue: 'Bonding the concepts...' },
  { key: 'ide.chat.streaming.almostThere', defaultValue: 'Crystallizing the answer...' },
]

/** Milliseconds one status phrase stays on screen before the next replaces it. */
const ROTATE_INTERVAL_MS = 3000

/**
 * Minimum estimated tokens before the counter is shown. Below this the number
 * is noise — e.g. a `set_mode` tool input is ~4 tokens, which looked silly
 * flashing at the plan switch. Real generation crosses this within a fraction
 * of a second, so the counter still appears effectively immediately.
 */
const MIN_TOKENS_SHOWN = 20

/**
 * Format elapsed milliseconds as `m:ss` (or `s.s` under 10s for liveliness).
 * @param ms - Elapsed time in milliseconds.
 * @returns The formatted elapsed string.
 */
function formatElapsed(ms: number): string {
  const totalSec = ms / 1000
  if (totalSec < 10) return `${totalSec.toFixed(1)}s`
  const sec = Math.floor(totalSec)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/**
 * Format a token count compactly (e.g. 1234 → "1.2k").
 * @param n - The token count.
 * @returns The compact string.
 */
function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1)}k`
}

/** One-up counter so every instance's gradient id is unique on a page. */
let spinnerSequence = 0

/**
 * The component's inline-style texts that never change, serialized once with
 * `styleText` (the conformance normalizer sorts declarations, so key order is
 * free).
 */
const STYLES = {
  /** The `inline` spinner wrapper and the row's spinner wrapper. */
  spinner: styleText({ display: 'inline-flex', flexShrink: 0 }),
  /** The full row: a flex line, full width, nothing clipped. */
  row: styleText({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    // The px is spelled (the attribute is not re-parsed the way a set
    // property is), and `minWidth` spells its `px` too — React adds it.
    padding: '6px 0px',
    width: '100%',
    minWidth: 0,
  }),
  /** The status label: small, italic, dimmed, one clipped line. */
  label: styleText({
    fontSize: 13,
    opacity: 0.7,
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  /** The right-hand metrics group: timer, token estimate, separator. */
  metrics: styleText({
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '8px',
    fontSize: 13,
    opacity: 0.7,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }),
} as const

/**
 * Animated streaming indicator with molecule spinner. Shows the real current
 * activity (when `label` is passed) plus a live elapsed timer (when
 * `startedAt` is passed); otherwise rotates generic status messages. Pass
 * `inline` for a compact cursor replacement inside flowing text. React
 * renders it under the React name `StreamingIndicator` (this class's name).
 */
@Component({
  selector: 'div[mol-streaming-indicator]',
  standalone: true,
  imports: [Tooltip],
  // The inputs are declared as plain fields listed here: this package's
  // partially-compiled JIT linking does not register `input()` signal inputs
  // (reflectComponentType sees none, so the conformance host cannot bind
  // them) — every component in the package takes the decorator form.
  inputs: ['inline', 'label', 'startedAt', 'tokens'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `@if (inline) {<span #spinnerInline [attr.style]="s.spinner"></span>} @else {<div role="status" [attr.aria-label]="text()" [attr.style]="s.row"><span #spinnerRow [attr.style]="s.spinner"></span><span [attr.style]="s.label">{{ text() }}</span>@if (elapsed() || showTokens()) {<span aria-hidden="true" [attr.style]="s.metrics">@if (showTokens()) {<mol-tooltip placement="top"><span>{{ tokensText() }}</span><ng-container ngProjectAs="[slot=content]">{{ hint() }}</ng-container></mol-tooltip>}@if (showTokens() && elapsed()) {<span>·</span>}@if (elapsed()) {<span>{{ elapsed() }}</span>}</span>}</div>}`,
})
export class StreamingIndicator implements OnChanges {
  /** When true, renders only the spinner inline (no message text). */
  inline = false

  /**
   * Real current-activity label (e.g. "Reading src/App.tsx", "Writing the
   * plan"). When provided, it replaces the generic rotating messages so the
   * user sees what's actually happening. Falls back to rotation when absent.
   */
  label: string | undefined = undefined

  /**
   * Turn start timestamp (ms). When provided, a live `m:ss` elapsed counter
   * ticks beside the label so it's unambiguous the response is still alive
   * (vs. a frozen spinner) even during long model-latency gaps.
   */
  startedAt: number | undefined = undefined

  /**
   * Estimated OUTPUT tokens generated so far this turn — assistant text,
   * thinking, and tool-call arguments, at ~4 chars/token. When > 0, shown
   * beside the timer so the user can see how much work is actually being
   * done. Deliberately not a total: it excludes every input token, and an
   * agentic turn re-sends the whole conversation on each iteration, so the
   * provider's own dashboard will read far higher. That is not a discrepancy
   * — it is a different measure, which the tooltip states (the visible label
   * stays the plain unit to keep the row narrow).
   */
  tokens: number | null | undefined = undefined

  /** The bonded translation function (re-renders on a locale switch). */
  protected readonly t = useTranslation().t

  /** Whether the viewport is phone-width (drops the token estimate). */
  private readonly narrow = useNarrowViewport()

  /**
   * The gradient id is unique per instance — two svgs sharing one id
   * cross-reference each other's gradients (the spinner mark's own warning).
   */
  private readonly gradientId = `mol-stream-spinner-${(spinnerSequence++).toString(36)}`

  /** React's `useState` seed: the rotation's phrase index. */
  private readonly msgIdx = signal(0)

  /** React's `useState` seed: the clock the elapsed timer reads. */
  private readonly now = signal(Date.now())

  /** The armed generic-phrase rotation interval, or null. */
  private rotationTimer: ReturnType<typeof setInterval> | null = null

  /** The armed elapsed-clock interval, or null. */
  private tickerTimer: ReturnType<typeof setInterval> | null = null

  /** The cadence the armed elapsed-clock interval runs at. */
  private tickerCadence = 0

  /** The `inline` spinner wrapper, when that branch is shown. */
  @ViewChild('spinnerInline')
  private spinnerInline?: ElementRef<HTMLSpanElement>

  /** The full row's spinner wrapper, when that branch is shown. */
  @ViewChild('spinnerRow')
  private spinnerRow?: ElementRef<HTMLSpanElement>

  /** The static style texts. */
  protected readonly s = STYLES

  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the spinner `<span>` (inline) or the status row `<div>`:
    // the template's element renders in front of the host, which stays out of
    // the DOM.
    usePlacement(() => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
    // React's two mount effects start their intervals on the first render and
    // re-subscribe when their dependencies change (a new `startedAt` restarts
    // the elapsed clock's phase, exactly as React's effect cleanup/setup does).
    this.startRotation()
    this.startTicker()
    inject(DestroyRef).onDestroy(() => {
      this.stopRotation()
      this.stopTicker()
    })
  }

  /**
   * React's effect dependencies for the two intervals — `[inline, hasLabel]`
   * for the rotation and `[inline, startedAt, tickFast]` for the clock — are
   * plain inputs here, so a bound change re-runs the effect's setup.
   *
   * @param changes - The inputs that changed since the previous pass.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inline'] || changes['label']) this.startRotation()
    if (changes['inline'] || changes['startedAt']) this.startTicker()
  }

  /** Whether a real, non-blank label takes over from the rotating phrases. */
  private hasLabel(): boolean {
    const label = this.label
    return label != null && label.trim() !== ''
  }

  /** Starts (or restarts) React's rotating generic-phrase interval. */
  private startRotation(): void {
    this.stopRotation()
    if (this.inline || this.hasLabel()) return
    this.rotationTimer = setInterval(() => {
      if (this.inline || this.hasLabel()) return
      this.msgIdx.update((prev) => (prev + 1) % MESSAGES.length)
    }, ROTATE_INTERVAL_MS)
  }

  /** Clears the rotation interval, when one runs. */
  private stopRotation(): void {
    if (this.rotationTimer) clearInterval(this.rotationTimer)
    this.rotationTimer = null
  }

  /**
   * Starts (or restarts) React's elapsed-clock interval at the cadence the
   * current elapsed time calls for — sub-second under ten seconds, then once a
   * second (React re-subscribes when that flips).
   */
  private startTicker(): void {
    this.stopTicker()
    if (this.inline || this.startedAt === undefined) return
    const cadence = this.timerCadenceMs()
    this.tickerCadence = cadence
    this.tickerTimer = setInterval(() => {
      if (this.inline || this.startedAt === undefined) return
      this.now.set(Date.now())
      // Crossing ten seconds flips React's cadence and re-subscribes its effect.
      if (this.timerCadenceMs() !== this.tickerCadence) this.startTicker()
    }, cadence)
  }

  /** Clears the elapsed-clock interval, when one runs. */
  private stopTicker(): void {
    if (this.tickerTimer) clearInterval(this.tickerTimer)
    this.tickerTimer = null
  }

  /**
   * Injects the spinner mark after the view settles. The wrappers swap with
   * the `inline` branch, so this re-runs on every view check and writes into
   * whichever wrapper the current branch rendered (Angular's template
   * sanitizer would strip the SMIL animation, so the markup is injected
   * directly — the bond is the trust boundary).
   */
  ngAfterViewChecked(): void {
    this.writeSpinner(this.spinnerInline, 14)
    this.writeSpinner(this.spinnerRow, 16)
  }

  /**
   * Elapsed milliseconds since the turn started, clamped at zero (the clock
   * can lag a fresh turn by a tick).
   * @returns Milliseconds, never negative.
   */
  private elapsedMs(): number {
    const startedAt = this.startedAt
    return startedAt !== undefined ? Math.max(0, this.now() - startedAt) : 0
  }

  /**
   * The timer's tick cadence at mount: sub-second while the wait is short,
   * once a second past ten seconds. Evaluated once (see the constructor).
   * @returns Milliseconds between ticks.
   */
  private timerCadenceMs(): number {
    return this.startedAt !== undefined && this.elapsedMs() < 10_000 ? 100 : 1000
  }

  /**
   * The status line's text: the real label, or the phrase in rotation.
   * @returns The translated text.
   */
  protected text(): string {
    const label = this.label
    if (this.hasLabel() && label) return label
    const generic = MESSAGES[this.msgIdx()]!
    return this.t(generic.key, undefined, { defaultValue: generic.defaultValue })
  }

  /**
   * The elapsed timer's text, when a turn start was supplied.
   * @returns `m:ss` (or `s.s` under 10s), or null for no timer.
   */
  protected elapsed(): string | null {
    return this.startedAt !== undefined ? formatElapsed(this.elapsedMs()) : null
  }

  /**
   * Whether the token estimate shows (real generation, and a viewport wide
   * enough that the label keeps its room).
   * @returns True when the counter is worth its 81px.
   */
  protected showTokens(): boolean {
    const tokens = this.tokens
    return !this.narrow() && tokens != null && tokens >= MIN_TOKENS_SHOWN
  }

  /**
   * The token counter's visible label — the plain unit, so the row stays
   * narrow; the tooltip carries the output-only qualifier.
   * @returns The translated count.
   */
  protected tokensText(): string {
    return this.t(
      'ide.chat.streamingOutputTokens',
      { count: formatTokens(this.tokens as number) },
      { defaultValue: '~{{count}} tokens' },
    )
  }

  /**
   * The token counter's tooltip: what the number actually is.
   * @returns The translated hint.
   */
  protected hint(): string {
    return this.t('ide.chat.streamingOutputTokensHint', undefined, {
      defaultValue: 'Estimated output tokens this turn — /cost shows input and cached.',
    })
  }

  /**
   * Injects the spinner mark into one wrapper, when that branch is rendered.
   * @param ref - The wrapper's view ref, or undefined while hidden.
   * @param size - The mark's pixel size.
   */
  private writeSpinner(ref: ElementRef<HTMLSpanElement> | undefined, size: number): void {
    const el = ref?.nativeElement
    if (el && el.innerHTML === '') {
      el.innerHTML = moleculeSpinnerMarkSvg({ size, gradientId: this.gradientId })
    }
  }
}
