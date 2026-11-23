/**
 * Keyboard shortcuts reference panel — displays all available shortcuts
 * grouped by category with keyboard navigation.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `KeyboardShortcutsPanel`
 * (see that file for the design notes): the same inputs (React prop names),
 * the same DOM for the same input, the same callbacks. Rows are grouped by
 * the entries' category in first-occurrence order, the highlighted row
 * follows the arrow keys and the pointer, Enter runs it, and Escape, the ✕
 * dismiss and the click-away backdrop all call `onDismiss`. The key listener
 * sits on `document` in the capture phase, so the panel hears the keys
 * wherever the focus is.
 *
 * React's component is a fragment of TWO roots (the backdrop and the panel),
 * so the template's nodes render in front of the host (`placeContentBefore`)
 * and the host leaves the DOM: no host element appears in a `@focus` path
 * (React renders no element between the mount wrapper and the two roots).
 * Inputs are declared one plain field per React
 * prop in the decorator's `inputs` array, and every derived value is a method
 * the template reads, so each change-detection pass renders the current state
 * the way React's render does. Styling uses `getClassMap()` (`cm.*`) and the
 * only inline styles are layout the ClassMap can't express — written through
 * `[attr.style]`, whose attribute text lands in the DOM as is, so every
 * declaration is pre-serialized the way React's CSSOM writes it
 * (`480px`, `border: medium`, `flex: 1 1 0%`, spaced `rgba()`). All
 * user-facing text goes through `t()`.
 *
 * @module
 */

import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  type OnDestroy,
  type OnInit,
  signal,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useThemeMode,
  useTranslation,
} from '@molecule/app-angular'
import type { ShortcutEntry } from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * One category's rows and the flat index its first row holds.
 */
interface ShortcutGroup {
  /** The category name (`''` for the uncategorized rows). */
  category: string
  /** The rows in that category, in prop order. */
  entries: ShortcutEntry[]
  /** The flat index of the group's first row (React's render counter). */
  start: number
}

/**
 * The panel's inline-style texts that never change, pre-serialized the way
 * React's CSSOM writes them and the DOM attribute records them (the
 * conformance normalizer sorts declarations, so key order is free).
 */
const STYLES = {
  /** The full-viewport click-away tint behind the panel. */
  backdrop: 'position: fixed; inset: 0px; z-index: 1000; background: rgba(0, 0, 0, 0.4)',
  /** The header row. */
  header:
    'display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; border-bottom: 1px solid var(--color-border, #333); flex-shrink: 0',
  /** The title span. */
  title: 'font-size: 14px; font-weight: 600',
  /** The close ✕'s static style; hover tints it through the DOM, not here. */
  close:
    'display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; border: medium; background: transparent; color: inherit; cursor: pointer; opacity: 0.6; transition: opacity 100ms, background 100ms',
  /** The shortcut list. */
  list: 'flex: 1 1 0%; overflow: auto; padding: 8px 0px',
  /** A category header. */
  category:
    'padding: 8px 16px 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mol-color-text-secondary, #888)',
  /** The key-badge list after a row's label. */
  keys: 'display: flex; gap: 4px; flex-shrink: 0; margin-left: 16px',
  /** The footer hint. */
  footer:
    'padding: 8px 16px; border-top: 1px solid var(--color-border, #333); font-size: 11px; color: var(--mol-color-text-secondary, #888); text-align: center; flex-shrink: 0',
} as const

/**
 * Keyboard shortcuts reference panel.
 */
@Component({
  selector: 'div[mol-keyboard-shortcuts-panel]',
  standalone: true,
  inputs: ['shortcuts', 'onDismiss'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `<div role="presentation" [attr.style]="s.backdrop" (click)="dismissBackdrop($event)"></div><div #panel [attr.tabindex]="-1" [attr.style]="panelStyle()"><div [attr.style]="s.header"><span [attr.style]="s.title">{{ t('ide.shortcuts.title', undefined, { defaultValue: 'Keyboard Shortcuts' }) }}</span><button type="button" data-mol-id="shortcuts-close" (click)="dismissBackdrop($event)" [attr.aria-label]="t('ide.shortcuts.close', undefined, { defaultValue: 'Close' })" [attr.title]="t('ide.shortcuts.close', undefined, { defaultValue: 'Close' })" [class]="cm.cn(cm.touchTarget, cm.shrink0)" [attr.style]="s.close" (mouseenter)="hoverClose($event, true)" (mouseleave)="hoverClose($event, false)"><svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg></button></div><div #list [attr.style]="s.list">@for (group of groups(); track group.category) {<div>@if (group.category) {<div [attr.style]="s.category">{{ group.category }}</div>}@for (entry of group.entries; track entry.label; let j = $index) {<button type="button" [attr.data-shortcut-row]="'true'" [attr.data-mol-id]="'shortcut-row-' + (group.start + j)" (click)="pick(entry)" (mouseenter)="highlight(group.start + j)" [class]="cm.touchTargetCompact" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 16px; font-size: 13px; width: 100%; border: medium; color: var(--mol-color-text, currentColor); text-align: left; border-radius: 0px" [style.cursor]="entry.execute ? 'pointer' : 'default'" [style.background]="rowBackground(group.start + j)"><span>{{ entry.label }}</span><span [attr.style]="s.keys">@for (part of entry.keys.split(' '); track $index) {<kbd [attr.style]="badgeStyle()">{{ part }}</kbd>}</span></button>}</div>}</div><div [attr.style]="s.footer">{{ t('ide.shortcuts.hint', undefined, { defaultValue: 'Arrow keys to navigate · Enter to run · Esc to close' }) }}</div></div>`,
})
export class KeyboardShortcutsPanel implements OnInit, OnDestroy {
  /** List of shortcuts to display. */
  shortcuts: ShortcutEntry[] = []

  /** Called when the panel is dismissed. */
  onDismiss: () => void = () => {}

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The theme mode signal (the tints follow the theme primary). */
  protected readonly mode = useThemeMode()

  /** The static style texts. */
  protected readonly s = STYLES

  /**
   * The highlighted row (the one Enter runs, the one tinted). A signal so a
   * write from the document-level key handler (no Angular event binding
   * surrounds it) still schedules the zoneless change-detection pass.
   */
  protected readonly selectedIndex = signal(0)

  /** The row the `scrollIntoView` last ran for (React's `[selectedIndex]` effect). */
  private scrolledIndex = -1

  /** The host element, for the flattening below. */
  private readonly hostRef: ElementRef<HTMLElement> = inject(ElementRef)

  /** Marks this view for the zoneless change-detection pass a raw listener needs. */
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  /** The document-level capture handler, one identity for add and remove. */
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        this.onDismiss()
        break
      case 'ArrowDown':
        event.preventDefault()
        this.selectedIndex.update((i) => Math.min(i + 1, this.flatEntries().length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        this.selectedIndex.update((i) => Math.max(i - 1, 0))
        break
      case 'Enter': {
        event.preventDefault()
        const entry = this.flatEntries()[this.selectedIndex()]
        if (entry?.execute) {
          entry.execute()
          this.onDismiss()
        }
        break
      }
    }
    this.changeDetectorRef.markForCheck()
  }

  /** The panel element, for the mount focus. */
  @ViewChild('panel') protected panel?: ElementRef<HTMLDivElement>

  /** The list element, for the scroll-into-view. */
  @ViewChild('list') protected list?: ElementRef<HTMLDivElement>

  /**
   * Renders the backdrop and the panel in front of the host and keeps the host
   * out of the DOM, so no host element appears in a `@focus` path (React
   * renders no element between the mount wrapper and the two roots). Nodes a
   * later render re-creates land inside the host first and are placed here.
   */
  private place(): void {
    const host = this.hostRef.nativeElement
    placeContentBefore(host, host)
    setElementPresent(host, false)
  }

  /**
   * Subscribes the document key listener in the capture phase (React's
   * effect), so the panel hears the keys wherever the focus is.
   */
  ngOnInit(): void {
    document.addEventListener('keydown', this.onKeyDown, true)
  }

  /**
   * Focuses the panel after the first render (React's mount effect), so the
   * keyboard works at once. The move runs after the view check: focusing
   * during it would fire the panel's `focusout` listeners while Angular is
   * still checking, and a state change they make would never render.
   */
  constructor() {
    usePlacement(() => this.place())
    afterNextRender(() => this.panel?.nativeElement.focus())
  }

  /**
   * Keeps the selected row scrolled into view (React's effect on
   * `[selectedIndex]`), after the change-detection pass that rendered it.
   */
  ngAfterViewChecked(): void {
    if (this.scrolledIndex === this.selectedIndex()) return
    this.scrolledIndex = this.selectedIndex()
    const buttons = this.list?.nativeElement.querySelectorAll('[data-shortcut-row]')
    const el = buttons?.[this.selectedIndex()] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }

  /** Unsubscribes the document key listener (React's effect cleanup). */
  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.onKeyDown, true)
  }

  /**
   * The rows grouped by category, preserving insertion order, with the flat
   * index each group's first row renders at.
   * @returns The groups, in first-occurrence order.
   */
  protected groups(): ShortcutGroup[] {
    const map = new Map<string, ShortcutEntry[]>()
    for (const entry of this.shortcuts) {
      const cat = entry.category ?? ''
      const list = map.get(cat)
      if (list) {
        list.push(entry)
      } else {
        map.set(cat, [entry])
      }
    }
    const out: ShortcutGroup[] = []
    let start = 0
    for (const [category, entries] of map) {
      out.push({ category, entries, start })
      start += entries.length
    }
    return out
  }

  /**
   * The flat list of entries, for the keyboard navigation indexing.
   * @returns Every entry, in row order.
   */
  protected flatEntries(): ShortcutEntry[] {
    return this.groups().flatMap((group) => group.entries)
  }

  /**
   * The panel's inline style: a fixed, centered column whose surface follows
   * the theme.
   * @returns The style attribute text.
   */
  protected panelStyle(): string | null {
    return this.mode() === 'light'
      ? 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 480px; max-width: 90vw; max-height: 70vh; z-index: 1001; border-radius: 8px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.18); background: rgb(255, 255, 255); border: 1px solid var(--color-border, #333); display: flex; flex-direction: column; outline: none'
      : 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 480px; max-width: 90vw; max-height: 70vh; z-index: 1001; border-radius: 8px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.6); background: var(--mol-color-background, #1e1e1e); border: 1px solid var(--color-border, #333); display: flex; flex-direction: column; outline: none'
  }

  /**
   * The selected-row tint: the theme primary mixed over transparency, denser
   * in the dark theme (React's `selectedBg`).
   * @returns The background value.
   */
  protected selectedBg(): string {
    return this.mode() === 'light'
      ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 12%, transparent)'
      : 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 25%, transparent)'
  }

  /**
   * The badge's inline style for the active theme (React's `KeyBadge` `kbd`).
   * @returns The style attribute text.
   */
  protected badgeStyle(): string | null {
    return this.mode() === 'light'
      ? 'display: inline-block; padding: 2px 6px; font-size: 11px; font-family: system-ui, sans-serif; line-height: 16px; border-radius: 4px; border: 1px solid rgba(0, 0, 0, 0.15); background: rgba(0, 0, 0, 0.05); color: var(--mol-color-text, currentColor); min-width: 20px; text-align: center'
      : 'display: inline-block; padding: 2px 6px; font-size: 11px; font-family: system-ui, sans-serif; line-height: 16px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.08); color: var(--mol-color-text, currentColor); min-width: 20px; text-align: center'
  }

  /**
   * A row's tint through the `[style.background]` binding (the CSSOM, like
   * React's per-property write, whose re-parse is what the DOM records when
   * the tint moves): the theme primary mixed over transparency for the
   * selected row, transparent for the others.
   * @param idx - The row's flat index.
   * @returns The background value.
   */
  protected rowBackground(idx: number): string {
    return idx === this.selectedIndex() ? this.selectedBg() : 'transparent'
  }

  /**
   * Hovering the close ✕ tints it; leaving restores it (React's
   * `onMouseEnter`/`onMouseLeave` on the button).
   * @param event - The pointer event (its target is the button).
   * @param entering - Whether the pointer entered (as opposed to left).
   */
  protected hoverClose(event: Event, entering: boolean): void {
    const el = event.currentTarget as HTMLElement
    el.style.opacity = entering ? '1' : '0.6'
    el.style.background = entering ? 'rgba(128,128,128,0.2)' : 'transparent'
  }

  /**
   * The keyboard navigation over the flat row order lives in the capture
   * handler ({@link onKeyDown}); a row hovered with the pointer becomes the
   * highlighted one (React's `onMouseEnter` per row).
   * @param idx - The hovered row's flat index.
   */
  protected highlight(idx: number): void {
    this.selectedIndex.set(idx)
  }

  /**
   * Selects a row. React wraps the run in an arrow and only acts when the
   * entry has a handler: run it, then dismiss.
   * @param entry - The row's entry.
   */
  protected pick(entry: ShortcutEntry): void {
    if (entry.execute) {
      entry.execute()
      this.onDismiss()
    }
  }

  /**
   * Dismisses through the backdrop and the close ✕. React binds the BARE
   * `onDismiss` reference as their click handler, so the click event itself
   * is the call's argument even though the callback's type takes none (a
   * zero-arg function is assignable to a one-arg handler).
   * @param event - The native click event.
   */
  protected dismissBackdrop(event: Event): void {
    const dismiss: (event: Event) => void = this.onDismiss
    dismiss(event)
  }
}
