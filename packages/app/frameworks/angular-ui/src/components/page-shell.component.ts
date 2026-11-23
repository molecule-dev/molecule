/**
 * PageShell component (React parity): authenticated page wrapper with an
 * optional sidebar and top bar.
 *
 * @module
 */

import { Component, ElementRef, EventEmitter, inject, Output, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import { styleText } from '../utilities/style.js'

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
  hostDirectives: [MolPlacement],
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
export class PageShell implements HasElement<HTMLDivElement> {
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

  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)
  private hasSidebar = false
  private hasTopbar = false

  /** Applies React's `{sidebar ? … : null}` / `{topbar ? … : null}`. */
  constructor() {
    usePlacement((hasContent) => this.syncWrappers(hasContent))
  }

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
   * Applies React's `{sidebar ? … : null}` / `{topbar ? … : null}`.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncWrappers(hasContent: SlotReader): void {
    this.hasSidebar = hasContent(this.sidebarSlot?.nativeElement)
    this.hasTopbar = hasContent(this.topbarSlot?.nativeElement)
    setElementPresent(this.sidebarSlot?.nativeElement, this.hasSidebar)
    setElementPresent(this.topbarSlot?.nativeElement, this.hasTopbar)
  }
}
