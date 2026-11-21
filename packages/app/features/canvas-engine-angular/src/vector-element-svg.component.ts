/**
 * VectorElementSvg component (React parity).
 *
 * @module
 */

import { Component, forwardRef } from '@angular/core'

import type {
  VectorElement,
  VectorEllipse,
  VectorGroup,
  VectorLine,
  VectorPath,
  VectorRect,
  VectorText,
} from './types.js'

/**
 * Applies an element's transform to an SVG `transform` string.
 *
 * @param element - Element to read.
 * @returns The `transform` attribute, or `null` for identity.
 */
function transformAttr(element: VectorElement): string | null {
  const t = element.transform
  if (!t) return null
  const parts: string[] = []
  // Rotate around the element centre (lines pivot around their midpoint).
  if (t.rotation != null && t.rotation !== 0) {
    let cx: number
    let cy: number
    if (element.kind === 'line') {
      cx = (element.x1 + element.x2) / 2
      cy = (element.y1 + element.y2) / 2
    } else {
      cx = element.x + element.width / 2
      cy = element.y + element.height / 2
    }
    parts.push(`rotate(${t.rotation} ${cx} ${cy})`)
  }
  if ((t.scaleX != null && t.scaleX !== 1) || (t.scaleY != null && t.scaleY !== 1)) {
    parts.push(`scale(${t.scaleX ?? 1} ${t.scaleY ?? 1})`)
  }
  return parts.length > 0 ? parts.join(' ') : null
}

/**
 * Pure-presentational SVG renderer for one {@link VectorElement}: the Angular
 * counterpart of `@molecule/app-canvas-engine-react`'s `VectorElementSvg`.
 *
 * The host IS React's root (`<g data-mol-id="canvas-engine-element">`), so the
 * same attributes, styles and text render for the same element. Group children
 * render recursively through this component. It owns no state and no pointer
 * handlers — `<CanvasEngine>` wraps each element in its own pointer-capturing
 * layer.
 */
@Component({
  selector: 'g[mol-vector-element-svg]',
  standalone: true,
  // Its own template renders a group’s children through this component.
  imports: [forwardRef(() => VectorElementSvg)],
  inputs: ['element', 'selected'],
  host: {
    'data-mol-id': 'canvas-engine-element',
    '[attr.data-canvas-element-id]': 'element.id',
    '[attr.data-canvas-element-kind]': 'element.kind',
    '[attr.data-selected]': 'selected ? "true" : "false"',
    '[attr.transform]': 'transform()',
    '[style]': 'styleText()',
  },
  template: `@if (asRect(); as r) {
      <svg:rect
        [attr.x]="r.x"
        [attr.y]="r.y"
        [attr.width]="r.width"
        [attr.height]="r.height"
        [attr.rx]="r.cornerRadius"
        [attr.ry]="r.cornerRadius"
        [attr.fill]="fill()"
        [attr.stroke]="stroke()"
        [attr.stroke-width]="strokeWidth()"
      ></svg:rect>
    } @else if (asEllipse(); as e) {
      <svg:ellipse
        [attr.cx]="e.x + e.width / 2"
        [attr.cy]="e.y + e.height / 2"
        [attr.rx]="e.width / 2"
        [attr.ry]="e.height / 2"
        [attr.fill]="fill()"
        [attr.stroke]="stroke()"
        [attr.stroke-width]="strokeWidth()"
      ></svg:ellipse>
    } @else if (asLine(); as l) {
      <svg:line
        [attr.x1]="l.x1"
        [attr.y1]="l.y1"
        [attr.x2]="l.x2"
        [attr.y2]="l.y2"
        [attr.stroke]="stroke() ?? fill()"
        [attr.stroke-width]="strokeWidth() ?? 1"
      ></svg:line>
    } @else if (asPath(); as p) {
      <svg:g [attr.transform]="'translate(' + p.x + ' ' + p.y + ')'">
        <svg:path
          [attr.d]="p.d"
          [attr.fill]="fill()"
          [attr.stroke]="stroke()"
          [attr.stroke-width]="strokeWidth()"
        ></svg:path>
      </svg:g>
    } @else if (asText(); as t) {
      <svg:text
        [attr.x]="t.x"
        [attr.y]="t.y + (t.fontSize ?? 16)"
        [attr.fill]="t.fill ?? '#000000'"
        [attr.stroke]="stroke()"
        [attr.stroke-width]="strokeWidth()"
        [attr.font-size]="t.fontSize ?? 16"
        [attr.font-family]="t.fontFamily ?? 'system-ui, sans-serif'"
        [attr.font-weight]="t.fontWeight ?? 'normal'"
        [textContent]="t.text"
      ></svg:text>
    } @else if (asGroup(); as g) {
      @for (child of g.children; track child.id) {
        <g mol-vector-element-svg [element]="child" [selected]="selected"></g>
      }
    }`,
})
export class VectorElementSvg {
  /** Element to draw. */
  element!: VectorElement
  /** Whether the element is currently selected (drives `data-selected`). */
  selected?: boolean

  /**
   * The element narrowed to a rect, for the template's branch.
   *
   * @returns The rect, or `undefined` for another kind.
   */
  asRect(): VectorRect | undefined {
    const element = this.element
    return element.kind === 'rect' ? element : undefined
  }

  /**
   * The element narrowed to an ellipse, for the template's branch.
   *
   * @returns The ellipse, or `undefined` for another kind.
   */
  asEllipse(): VectorEllipse | undefined {
    const element = this.element
    return element.kind === 'ellipse' ? element : undefined
  }

  /**
   * The element narrowed to a line, for the template's branch.
   *
   * @returns The line, or `undefined` for another kind.
   */
  asLine(): VectorLine | undefined {
    const element = this.element
    return element.kind === 'line' ? element : undefined
  }

  /**
   * The element narrowed to a path, for the template's branch.
   *
   * @returns The path, or `undefined` for another kind.
   */
  asPath(): VectorPath | undefined {
    const element = this.element
    return element.kind === 'path' ? element : undefined
  }

  /**
   * The element narrowed to text, for the template's branch.
   *
   * @returns The text element, or `undefined` for another kind.
   */
  asText(): VectorText | undefined {
    const element = this.element
    return element.kind === 'text' ? element : undefined
  }

  /**
   * The element narrowed to a group, for the template's branch.
   *
   * @returns The group, or `undefined` for another kind.
   */
  asGroup(): VectorGroup | undefined {
    const element = this.element
    return element.kind === 'group' ? element : undefined
  }

  /**
   * Fill paint (`none` when the element has no fill).
   *
   * @returns The fill value.
   */
  fill(): string {
    return this.element.fill ?? 'none'
  }

  /**
   * Stroke paint, or `null` when the element has none.
   *
   * @returns The stroke value or null.
   */
  stroke(): string | null {
    return this.element.stroke ?? null
  }

  /**
   * Stroke width, or `null` when the element has none.
   *
   * @returns The stroke width or null.
   */
  strokeWidth(): number | null {
    const stroke = this.element.stroke
    return stroke != null ? (this.element.strokeWidth ?? 1) : (this.element.strokeWidth ?? null)
  }

  /**
   * The element's `transform` attribute.
   *
   * @returns The transform string, or null.
   */
  transform(): string | null {
    return transformAttr(this.element)
  }

  /**
   * Inline style for opacity and blend mode, as React writes it.
   *
   * @returns The style text (possibly empty).
   */
  styleText(): string {
    const parts: string[] = []
    if (this.element.opacity != null) parts.push(`opacity: ${this.element.opacity}`)
    if (this.element.blendMode != null) parts.push(`mix-blend-mode: ${this.element.blendMode}`)
    return parts.join('; ')
  }
}
