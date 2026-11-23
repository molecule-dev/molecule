/**
 * The strips stacked above the composer — working plan, background tasks, tests,
 * uncommitted files — are one family. {@link DockStrip} is their shared chrome
 * (hairline top border, chevron, muted label, right-hand actions, indented
 * detail) and {@link StatusMark} is their shared status icon, so they cannot
 * drift apart.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `DockStrip` (see that
 * file for the design notes): the same inputs (React prop names), the same
 * DOM for the same input, the same callbacks. Node-valued inputs (`icon`,
 * `label`, `hint`, `actions`, `detailActions`, `chipLabel`) are templates (or
 * plain text); the strip's detail is the projected content, received by the
 * detail element's own `ng-content` and kept out of the document while the
 * detail is not showing (a conditional slot would leave children
 * unprojected). Inside a work tray ({@link WorkTrayContext}) the chip is a
 * module-local component portalled into the tray's header, and the same
 * detail element moves into the tray's detail element when its section is the
 * open one.
 *
 * The tray's chip stays module-local (React renders its chip internally too).
 * A standalone strip's header row holds real controls, so it is a plain
 * container whose FIRST child is an empty, transparent native disclosure
 * button over it (the row's `data-mol-id` moves to that button); the actions
 * wrapper is `position: relative` so its buttons paint above the overlay and
 * take their own clicks (axe `nested-interactive`). A native button turns
 * Enter and Space into a click itself, so the row carries no keyboard handler.
 * Inputs are declared the way the kit's other Angular feature components
 * declare them — one plain field per React prop, named in the decorator's
 * `inputs` array — and every derived value is a method the template reads, so
 * each change-detection pass renders the current state the way React's render
 * does. Styling uses `getClassMap()` (`cm.*`); the only inline styles are
 * layout the ClassMap can't express, serialized through `styleText` the way
 * React writes numbers (`8` → `8px`).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  type ComponentRef,
  type DoCheck,
  ElementRef,
  inject,
  InjectionToken,
  type OnDestroy,
  type Signal,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core'
import type { SafeHtml } from '@angular/platform-browser'
import { DomSanitizer } from '@angular/platform-browser'

import {
  MolPlacement,
  placeElement,
  setElementPresent,
  type SlotReader,
  useHostPresence,
  usePlacement,
  useThemeMode,
} from '@molecule/app-angular'
import { getClassMap, moleculeSpinnerMarkSvg, type UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

/** The pixel size of a strip's status icon at its default. */
const MARK_SIZE = 16

/**
 * The slots of the one-row work tray (see WorkCard). When a {@link DockStrip}
 * sits inside it, the strip draws a compact chip into `headerEl` and, while it
 * is the open one, its detail into `detailEl` — so every section shares a
 * single row instead of stacking one bar each. The fields are signals so a
 * tray whose open section changes re-renders every strip in it.
 */
export interface WorkTrayValue {
  /** Where the chips go. Null until the tray has mounted. */
  headerEl: Signal<HTMLElement | null>
  /** Where the open section's detail goes. */
  detailEl: Signal<HTMLElement | null>
  /** The open section's `molId`, if any. */
  openId: Signal<string | null>
  /** Open this section (or close it, when it is already the open one). */
  toggle: (id: string) => void
}

/** Provided by the work tray; absent when a strip stands alone. */
export const WorkTrayContext = new InjectionToken<WorkTrayValue | null>(
  'DockStrip.WorkTrayContext',
  { factory: () => null },
)

/** The states a strip row can be in. */
export type StatusMarkState = 'done' | 'active' | 'todo' | 'failed' | 'waiting' | 'stopped'

/** Next gradient id for a status mark's spinner (unique per instance). */
let statusMarkSeq = 0

/**
 * The strip's inline styles, serialized the way React writes them.
 *
 * @param state - The row's state.
 * @param size - The pixel size.
 * @param isLight - Light theme.
 * @returns The `style` attribute text for the state's span.
 */
function statusMarkStyle(state: StatusMarkState, size: number, isLight: boolean): string | null {
  // The colours spell React's DOM: a style PROPERTY write normalizes hex to
  // `rgb()`, and this text lands as a `style` ATTRIBUTE the snapshot reads
  // verbatim — so each hex is written in its normalized form up front.
  if (state === 'active') {
    return styleText({ display: 'inline-flex', flexShrink: 0 })
  }
  if (state === 'todo') {
    return styleText({
      display: 'inline-block',
      flexShrink: 0,
      boxSizing: 'border-box',
      width: size,
      height: size,
      borderRadius: '50%',
      border: `1.5px solid ${isLight ? 'rgb(175, 184, 193)' : 'rgb(110, 118, 129)'}`,
    })
  }
  if (state === 'waiting' || state === 'stopped') {
    // Not running: a still ring that says why — a question mark when the
    // person has to answer, a dash when the work simply stopped.
    const ink =
      state === 'waiting'
        ? isLight
          ? 'rgb(154, 103, 0)'
          : 'rgb(227, 179, 65)'
        : isLight
          ? 'rgb(110, 119, 129)'
          : 'rgb(139, 148, 158)'
    return styleText({
      display: 'inline-flex',
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      width: size,
      height: size,
      borderRadius: '50%',
      border: `1px solid ${ink}`,
      color: ink,
      fontSize: size * 0.7,
      fontWeight: 700,
      lineHeight: 1,
    })
  }
  const failed = state === 'failed'
  const ink = failed
    ? isLight
      ? 'rgb(207, 34, 46)'
      : 'rgb(244, 112, 103)'
    : isLight
      ? 'rgb(30, 122, 0)'
      : 'rgb(91, 185, 140)'
  const tint = failed
    ? isLight
      ? 'rgba(207, 34, 46, 0.1)'
      : 'rgba(244, 112, 103, 0.16)'
    : isLight
      ? 'rgba(30, 122, 0, 0.12)'
      : 'rgba(91, 185, 140, 0.16)'
  return styleText({
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    width: size,
    height: size,
    borderRadius: '50%',
    border: `1px solid ${ink}`,
    color: ink,
    background: tint,
  })
}

/**
 * One status icon for every strip row: the landing page's green check circle
 * when done, the platform's molecule spinner while active, a red crossed
 * circle when failed, an empty ring when still to do.
 */
@Component({
  selector: 'span[mol-dock-strip-status-mark]',
  standalone: true,
  inputs: ['state', 'size'],
  host: {
    'aria-hidden': 'true',
    '[attr.style]': 'hostStyle()',
    // The spinner's own markup, or the glyph and check/cross for the other
    // states (the host IS React's span; the sanitizer's rest is app-internal
    // markup this component builds itself).
    '[innerHTML]': 'hostHtml()',
  },
  template: '',
})
export class StatusMark {
  /** The row's state. */
  state!: StatusMarkState

  /** Pixel size (default 16). */
  size?: number

  private readonly sanitizer = inject(DomSanitizer)
  private readonly mode = useThemeMode()

  /**
   * Renders the span's content: the platform's spinner while active, the
   * glyph, or the check/cross svg.
   *
   * @returns Trusted HTML for the span's content (empty when none).
   */
  protected hostHtml(): SafeHtml | string | null {
    const size = this.size ?? MARK_SIZE
    if (this.state === 'active') {
      const gradientId = `mol-mark-spinner-${statusMarkSeq++}`
      return this.sanitizer.bypassSecurityTrustHtml(moleculeSpinnerMarkSvg({ size, gradientId }))
    }
    if (this.state === 'waiting') return '?'
    if (this.state === 'stopped') return '–'
    if (this.state !== 'done' && this.state !== 'failed') return null
    const failed = this.state === 'failed'
    const path = failed ? 'M2.5 2.5 7.5 7.5M7.5 2.5 2.5 7.5' : 'M2 5.2 4 7.2 8 3'
    // Trusted the same way the spinner's markup is: a plain string would go
    // through the template sanitizer, which strips the svg whole.
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg width="${size * 0.56}" height="${size * 0.56}" viewBox="0 0 10 10" fill="none"` +
        ` stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
        `<path d="${path}"></path></svg>`,
    )
  }

  /**
   * The span's inline style for its state (light/dark theme read at render).
   *
   * @returns The `style` attribute text.
   */
  protected hostStyle(): string | null {
    return statusMarkStyle(this.state, this.size ?? MARK_SIZE, this.mode() === 'light')
  }
}

/** Props for {@link DockStrip} — the React prop names, React's own contract. */
export interface DockStripProps {
  /** `data-mol-id` of the strip root. */
  molId: string
  /** `data-mol-id` of the header row's overlay disclosure button. */
  toggleMolId?: string
  /** Whether the detail is shown. */
  expanded: boolean
  /** Toggle the detail. */
  onToggle: () => void
  /** Open a full view directly instead of disclosing inline detail. */
  onActivate?: () => void
  /** Leading icon, before the label. */
  icon?: TemplateRef<unknown> | string
  /** The strip's one-line summary. */
  label: TemplateRef<unknown> | string
  /** Use an icon-only disclosure when the adjacent action already carries the summary. */
  hideLabel?: boolean
  /** A shorter label for the tray chip (defaults to `label`). */
  chipLabel?: TemplateRef<unknown> | string
  /** Hover text for the tray chip. */
  chipTitle?: string
  /** Quieter text after the label (the thing in flight). */
  hint?: TemplateRef<unknown> | string
  /** Right-hand readout and action buttons; they sit above the disclosure overlay and take their own clicks. */
  actions?: TemplateRef<unknown> | string
  /** Secondary actions: at the top of the open detail in the tray, beside `actions` when standalone. */
  detailActions?: TemplateRef<unknown> | string
  /** Extra attributes for the root (e.g. a tone `data-*`). */
  rootProps?: Record<string, string>
  /** The detail shown when expanded (the projected content). */
  children?: Node[]
}

/**
 * The strip's inline styles, serialized through `styleText` once.
 */
const s = {
  /** The root's top hairline and inset. */
  root: styleText({
    borderTop: '1px solid rgba(128, 128, 128, 0.15)',
    padding: '8px 8px 8px 10px',
  }),
  /** The header row. */
  row: styleText({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    cursor: 'pointer',
  }),
  /** The row's leading side (chevron, icon, label, hint). */
  leading: styleText({ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }),
  /**
   * The disclosure chevron, rotated with the expanded state.
   *
   * @param expanded - Whether the detail is shown.
   * @returns The `style` attribute text.
   */
  chevron: (expanded: boolean): string | null =>
    styleText({
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 120ms',
      opacity: 0.5,
      flexShrink: 0,
    }),
  /** The muted, truncating label and hint text. */
  ellipsis: styleText({ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
  /** The hint, quieter than the label. */
  hint: styleText({
    opacity: 0.75,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
  }),
  /** The right-hand actions row. */
  side: styleText({ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }),
  /** The standalone detail's indent. */
  detail: styleText({ marginTop: 6, paddingLeft: 18 }),
  /** The transparent overlay disclosure button (the row is its containing block). */
  overlay: styleText({ background: 'transparent', border: 'medium', padding: 0 }),
  /** The tray chip's root row. */
  chipRoot: styleText({ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }),
  /**
   * The tray chip's button, opening or open.
   *
   * @param open - Whether this chip's section is the open one.
   * @returns The `style` attribute text.
   */
  chipRow: (open: boolean): string | null =>
    styleText({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
      ...(open ? { boxShadow: 'inset 0 0 0 1px currentColor' } : {}),
    }),
  /** The open detail's inset in the tray. */
  detailPortal: styleText({ padding: '2px 10px 8px' }),
  /** The detail's secondary actions row. */
  detailActions: styleText({ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }),
} as const

/** The row button's classes: a ghost secondary `xs` disclosure, compact. */
const rowClasses = (): string => {
  const cm = getClassMap()
  return cm.cn(
    cm.button({ variant: 'ghost', color: 'secondary', size: 'xs' }),
    cm.touchTargetCompact,
  )
}

/** The label span's classes: muted, at the strip's `xs` scale. */
const labelClasses = (): string => {
  const cm = getClassMap()
  return cm.cn(cm.textMuted, cm.textSize('xs'))
}

/** The standalone row's classes: its chrome plus the containing block for the overlay button. */
const standaloneRowClasses = (): string => {
  const cm = getClassMap()
  return cm.cn(rowClasses(), cm.position('relative'))
}

/** The overlay disclosure button's classes: an absolute full-row hit area. */
const overlayClasses = (): string => {
  const cm = getClassMap()
  return cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)
}

/** Next unique id for a standalone strip's label span (its overlay's accessible name). */
let dockStripSeq = 0

/**
 * Whether a node input holds a template (a node value) rather than plain text.
 *
 * @param value - The input.
 * @returns True when it renders through a template.
 */
function isTpl(value: unknown): value is TemplateRef<unknown> {
  return value instanceof TemplateRef
}

/**
 * One work-tray chip: the compact chip a strip draws into the tray's header
 * row when it sits inside a tray. Internal to {@link DockStrip}.
 */
@Component({
  selector: 'div[mol-dock-strip-chip]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'molId',
    'toggleMolId',
    'open',
    'hasActivate',
    'hideLabel',
    'ariaLabel',
    'chipTitle',
    'icon',
    'chipLabel',
    'label',
    'actions',
    'rootProps',
    'onChipActivate',
  ],
  host: {
    '[attr.data-mol-id]': 'molId',
    '[attr.style]': 's.chipRoot',
  },
  // prettier-ignore
  template: `<div
      role="button"
      tabindex="0"
      [attr.data-mol-id]="toggleMolId ?? null"
      [attr.aria-expanded]="hasActivate ? null : open ? 'true' : 'false'"
      [attr.aria-label]="ariaLabel ?? null"
      [attr.title]="chipTitle ?? ariaLabel ?? null"
      [class]="rowClasses()"
      [attr.data-state]="open ? 'open' : 'closed'"
      (click)="onChipActivate()"
      (keydown)="onKeydown($event)"
      [attr.style]="s.chipRow(open)">
      @if (icon; as iconNode) {@if (isTpl(iconNode)) {<ng-container [ngTemplateOutlet]="iconNode" />} @else {{{ iconNode }}}}
      @if (hideLabel) {<svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16"><path [attr.d]="open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>} @else {<span [class]="labelClasses()" [attr.style]="s.ellipsis">@if (chipLabel; as chipNode) {@if (isTpl(chipNode)) {<ng-container [ngTemplateOutlet]="chipNode" />} @else {{{ chipNode }}}} @else {@if (isTpl(label)) {<ng-container [ngTemplateOutlet]="label" />} @else {{{ label }}}}</span>}
    </div>
    @if (actions; as actionNode) {@if (isTpl(actionNode)) {<ng-container [ngTemplateOutlet]="actionNode" />} @else {{{ actionNode }}}}`,
})
class DockStripChip implements DoCheck {
  /** `data-mol-id` of the strip. */
  molId!: string

  /** `data-mol-id` of the chip row. */
  toggleMolId?: string

  /** Whether this chip's section is the open one. */
  open = false

  /** Whether the strip opens elsewhere (`onActivate`), so no disclosure. */
  hasActivate = false

  /** Use an icon-only chip when the adjacent action already carries the summary. */
  hideLabel = false

  /** The chip's accessible name, or undefined for none. */
  ariaLabel?: string

  /** Hover text for the chip. */
  chipTitle?: string

  /** Leading icon node. */
  icon?: TemplateRef<unknown> | string

  /** A shorter label for the chip. */
  chipLabel?: TemplateRef<unknown> | string

  /** The strip's label (the chip's default text). */
  label?: TemplateRef<unknown> | string

  /** The strip's right-hand actions. */
  actions?: TemplateRef<unknown> | string

  /** Extra attributes for the chip root (the strip's `rootProps`). */
  rootProps?: Record<string, string>

  /** What a press on the chip does. */
  onChipActivate!: () => void

  protected readonly s = s
  private readonly chipHostEl = inject(ElementRef).nativeElement as HTMLElement
  private readonly appliedRootProps = new Set<string>()

  /** Applies every `rootProps` entry to the chip root, removing stale ones. */
  ngDoCheck(): void {
    const next = this.rootProps ?? {}
    for (const key of [...this.appliedRootProps]) {
      if (!(key in next)) {
        this.chipHostEl.removeAttribute(key)
        this.appliedRootProps.delete(key)
      }
    }
    for (const [key, value] of Object.entries(next)) {
      if (this.chipHostEl.getAttribute(key) !== value) this.chipHostEl.setAttribute(key, value)
      this.appliedRootProps.add(key)
    }
  }

  /**
   * The active ClassMap.
   *
   * @returns The ClassMap.
   */
  protected rowClasses(): string {
    return rowClasses()
  }

  /**
   * The label span's classes.
   *
   * @returns The ClassMap classes.
   */
  protected labelClasses(): string {
    return labelClasses()
  }

  /**
   * Whether an input holds a template.
   *
   * @param value - The input.
   * @returns True for a template.
   */
  protected isTpl(value: unknown): value is TemplateRef<unknown> {
    return isTpl(value)
  }

  /**
   * Acts on a key press the way React's handler does.
   *
   * @param event - The keydown.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.onChipActivate()
    }
  }
}

/**
 * Shared chrome for the strips above the composer.
 */
@Component({
  selector: 'div[mol-dock-strip]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'molId',
    'toggleMolId',
    'expanded',
    'onToggle',
    'onActivate',
    'icon',
    'label',
    'hideLabel',
    'chipLabel',
    'chipTitle',
    'hint',
    'actions',
    'detailActions',
    'rootProps',
  ],
  hostDirectives: [MolPlacement],
  // In a tray React renders no strip element at its place (its chip and detail are portals), so
  // the host is out of the DOM there; standalone, the host IS React's root div.
  host: {
    '[attr.data-mol-id]': 'tray ? null : molId',
    '[attr.style]': 's.root',
  },
  // prettier-ignore
  template: `@if (!tray) {<div
        [class]="standaloneRowClasses()"
        [attr.style]="s.row">
        <button
          type="button"
          [attr.data-mol-id]="toggleMolId ?? null"
          [attr.aria-expanded]="onActivate ? null : expanded ? 'true' : 'false'"
          [attr.aria-labelledby]="hideLabel ? null : labelId"
          [attr.aria-label]="hideLabel ? rowAriaLabel() ?? null : null"
          (click)="onRowClick($event)"
          [class]="overlayClasses()"
          [attr.style]="s.overlay">@if (hideLabel && isTpl(label)) {<span [class]="srOnlyClass()"><ng-container [ngTemplateOutlet]="label" /></span>}</button>
        <div [attr.style]="s.leading">
          @if (!onActivate) {<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" [attr.style]="s.chevron(expanded)"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>}
          @if (icon; as iconNode) {@if (isTpl(iconNode)) {<ng-container [ngTemplateOutlet]="iconNode" />} @else {{{ iconNode }}}}
          @if (!hideLabel) {<span [attr.id]="labelId" [class]="labelClasses()" [attr.style]="s.ellipsis">@if (isTpl(label)) {<ng-container [ngTemplateOutlet]="label" />} @else {{{ label }}}</span>}
          @if (hint; as hintNode) {<span [class]="labelClasses()" [attr.style]="s.hint">@if (isTpl(hintNode)) {<ng-container [ngTemplateOutlet]="hintNode" />} @else {{{ hintNode }}}</span>}
        </div>
        @if (actions || detailActions) {<div [class]="cm.position('relative')" [attr.style]="s.side">@if (actions; as actionNode) {@if (isTpl(actionNode)) {<ng-container [ngTemplateOutlet]="actionNode" />} @else {{{ actionNode }}}}@if (detailActions; as detailNode) {@if (isTpl(detailNode)) {<ng-container [ngTemplateOutlet]="detailNode" />} @else {{{ detailNode }}}}</div>}
      </div>}
<div
      #detailHolder
      hidden
      [attr.data-mol-id]="tray ? molId + '-detail' : null"
      [attr.style]="tray ? s.detailPortal : s.detail">
      @if (tray && detailActions; as detailNode) {<div [attr.style]="s.detailActions">@if (isTpl(detailNode)) {<ng-container [ngTemplateOutlet]="detailNode" />} @else {{{ detailNode }}}</div>}
      <ng-content />
</div>`,
})
export class DockStrip implements DoCheck, OnDestroy {
  /** `data-mol-id` of the strip root. */
  molId!: string

  /** `data-mol-id` of the header row's overlay disclosure button. */
  toggleMolId?: string

  /** Whether the detail is shown. */
  expanded = false

  /** Toggle the detail. */
  onToggle!: () => void

  /** Open a full view directly instead of disclosing inline detail. */
  onActivate?: () => void

  /** Leading icon, before the label. */
  icon?: TemplateRef<unknown> | string

  /** The strip's one-line summary. */
  label!: TemplateRef<unknown> | string

  /** Use an icon-only disclosure when the adjacent action already carries the summary. */
  hideLabel = false

  /** A shorter label for the tray chip (defaults to `label`). */
  chipLabel?: TemplateRef<unknown> | string

  /** Hover text for the tray chip. */
  chipTitle?: string

  /** Quieter text after the label (the thing in flight). */
  hint?: TemplateRef<unknown> | string

  /** Right-hand readout and action buttons; they sit above the disclosure overlay and take their own clicks. */
  actions?: TemplateRef<unknown> | string

  /**
   * Secondary actions: at the top of the open detail in the tray, beside
   * `actions` when standalone.
   */
  detailActions?: TemplateRef<unknown> | string

  /** Extra attributes for the root (e.g. a tone `data-*`). */
  rootProps?: Record<string, string>

  protected readonly s = s
  protected readonly tray = inject(WorkTrayContext)
  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()
  /** Names the standalone overlay disclosure button through `aria-labelledby`. */
  protected readonly labelId = `mol-dock-label-${++dockStripSeq}`
  private readonly vcr = inject(ViewContainerRef)
  private readonly hostEl = inject(ElementRef).nativeElement as HTMLElement
  /**
   * The strip's detail element — the one element whose `<ng-content>`
   * receives the user's projected children — found among the host's children on
   * the first placement run. It is always in the view (a
   * conditional slot would leave children unprojected, and Angular detaches
   * unclaimed content children from the DOM), but out of the document until
   * the detail should show, which {@link syncDetail} keeps in step for both
   * modes.
   */
  private detailHolderEl?: HTMLElement

  /** The tray chip's host, when one is drawn. */
  private chipRef?: ComponentRef<DockStripChip>
  /** The root attributes this component applied from `rootProps`. */
  private readonly appliedRootProps = new Set<string>()

  /**
   * The row's accessible name: the label, but only when it is plain text.
   *
   * @returns The name, or undefined for none.
   */
  protected rowAriaLabel(): string | undefined {
    return this.hideLabel && typeof this.label === 'string' ? this.label : undefined
  }

  /**
   * The active ClassMap's row classes.
   *
   * @returns The class string.
   */
  protected rowClasses(): string {
    return rowClasses()
  }

  /**
   * The standalone row's classes: its chrome plus the overlay's containing block.
   *
   * @returns The class string.
   */
  protected standaloneRowClasses(): string {
    return standaloneRowClasses()
  }

  /**
   * The overlay disclosure button's classes.
   *
   * @returns The class string.
   */
  protected overlayClasses(): string {
    return overlayClasses()
  }

  /**
   * The label span's classes.
   *
   * @returns The class string.
   */
  protected labelClasses(): string {
    return labelClasses()
  }

  /**
   * The ClassMap's visually-hidden utility: a `hideLabel` toggle whose label is
   * a node has no text to name it, so the node renders inside the toggle in a
   * visually hidden wrapper — its text names the button without changing the
   * row's pixels (axe `button-name`).
   *
   * @returns The ClassMap class.
   */
  protected srOnlyClass(): string {
    return this.cm.srOnly
  }

  /**
   * Whether an input holds a template.
   *
   * @param value - The input.
   * @returns True for a template.
   */
  protected isTpl(value: unknown): value is TemplateRef<unknown> {
    return isTpl(value)
  }

  /**
   * Acts on a press the way React's handler does (a row click toggles it,
   * passing the event exactly like React's `onClick={onActivate ?? onToggle}`).
   *
   * @param event - The click event.
   */
  protected onRowClick(event: Event): void {
    const activate: (e?: unknown) => void = this.onActivate ?? this.onToggle
    activate(event)
  }

  /** Keeps the root's extra attributes and the tray chip in step. */
  ngDoCheck(): void {
    this.syncRootProps()
    this.syncTray()
  }

  constructor() {
    // Standalone the host IS React's root div; in a tray React renders no strip
    // element at its place (the chip and the detail are portals).
    useHostPresence(() => this.tray === null)
    // The detail is placed from the placement function: it runs right after
    // Angular changes a node of the detail's slot, when a signal it read
    // changes, and after every render — so the projected children are seen in
    // the pass they land in. The chip's component is created and checked in
    // `ngDoCheck`; only its placement is here, because creating and checking a
    // component inside an after-render write re-marks the application forever
    // (NG0103).
    usePlacement((hasContent) => this.place(hasContent))
  }

  /**
   * Places the tray chip and the detail against React's DOM.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private place(hasContent: SlotReader): void {
    const headerEl = this.tray?.headerEl()
    const chipEl = this.chipRef?.location.nativeElement as HTMLElement | undefined
    if (chipEl && headerEl) placeElement(chipEl, headerEl)
    this.syncDetail(hasContent)
  }

  /** Tears the tray chip down. */
  ngOnDestroy(): void {
    // Put the detail back inside the host so the framework's teardown removes
    // it (and its projected children) with the host, not stranded where it was
    // last shown.
    if (this.detailHolderEl) setElementPresent(this.detailHolderEl, true)
    this.chipRef?.destroy()
  }

  /** Applies every `rootProps` entry to the root, removing stale ones. */
  private syncRootProps(): void {
    const next = this.rootProps ?? {}
    for (const key of [...this.appliedRootProps]) {
      if (!(key in next)) {
        this.hostEl.removeAttribute(key)
        this.appliedRootProps.delete(key)
      }
    }
    for (const [key, value] of Object.entries(next)) {
      if (this.hostEl.getAttribute(key) !== value) this.hostEl.setAttribute(key, value)
      this.appliedRootProps.add(key)
    }
  }

  /** Draws the tray chip, and the open detail under it, into the tray. */
  private syncTray(): void {
    const tray = this.tray
    if (!tray) {
      this.destroyChip()
      return
    }
    const headerEl = tray.headerEl()
    const open = !this.onActivate && tray.openId() === this.molId
    if (!headerEl) {
      this.destroyChip()
      return
    }
    if (!this.chipRef) {
      this.chipRef = this.vcr.createComponent(DockStripChip)
      this.chipRef.changeDetectorRef.detectChanges()
    }
    this.chipRef.setInput('molId', this.molId)
    this.chipRef.setInput('toggleMolId', this.toggleMolId)
    this.chipRef.setInput('open', open)
    this.chipRef.setInput('hasActivate', !!this.onActivate)
    this.chipRef.setInput('hideLabel', this.hideLabel)
    this.chipRef.setInput('ariaLabel', this.rowAriaLabel())
    this.chipRef.setInput('chipTitle', this.chipTitle ?? this.rowAriaLabel())
    this.chipRef.setInput('icon', this.icon)
    this.chipRef.setInput('chipLabel', this.chipLabel)
    this.chipRef.setInput('label', this.label)
    this.chipRef.setInput('actions', this.actions)
    this.chipRef.setInput('rootProps', this.rootProps)
    this.chipRef.setInput('onChipActivate', () => {
      if (this.onActivate) this.onActivate()
      else tray.toggle(this.molId)
    })
    this.chipRef.changeDetectorRef.detectChanges()
  }

  /** Removes the tray chip. */
  private destroyChip(): void {
    if (this.chipRef) {
      this.chipRef.destroy()
      this.chipRef = undefined
    }
  }

  /**
   * Places the detail where the strip's mode needs it: in the tray's detail
   * element when this section is the open one (the tray's chip row lives in
   * the tray's header), otherwise under the row inside the host while it is
   * expanded. Detached from the document the rest of the time — exactly the
   * branches React renders, with the projected children kept alive in the
   * slot for the next open.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncDetail(hasContent: SlotReader): void {
    const holder =
      this.detailHolderEl ??
      (this.hostEl.querySelector(':scope > [hidden]') as HTMLElement | null) ??
      undefined
    if (holder && !this.detailHolderEl) this.detailHolderEl = holder
    if (!holder) return
    if (this.tray) {
      const open = !this.onActivate && this.tray.openId() === this.molId
      const detailEl = this.tray.detailEl()
      const wants =
        open && detailEl != null && (this.detailActions != null || hasContent(this.detailHolderEl))
      if (wants && detailEl) {
        placeElement(holder, detailEl)
        holder.removeAttribute('hidden')
      } else {
        this.hideDetail(holder)
      }
      return
    }
    if (!this.onActivate && this.expanded && hasContent(this.detailHolderEl)) {
      setElementPresent(holder, true)
      holder.removeAttribute('hidden')
    } else {
      this.hideDetail(holder)
    }
  }

  /**
   * Takes the detail out of the document (its projected children stay alive
   * in the slot).
   *
   * @param holder - The detail element.
   */
  private hideDetail(holder: HTMLElement): void {
    // `placeElement` leaves the holder in the tray's detail element while it
    // is shown; bring it back to its own place before hiding it, so it is out
    // of the page rather than left visible where it was last rendered.
    placeElement(holder, null)
    setElementPresent(holder, false)
    holder.setAttribute('hidden', '')
  }
}
