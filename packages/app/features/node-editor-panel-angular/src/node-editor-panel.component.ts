/**
 * NodeEditorPanel component (React parity).
 *
 * @module
 */

import { type AfterViewInit, Component, type ElementRef, signal, ViewChild } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasRenderableContent, renders } from './utilities.js'

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
 * optional footer renders optimistically and
 * {@link NodeEditorPanel.ngAfterViewInit} withdraws it when nothing was
 * projected (React would not render it at all).
 */
@Component({
  selector: 'aside[mol-node-editor-panel]',
  standalone: true,
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
    @if (showFooter()) {
      <div #footerEl [class]="footerClasses()">
        @if (rendersFooter()) {
          {{ footer }}
        }
        <ng-content select="[slot=footer]" />
      </div>
    }`,
})
export class NodeEditorPanel implements AfterViewInit {
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

  /** The optional footer wrapper (projected content lands here; read once). */
  @ViewChild('footerEl') private footerEl?: ElementRef<HTMLElement>

  /** Whether a `[slot=footer]` projection landed (optimistic until the first view). */
  private readonly footerProjected = signal(true)
  private readonly i18n = useTranslation()

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
    return renders(this.title)
  }

  /**
   * Whether the footer row interpolates a string input (a projection is not text).
   * @returns True when the footer input renders as text.
   */
  rendersFooter(): boolean {
    return renders(this.footer)
  }

  /**
   * Whether the footer row renders: a truthy string input or a projected
   * `[slot=footer]` element.
   * @returns True when the footer shows.
   */
  showFooter(): boolean {
    return renders(this.footer) || this.footerProjected()
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
   * Reads the footer's first render: when nothing was projected and no text
   * input is set, React would not render the row at all, so the optimistic
   * render is withdrawn.
   */
  ngAfterViewInit(): void {
    const element = this.footerEl?.nativeElement
    if (element) this.footerProjected.set(hasRenderableContent(element))
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
