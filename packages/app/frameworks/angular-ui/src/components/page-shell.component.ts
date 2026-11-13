/**
 * PageShell component (React parity): authenticated page wrapper with an
 * optional sidebar and top bar.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  Renderer2,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'
import { hasNodes, SlotWrapper } from './button.component.js'

/**
 * PageShell component.
 *
 * The host is the root `<div>` (`div[mol-page-shell]`). `sidebar` and
 * `topbar` are node-valued props projected as `[slot=sidebar]` /
 * `[slot=topbar]`; each wrapper element (`<aside>`, `<header>`) renders only
 * when React would render it (`{sidebar ? … : null}`), implemented by
 * detaching the always-mounted capture element from the DOM.
 *
 * The sidebar toggle button renders only when the caller passed
 * `onSidebarToggle` (React's `{onSidebarToggle ? … : null}`); with an
 * `@Output`, that presence is the output's subscriber count.
 */
@Component({
  selector: 'div[mol-page-shell]',
  standalone: true,
  inputs: ['sidebar', 'topbar', 'sidebarCollapsed', 'className', 'style', 'testId', 'automationId'],
  outputs: ['sidebarToggle'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'automationId',
  },
  template: `<aside #sidebarSlot [class]="sidebarClasses()">
      @if (toggleVisible()) {
        <button
          type="button"
          [class]="cm().pageShellSidebarToggle"
          (click)="sidebarToggle.emit($event)"
          [attr.aria-label]="toggleLabel()"
        >
          {{ sidebarCollapsed ? '▶' : '◀' }}
        </button>
      }
      <ng-content select="[slot=sidebar]"></ng-content>
    </aside>
    <div [class]="cm().flex1">
      <header #topbarSlot [class]="cm().pageShellTopbar">
        <ng-content select="[slot=topbar]"></ng-content>
      </header>
      <main [class]="cm().pageShellContent"><ng-content></ng-content></main>
    </div>`,
})
export class PageShell implements AfterViewInit, DoCheck {
  /** Sidebar content (node-valued prop). */
  sidebar?: unknown
  /** Top bar content (node-valued prop). */
  topbar?: unknown
  /** Whether the sidebar is collapsed. */
  sidebarCollapsed = false
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** `data-mol-id` automation id. */
  automationId?: string

  /** Fires when the sidebar toggle button is pressed (React's `onSidebarToggle`). */
  @Output() readonly sidebarToggle = new EventEmitter<MouseEvent>()

  /** The sidebar wrapper (always in the template; detached when unused). */
  @ViewChild('sidebarSlot') sidebarSlot?: ElementRef<HTMLElement>
  /** The top bar wrapper (always in the template; detached when unused). */
  @ViewChild('topbarSlot') topbarSlot?: ElementRef<HTMLElement>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))
  private hasSidebar = false
  private hasTopbar = false
  private sidebarParent: HTMLElement | null = null
  private topbarParent: HTMLElement | null = null

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().pageShell, this.className)
  }

  /**
   * Computes the sidebar wrapper class list.
   * @returns The class string.
   */
  sidebarClasses(): string {
    return this.cm().cn(
      this.cm().pageShellSidebar,
      this.sidebarCollapsed && this.cm().pageShellSidebarCollapsed,
    )
  }

  /**
   * Whether the toggle button renders (React renders it only when
   * `onSidebarToggle` is given; a bound output means the caller listens).
   * @returns True when a listener is attached.
   */
  toggleVisible(): boolean {
    return this.sidebarToggle.observed
  }

  /**
   * The toggle button's accessible label.
   * @returns The label text.
   */
  toggleLabel(): string {
    return this.sidebarCollapsed
      ? this.i18n.t('ui.pageShell.expandSidebar', undefined, { defaultValue: 'Expand sidebar' })
      : this.i18n.t('ui.pageShell.collapseSidebar', undefined, { defaultValue: 'Collapse sidebar' })
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * Reads slot presence at view init (view queries resolve only then).
   */
  ngAfterViewInit(): void {
    this.sidebarParent = this.sidebarSlot?.nativeElement.parentElement ?? null
    this.topbarParent = this.topbarSlot?.nativeElement.parentElement ?? null
    this.hasSidebar = hasNodes(this.sidebarSlot?.nativeElement)
    this.hasTopbar = hasNodes(this.topbarSlot?.nativeElement)
    this.syncWrappers()
  }

  /**
   * Re-reconciles the wrappers on later passes.
   */
  ngDoCheck(): void {
    this.syncWrappers()
  }

  /**
   * Applies React's `{sidebar ? … : null}` / `{topbar ? … : null}`.
   */
  private syncWrappers(): void {
    this.sync.sync(
      this.sidebarSlot?.nativeElement,
      this.hasSidebar,
      this.sidebarParent ?? undefined,
    )
    this.sync.sync(this.topbarSlot?.nativeElement, this.hasTopbar, this.topbarParent ?? undefined)
  }
}
