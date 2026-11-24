/**
 * NodeEditorPanel component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  rendersNode,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * NodeEditorPanel component.
 *
 * Right-side aside chrome: title row with close button, scrollable body,
 * sticky footer for the save bar + status messages. The host IS the outer
 * `<aside>` (`aside[mol-node-editor-panel]`), matching React's root exactly.
 *
 * Node props are projected content: `title` is `[slot=title]`, `footer` is
 * `[slot=footer]`, and everything else is the default body projection. A plain
 * string may also be passed to `title` / `footer` as an input.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture point mounted, so the
 * footer row stays in the template and leaves the page while it has nothing to
 * render (React would not render it at all); the placement function re-decides
 * it whenever the slot changes.
 */
@Component({
  selector: 'aside[mol-node-editor-panel]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['title', 'children', 'footer', 'onClose', 'closeAriaLabel', 'widthClass'],
  host: {
    '[class]': 'classes()',
  },
  template: `<div [class]="headerClasses()">
      <h2 [class]="titleClasses()">
        @if (hasTitle) {
          {{ title }}
        }
        <ng-content select="[slot=title]" />
      </h2>
      @if (onClose) {
        <button
          type="button"
          data-mol-id="node-editor-panel-close"
          [class]="closeClasses()"
          [attr.aria-label]="closeLabel()"
          (click)="handleClose($event)"
        >
          <span [class]="cm().iconGlyphFont">close</span>
        </button>
      }
    </div>
    <div [class]="bodyClasses()"><ng-content /></div>
    <div #footerEl [class]="footerClasses()">
      @if (rendersFooter()) {
        {{ footer }}
      }
      <ng-content select="[slot=footer]" />
    </div>`,
})
export class NodeEditorPanel {
  /** Panel title — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Body content is projected; the input is accepted for prop parity. */
  children?: unknown
  /** Footer slot — a string input, or `[slot=footer]` projected content. */
  footer?: unknown
  /** Click handler for the close button (omitted when undefined). */
  onClose?: (event?: MouseEvent) => void
  /** Accessible label of the close button (default: the translated `nodeEditorPanel.close` key). */
  closeAriaLabel?: string
  /** Width class fragment (React's default `w-80` applied at read time). */
  widthClass?: string

  /** The optional footer wrapper (its projected nodes decide whether it shows). */
  @ViewChild('footerEl', { static: true }) private footerEl?: ElementRef<HTMLElement>

  /** Whether the footer row renders (placement decides, so a refilled slot returns). */
  private readonly footerShown = signal(false)

  private readonly i18n = useTranslation()

  /**
   * Keeps the footer row on the page only while it renders a text input or
   * projected `[slot=footer]` content, re-decided whenever either changes.
   */
  constructor() {
    usePlacement((hasContent) => {
      const footerEl = this.footerEl?.nativeElement
      const showFooter = rendersNode(this.footer) || (footerEl ? hasContent(footerEl) : false)
      this.footerShown.set(showFooter)
      setElementPresent(footerEl, showFooter)
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
   * Whether a string title input renders (a projected title is not).
   * @returns True when the title input renders as text.
   */
  get hasTitle(): boolean {
    return rendersNode(this.title)
  }

  /**
   * Whether the footer row interpolates a string input (a projection is not text).
   * @returns True when the footer input renders as text.
   */
  rendersFooter(): boolean {
    return rendersNode(this.footer)
  }

  /**
   * Whether the footer row renders: a truthy string input or a projected
   * `[slot=footer]` element.
   * @returns True when the footer shows.
   */
  showFooter(): boolean {
    return rendersNode(this.footer) || this.footerShown()
  }

  /**
   * The close button's accessible label (React's translated default applied at read time).
   * @returns The aria-label value.
   */
  closeLabel(): string {
    return (
      this.closeAriaLabel ??
      this.i18n.t('nodeEditorPanel.close', {}, { defaultValue: 'Close panel' })
    )
  }

  /**
   * The host's class list (React's `cm.cn(flex, width, nodeEditorPanelAside)`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ direction: 'col' }),
      this.widthClass ? this.widthClass : cm.w(80),
      cm.nodeEditorPanelAside,
    )
  }

  /**
   * The header row's class list.
   * @returns The class string.
   */
  headerClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.sp('p', 6),
      cm.flex({ align: 'center', justify: 'between' }),
      cm.nodeEditorPanelHeader,
    )
  }

  /**
   * The title heading's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.fontWeight('bold'), cm.nodeEditorPanelTitle)
  }

  /**
   * The close button's class list.
   * @returns The class string.
   */
  closeClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.dialogClose, cm.touchTarget)
  }

  /**
   * The body's class list.
   * @returns The class string.
   */
  bodyClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex1, cm.sp('p', 6), cm.stack(8), cm.nodeEditorPanelBody)
  }

  /**
   * The footer row's class list.
   * @returns The class string.
   */
  footerClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('p', 6), cm.nodeEditorPanelFooter)
  }

  /**
   * Forwards the button's click event, as React's `onClick={onClose}` does.
   * @param event - The click event.
   */
  handleClose(event: MouseEvent): void {
    this.onClose?.(event)
  }
}
