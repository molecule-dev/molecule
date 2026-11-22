/**
 * Horizontal scrollable editor tab bar.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `TabBar` (see that file
 * for the design notes): the same inputs (React prop names), the same DOM for
 * the same input, the same callbacks. Each tab shows the file's material
 * icon, its name colored by the highest-priority signal (diagnostics errors,
 * then a deleted status, then warnings, then git status), a dirty bullet, and
 * a hover- or focus-revealed close control (always visible and dimmed on
 * touch-first devices, where neither hover nor the focus reveal applies). A
 * diff tab delays its single click
 * past the double-click window so opening the diff survives the double click
 * that dismissed it — and its second click replaces the pending timer whose
 * leaked predecessor still fires (React's exact timer handling, kept per tab
 * path — React holds one per tab instance, and a path is one instance).
 *
 * The host element is a `div` shell marked `data-parity-unwrap` (React
 * renders NO element at all while no tabs are open, so the real bar `div` is
 * the template's child, exactly the internal group/row components' pattern).
 * Each tab is a `role="presentation"` wrapper holding the `role="tab"` (its
 * ARIA state and the Enter/Space/Delete keyboard path) beside the close
 * control: a tab's children are presentational (`nested-interactive`), and a
 * tablist may own only tabs (`aria-required-children`), so the ✕ is the
 * pointer-user duplicate of Delete and is hidden from the accessibility tree.
 * Enter/leave is bound to `mouseover`/`mouseout` with a related-target check
 * — the boundary pair React derives `onMouseEnter`/`onMouseLeave` from — so a
 * crossing INTO a child (the close control) reads as staying, not leaving.
 * Focus/blur is bound to the bubbling `focusin`/`focusout` — the pair React's
 * synthetic `onFocus`/`onBlur` derive from — so the close control stays
 * revealed while focus is anywhere inside the tab (a keyboard user who tabs
 * to the tab sees what the mouse user sees on hover, WCAG 2.4.7), and the
 * close control's tint lights on its own focus too.
 *
 * Derived values are methods the template reads, so each change-detection
 * pass renders the current state the way React's render does, and the close
 * control's label translates through the binding's `useTranslation()` — it
 * follows the locale the way every other label does. Styling uses
 * `getClassMap()` (`cm.*`); the only inline styles are layout the ClassMap
 * can't express, serialized through `styleText` the way React writes numbers
 * (`16` → `16px`). All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'
import { getIcon } from 'material-file-icons'

import { useThemeMode, useTranslation, type UseTranslationResult } from '@molecule/app-angular'
import type { EditorTab } from '@molecule/app-code-editor'
import type { TabBarProps } from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { useCoarsePointer } from '../hooks/useViewport.js'

/**
 * Resolve filename color based on diagnostics (highest priority) then git status.
 * @param statusColors - Map of git status names to CSS color values.
 * @param diagnosticColors - Map of diagnostic severity to CSS color values.
 * @param diagnostics - Diagnostic counts for the file.
 * @param diagnostics.errors - Number of error-level diagnostics.
 * @param diagnostics.warnings - Number of warning-level diagnostics.
 * @param gitStatus - The git status string (e.g. "modified", "added").
 * @returns The resolved CSS color string, or undefined for default color.
 */
function resolveFileColor(
  statusColors: Record<string, string>,
  diagnosticColors: Record<string, string>,
  diagnostics?: { errors: number; warnings: number },
  gitStatus?: string,
): string | undefined {
  if (diagnostics?.errors) return diagnosticColors.error
  if (gitStatus === 'deleted') return diagnosticColors.deleted
  if (diagnostics?.warnings) return diagnosticColors.warning
  if (gitStatus) return statusColors[gitStatus]
  return undefined
}

// Status colors — dark/light variants for readability

/** Dark-theme filename colors by git status. */
const DARK_STATUS_COLORS: Record<string, string> = {
  modified: '#e2c08d',
  added: '#73c991',
  untracked: '#73c991',
  deleted: '#c74e39',
}

/** Light-theme filename colors by git status. */
const LIGHT_STATUS_COLORS: Record<string, string> = {
  modified: '#8a6010',
  added: '#1a7030',
  untracked: '#1a7030',
  deleted: '#a03020',
}

/** Dark-theme filename colors by diagnostic severity. */
const DARK_DIAGNOSTIC: Record<string, string> = {
  error: '#f14c4c',
  deleted: '#c74e39',
  warning: '#cca700',
}

/** Light-theme filename colors by diagnostic severity. */
const LIGHT_DIAGNOSTIC: Record<string, string> = {
  error: '#c02020',
  deleted: '#a03020',
  warning: '#806000',
}

/** The tab's file name: everything after the last slash, or the whole path. */
const fileName = (tab: EditorTab): string => tab.path.split('/').pop() || tab.path

/** A detached span whose CSSOM serializes colors the way React's writes land. */
let colorProbe: HTMLSpanElement | null = null

/**
 * Normalizes a color value the way the CSSOM serializes it. React writes the
 * color as a CSSOM property (jsdom's parser turns `#hex` into `rgb()` and
 * keeps `var()` as written); the style attribute text this component sets
 * must carry the same serialized DOM, so the value takes the same path.
 * @param value - The color value, or undefined.
 * @returns The normalized value, or undefined.
 */
function normalizedColor(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  colorProbe ??= document.createElement('span')
  colorProbe.style.color = ''
  colorProbe.style.color = value
  return colorProbe.style.color || value
}

/**
 * The tab's file type icon: the file name's material icon injected as the
 * span's children (React's `dangerouslySetInnerHTML`), kept current when the
 * file name changes. Module-local — React renders it inside the tab too.
 */
@Component({
  selector: 'span[mol-tab-file-icon]',
  standalone: true,
  inputs: ['fileName'],
  template: '',
})
class TabFileIcon {
  /** The file name whose icon to inject. */
  fileName = ''

  /** The file name the injected markup is for. */
  private shown = ''

  /** The icon host span. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Re-injects the markup when the file name changed.
   */
  ngDoCheck(): void {
    if (this.shown === this.fileName) return
    this.shown = this.fileName
    this.host.nativeElement.innerHTML = getIcon(this.fileName).svg
  }
}

/**
 * The static inline-style texts (serialized once with `styleText`; React's
 * camelCase numbers become `px` exactly the way React writes them; the
 * conformance normalizer sorts declarations, so key order is free).
 */
const STYLES = {
  /** A tab's file type icon span. */
  icon: styleText({
    display: 'inline-block',
    width: '14px',
    height: '14px',
    flexShrink: 0,
    verticalAlign: 'middle',
  }),
} as const

/**
 * Horizontally scrollable tab bar for open editor files.
 */
@Component({
  selector: 'div[mol-tab-bar]',
  standalone: true,
  imports: [TabFileIcon],
  inputs: [
    'tabs',
    'activeFile',
    'onSelect',
    'onClose',
    'onDoubleClick',
    'fileStatuses',
    'className',
  ],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `@if (tabs.length > 0) {<div [class]="rootClass()"><div #scroll role="tablist" [class]="cm.flex({ direction: 'row', align: 'center' })" [attr.style]="scrollStyle()">@for (tab of tabs; track tab.path) {<div role="presentation" (click)="handleClick(tab)" (dblclick)="handleDoubleClick(tab)" (mouseover)="tabOver(tab, $event)" (mouseout)="tabOut(tab, $event)" (focusin)="tabFocusIn(tab)" (focusout)="tabFocusOut(tab, $event)" [attr.style]="tabStyle()" [class]="tabClass(tab)"><div role="tab" [attr.title]="tab.path" tabindex="0" [attr.aria-selected]="tab.path === activeFile ? 'true' : 'false'" aria-keyshortcuts="Delete" (keydown)="handleKeyDown(tab, $event)" [class]="tabInnerClass()"><span mol-tab-file-icon [fileName]="fileNameOf(tab)" [attr.style]="s.icon"></span><span [attr.style]="nameStyle(tab)">{{ fileNameOf(tab) }}@if (tab.isDirty) {<span [class]="cm.textWarning">{{ ' •' }}</span>}</span></div><button type="button" data-mol-id="tab-close" tabindex="-1" aria-hidden="true" (click)="closeClick(tab, $event)" (mouseover)="closeOver(tab, $event)" (mouseout)="closeOut(tab, $event)" (focusin)="closeFocusIn(tab)" (focusout)="closeFocusOut(tab)" [class]="closeClass()" [attr.style]="closeStyle(tab)" [attr.aria-label]="closeLabel(tab)"><svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg></button></div>}</div></div>}`,
})
export class TabBar {
  /** The open editor tabs. */
  tabs: TabBarProps['tabs'] = []

  /** The active file's path, or null when no file is open. */
  activeFile: string | null = null

  /** Selects a tab. */
  onSelect: (path: string) => void = () => {}

  /** Closes a tab. */
  onClose: (path: string) => void = () => {}

  /** Double-clicks a tab (pinning a preview). */
  onDoubleClick?: (path: string) => void

  /** Maps file path to git status for coloring tab filenames. */
  fileStatuses?: Record<string, string>

  /** Extra classes for the bar. */
  className?: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The static style texts. */
  protected readonly s = STYLES

  /** Reactive translation, read in the injection context. */
  protected readonly i18n: UseTranslationResult = useTranslation()

  /** The translation function for the close control's label. */
  protected readonly t = this.i18n.t

  /** The active theme mode (the filename color tables follow it). */
  protected readonly mode = useThemeMode()

  /** Touch-first device — taller tab, always-visible close target. */
  protected readonly isCoarse = useCoarsePointer()

  /** The scrollable tab strip (the active tab scrolls into view within it). */
  @ViewChild('scroll') protected scroll?: ElementRef<HTMLDivElement>

  /** The shell host element (its content is adopted beside it — see {@link ngDoCheck}). */
  private readonly shell: ElementRef<HTMLElement> = inject(ElementRef)

  /** Whether the pointer is over a tab (the close control reveals for it). */
  protected hovered: Record<string, boolean> = {}

  /**
   * Whether the pointer is over a close control itself (the highlight lights
   * it), or the control has keyboard focus — either lights its tint. React
   * writes the highlight straight onto the element and its re-render
   * (diffing the last vnode) leaves such a write alone; this tab renders it
   * from state — the DOM is identical after every step.
   */
  protected closeHovered: Record<string, boolean> = {}
  protected closeFocused: Record<string, boolean> = {}

  /**
   * Whether focus is inside a tab (the close control stays revealed — React's
   * `closeRevealed`). A keyboard user who tabs to the tab sees what the mouse
   * user sees on hover, WCAG 2.4.7.
   */
  protected closeRevealed: Record<string, boolean> = {}

  /** The pending diff-tab single clicks, per tab path (React's `clickTimerRef`). */
  private readonly clickTimers = new Map<string, ReturnType<typeof setTimeout> | null>()

  /**
   * Adopts the bar beside the shell host (so the shell never appears in a
   * `@focus` path — React renders no element of its own around the bar, and
   * the DOM normalizer unwraps the shell either way), then follows the active
   * tab into view when the active file moved (React's scroll effect). Runs on
   * every change-detection pass, before the template re-reads its bindings.
   */
  ngDoCheck(): void {
    const host = this.shell.nativeElement
    const parent = host.parentNode
    if (parent) {
      for (const node of Array.from(host.childNodes)) parent.insertBefore(node, host)
    }
    if (!this.scroll || !this.activeFile) return
    const tab = this.scroll.nativeElement.querySelector(
      '[aria-selected="true"]',
    ) as HTMLElement | null
    tab?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }

  /**
   * The bar's classes: the no-shrink token, the secondary surface, the bottom
   * border and the host's extra classes, composed exactly as React composes
   * them.
   * @returns The resolved class string.
   */
  protected rootClass(): string {
    return this.cm.cn(this.cm.shrink0, this.cm.surfaceSecondary, this.cm.borderB, this.className)
  }

  /**
   * The tab strip's inline style: horizontally scrollable, no scrollbar and
   * the pointer form's height. React writes `-webkit-overflow-scrolling`
   * through the CSSOM property (jsdom's style parser drops unsupported
   * properties there), so the serialized DOM — the parity contract — carries
   * only the four properties below; the attribute text this binding sets
   * would keep it, so it is not set here.
   * @returns The style attribute text.
   */
  protected scrollStyle(): string {
    return styleText({
      overflowX: 'auto',
      scrollbarWidth: 'none',
      height: this.isCoarse() ? '40px' : '32px',
      overscrollBehaviorX: 'contain',
    }) as string
  }

  /**
   * A tab's inline style: no text selection and the pointer form's height.
   * @returns The style attribute text.
   */
  protected tabStyle(): string {
    return styleText({
      userSelect: 'none',
      height: this.isCoarse() ? '40px' : '32px',
    }) as string
  }

  /**
   * A tab's file name (the module helper, exposed to the template).
   * @param tab - The tab.
   * @returns The file name.
   */
  protected fileNameOf(tab: EditorTab): string {
    return fileName(tab)
  }

  /**
   * A tab's classes: the flex row, the density tokens and the active tint.
   * @param tab - The tab.
   * @returns The resolved class string.
   */
  protected tabClass(tab: EditorTab): string {
    const active = tab.path === this.activeFile
    return this.cm.cn(
      this.cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
      this.cm.sp('px', 3),
      this.cm.textSize('sm'),
      this.cm.shrink0,
      this.cm.cursorPointer,
      this.cm.borderR,
      active && this.cm.surface,
      active && this.cm.borderBPrimary,
    )
  }

  /**
   * A tab's inner element classes: the flex row that lays out the icon and the
   * name. The wrapper carries the tab's chrome (see {@link tabClass}).
   * @returns The resolved class string.
   */
  protected tabInnerClass(): string {
    return this.cm.flex({ direction: 'row', align: 'center', gap: 'xs' })
  }

  /**
   * A tab's filename color: diagnostics errors first, then a deleted status,
   * then warnings, then the git status (diff tabs ignore the live
   * diagnostics — see the React file).
   * @param tab - The tab.
   * @returns The resolved color, or undefined for the default.
   */
  protected fileColor(tab: EditorTab): string | undefined {
    const light = this.mode() === 'light'
    return resolveFileColor(
      light ? LIGHT_STATUS_COLORS : DARK_STATUS_COLORS,
      light ? LIGHT_DIAGNOSTIC : DARK_DIAGNOSTIC,
      tab.isDiff ? undefined : tab.diagnostics,
      this.fileStatuses?.[tab.path],
    )
  }

  /**
   * A tab's name span's inline style: italic for a preview, the status color,
   * the deleted strikethrough.
   * @param tab - The tab.
   * @returns The style attribute text.
   */
  protected nameStyle(tab: EditorTab): string | null {
    return styleText({
      fontStyle: tab.isPreview ? 'italic' : undefined,
      color: normalizedColor(this.fileColor(tab)),
      textDecoration: this.fileStatuses?.[tab.path] === 'deleted' ? 'line-through' : undefined,
    })
  }

  /**
   * The close control's label (React's `t('ide.tabs.close', { fileName }, { defaultValue })`),
   * read through the binding's `useTranslation()` so it follows the locale.
   * @param tab - The tab.
   * @returns The translated label.
   */
  protected closeLabel(tab: EditorTab): string {
    return this.t(
      'ide.tabs.close',
      { fileName: fileName(tab) },
      {
        defaultValue: 'Close {{fileName}}',
      },
    )
  }

  /**
   * The close control's classes.
   * @returns The resolved class string.
   */
  protected closeClass(): string {
    return this.cm.cn(
      this.cm.textMuted,
      this.cm.textSize('xs'),
      this.cm.cursorPointer,
      this.cm.touchTargetCompact,
    )
  }

  /**
   * The close control's inline style: the square 16px button, the glyph
   * centered on both axes, the touch-form size, and the hover- or
   * focus-gated reveal (always visible and dimmed on touch-first devices,
   * where neither hover nor the focus reveal applies).
   * @param tab - The tab.
   * @returns The style attribute text.
   */
  protected closeStyle(tab: EditorTab): string {
    const coarse = this.isCoarse()
    const over = (this.closeHovered[tab.path] ?? false) || (this.closeFocused[tab.path] ?? false)
    return styleText({
      // Square button (equal width/height) with the glyph centered on both
      // axes — no asymmetric padding, so the ✕ sits dead-center in the tab.
      // On touch-first devices neither hover nor the focus reveal applies,
      // so the close is also always visible, dimmed.
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      width: '16px',
      height: '16px',
      // React writes `none` through the CSSOM property, and jsdom's property
      // parser serializes that as `medium` (a border with no style renders as
      // no border either way) — the parity contract is that serialized DOM,
      // and this attribute text must carry the same text.
      border: 'medium',
      padding: 0,
      background: normalizedColor(over ? 'rgba(128,128,128,0.25)' : 'transparent'),
      color: normalizedColor(over ? 'var(--color-foreground, #e0e0e0)' : undefined),
      lineHeight: 1,
      borderRadius: '3px',
      marginLeft: '4px',
      marginRight: coarse ? '-8px' : '-4px',
      opacity: this.hovered[tab.path] || this.closeRevealed[tab.path] ? 1 : coarse ? 0.6 : 0,
      transition: 'opacity 100ms, background 80ms, color 80ms',
    }) as string
  }

  /**
   * The single click: immediate, unless this is a diff tab — then it waits
   * out the double-click window.
   * @param tab - The tab.
   */
  protected handleClick(tab: EditorTab): void {
    if (!tab.isDiff) {
      this.onSelect(tab.path)
      return
    }
    // Delay single-click; cancel if double-click fires first.
    this.clickTimers.set(
      tab.path,
      setTimeout(() => {
        this.clickTimers.set(tab.path, null)
        this.onSelect(tab.path)
      }, 250),
    )
  }

  /**
   * The double click: a diff tab cancels the pending single click first.
   * @param tab - The tab.
   */
  protected handleDoubleClick(tab: EditorTab): void {
    const timer = this.clickTimers.get(tab.path)
    if (tab.isDiff && timer) {
      clearTimeout(timer)
      this.clickTimers.set(tab.path, null)
    }
    this.onDoubleClick?.(tab.path)
  }

  /**
   * The close control's click: it must not select the tab under it.
   * @param tab - The tab.
   * @param event - The native click event.
   */
  protected closeClick(tab: EditorTab, event: MouseEvent): void {
    event.stopPropagation()
    this.onClose(tab.path)
  }

  /**
   * The tab's boundary hover: a `mouseover` whose pointer came from inside
   * the tab (a crossing into the close control) is not an enter.
   * @param tab - The tab.
   * @param event - The native hover event.
   */
  protected tabOver(tab: EditorTab, event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    this.hovered[tab.path] = true
  }

  /**
   * The tab's boundary leave: a `mouseout` whose pointer stayed inside the
   * tab (a crossing into the close control) is not a leave.
   * @param tab - The tab.
   * @param event - The native hover event.
   */
  protected tabOut(tab: EditorTab, event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    this.hovered[tab.path] = false
  }

  /**
   * The close control's hover: a `mouseover` whose pointer came from inside
   * the control is not an enter.
   * @param tab - The tab.
   * @param event - The native hover event.
   */
  protected closeOver(tab: EditorTab, event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    this.closeHovered[tab.path] = true
  }

  /**
   * The close control's hover end.
   * @param tab - The tab.
   * @param event - The native hover event.
   */
  protected closeOut(tab: EditorTab, event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    this.closeHovered[tab.path] = false
  }

  /**
   * The tab's focus reveal: any focus landing inside the tab — the tab itself
   * or its close control, `focusin` bubbles — shows the control.
   * @param tab - The tab.
   */
  protected tabFocusIn(tab: EditorTab): void {
    this.closeRevealed[tab.path] = true
  }

  /**
   * The tab's focus leave: a `focusout` whose next focus target stayed inside
   * the tab (the move to the close control) is not a leave.
   * @param tab - The tab.
   * @param event - The native focus event.
   */
  protected tabFocusOut(tab: EditorTab, event: FocusEvent): void {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    this.closeRevealed[tab.path] = false
  }

  /**
   * The close control's focus tint, the keyboard twin of its hover tint.
   * @param tab - The tab.
   */
  protected closeFocusIn(tab: EditorTab): void {
    this.closeFocused[tab.path] = true
  }

  /**
   * The close control's focus tint end.
   * @param tab - The tab.
   */
  protected closeFocusOut(tab: EditorTab): void {
    this.closeFocused[tab.path] = false
  }

  /**
   * The keyboard selection: Enter or Space selects the focused tab, Delete
   * closes it (the close control is a sibling of the tab, so the tab's Delete
   * key is the keyboard path to closing it).
   * @param tab - The tab.
   * @param event - The key press.
   */
  protected handleKeyDown(tab: EditorTab, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') this.onSelect(tab.path)
    else if (event.key === 'Delete') this.onClose(tab.path)
  }
}
