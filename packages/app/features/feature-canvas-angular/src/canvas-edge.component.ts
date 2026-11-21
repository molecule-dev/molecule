/**
 * CanvasEdge component and its pure path builder (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { CanvasEdgeKind, Point } from './types.js'

/**
 * Build the SVG `path` `d` attribute for one of the supported edge kinds.
 *
 * @param from - Edge start in canvas-space.
 * @param to - Edge end in canvas-space.
 * @param kind - Edge geometry.
 * @returns SVG path data.
 */
export function buildEdgePath(from: Point, to: Point, kind: CanvasEdgeKind): string {
  if (kind === 'orthogonal') {
    return `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y}`
  }
  if (kind === 'bezier') {
    const handle = Math.max(20, Math.abs(to.x - from.x) / 2)
    const c1x = from.x + handle
    const c1y = from.y
    const c2x = to.x - handle
    const c2y = to.y
    return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`
  }
  // 'line'
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
}

/**
 * CanvasEdge component.
 *
 * Generic edge between two canvas-space points. The host IS the `<svg>`
 * (`svg[mol-canvas-edge]`), matching React's root exactly: an
 * absolutely-positioned SVG spanning the bounding box of the two endpoints
 * (with a small overflow margin so curves are not clipped). Domain semantics
 * (which nodes are connected, labels, arrowheads) live in wrapper packages —
 * this base just draws the geometry.
 */
@Component({
  selector: 'svg[mol-canvas-edge]',
  standalone: true,
  inputs: ['from', 'to', 'kind', 'strokeWidth', 'stroke', 'ariaLabel', 'className'],
  host: {
    role: 'img',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    'data-mol-id': 'canvas-edge',
    '[attr.data-edge-kind]': 'kind ?? "line"',
    '[class]': 'classes()',
    '[attr.width]': 'width()',
    '[attr.height]': 'height()',
    '[attr.viewBox]': 'viewBox()',
    '[style.position]': "'absolute'",
    '[style.left]': 'leftPx()',
    '[style.top]': 'topPx()',
    '[style.width]': 'widthPx()',
    '[style.height]': 'heightPx()',
    '[style.pointer-events]': "'none'",
    '[style.overflow]': "'visible'",
  },
  template: `<svg:path
    [attr.d]="pathData()"
    fill="none"
    [attr.stroke]="stroke ?? 'currentColor'"
    [attr.stroke-width]="strokeWidth ?? 2"
    stroke-linecap="round"
    stroke-linejoin="round"
    data-mol-id="canvas-edge-path"
  ></svg:path>`,
})
export class CanvasEdge {
  /** Edge starting point in canvas-space. */
  from?: Point
  /** Edge ending point in canvas-space. */
  to?: Point
  /** Edge geometry (defaults to `'line'` at read time). */
  kind?: CanvasEdgeKind
  /** Stroke width in canvas units (defaults to `2` at read time). */
  strokeWidth?: number
  /** SVG `stroke` attribute (defaults to `'currentColor'` at read time). */
  stroke?: string
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Extra classes merged onto the wrapper. */
  className?: string

  /** Reactive translation. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list.
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('absolute'), this.className)
  }

  /**
   * The overflow margin around the endpoint bounding box.
   *
   * @returns The margin in canvas units.
   */
  margin(): number {
    return Math.max(20, (this.strokeWidth ?? 2) * 4)
  }

  /**
   * The SVG's left edge.
   *
   * @returns The canvas-space x.
   */
  minX(): number {
    return Math.min(this.from?.x ?? 0, this.to?.x ?? 0) - this.margin()
  }

  /**
   * The SVG's top edge.
   *
   * @returns The canvas-space y.
   */
  minY(): number {
    return Math.min(this.from?.y ?? 0, this.to?.y ?? 0) - this.margin()
  }

  /**
   * The SVG's width (the endpoints' span plus the margin on both sides).
   *
   * @returns The width in canvas units.
   */
  width(): number {
    return Math.abs((this.to?.x ?? 0) - (this.from?.x ?? 0)) + this.margin() * 2
  }

  /**
   * The SVG's height (the endpoints' span plus the margin on both sides).
   *
   * @returns The height in canvas units.
   */
  height(): number {
    return Math.abs((this.to?.y ?? 0) - (this.from?.y ?? 0)) + this.margin() * 2
  }

  /**
   * The SVG's left offset as a CSS length.
   *
   * @returns The CSS length.
   */
  leftPx(): string {
    return `${this.minX()}px`
  }

  /**
   * The SVG's top offset as a CSS length.
   *
   * @returns The CSS length.
   */
  topPx(): string {
    return `${this.minY()}px`
  }

  /**
   * The SVG's width as a CSS length.
   *
   * @returns The CSS length.
   */
  widthPx(): string {
    return `${this.width()}px`
  }

  /**
   * The SVG's height as a CSS length.
   *
   * @returns The CSS length.
   */
  heightPx(): string {
    return `${this.height()}px`
  }

  /**
   * The SVG's viewBox.
   *
   * @returns The `0 0 width height` pair.
   */
  viewBox(): string {
    return `0 0 ${this.width()} ${this.height()}`
  }

  /**
   * The `path` `d` attribute, in viewBox-local coordinates.
   *
   * @returns SVG path data.
   */
  pathData(): string {
    const from = this.from ?? { x: 0, y: 0 }
    const to = this.to ?? { x: 0, y: 0 }
    const minX = this.minX()
    const minY = this.minY()
    return buildEdgePath(
      { x: from.x - minX, y: from.y - minY },
      { x: to.x - minX, y: to.y - minY },
      this.kind ?? 'line',
    )
  }

  /**
   * The accessible name of the edge.
   *
   * @returns The label.
   */
  resolvedAriaLabel(): string {
    return this.ariaLabel ?? this.i18n.t('canvas.aria.edge', {}, { defaultValue: 'Canvas edge' })
  }
}
