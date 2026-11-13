/**
 * Icon rendering for Angular components — DOM parity with React's
 * `renderIcon` and `Icon`.
 *
 * @module
 */

import { Component, ElementRef, inject, type OnChanges } from '@angular/core'

import { getIcon, type IconData, type IconName } from '@molecule/app-icons'

/**
 * The icon data plus the resolved class name, precomputed so the template
 * only binds (recomputing `getIcon` per CD pass would be wasteful and can
 * throw mid-template).
 */
export interface ResolvedIcon {
  /** The bonded icon data. */
  icon: IconData
  /** Class for the `<svg>` (already joined, possibly empty). */
  className: string
  /** Whether the icon carries stroke styling. */
  stroked: boolean
  /** `0 0 20 20` fallback applied when the icon data has no viewBox. */
  viewBox: string
}

/**
 * Resolves an icon from the bonded set, throwing on unknown names exactly
 * like `@molecule/app-icons`'s `getIcon` (an unknown name is a runtime error,
 * not a blank).
 *
 * @param name - The icon name.
 * @param className - The class for the `<svg>` (a `cm.*` token).
 * @returns The resolved icon data.
 */
export function resolveIcon(name: IconName, className?: string): ResolvedIcon {
  const icon = getIcon(name)
  return {
    icon,
    className: className ?? '',
    stroked: !!icon.stroke,
    viewBox: icon.viewBox || '0 0 20 20',
  }
}

/**
 * Internal SVG renderer used by every React-parity component where React
 * renders through `renderIcon` / `Icon`.
 *
 * The component's selector is an attribute on the `<svg>` itself
 * (`<svg mol-icon …>`), so the host IS the svg element and no wrapper
 * element exists. Attribute parity with React's `renderIcon`:
 * `xmlns`, `aria-hidden="true"`, `focusable="false"`, `class`, `viewBox`,
 * `fill` (or the stroke group when the icon is stroked) and `<path>` children.
 * `icon.svg`-backed glyphs inject the bond's raw inner markup (the bond is
 * the trust boundary, exactly as React's `dangerouslySetInnerHTML`).
 */
@Component({
  selector: 'svg[mol-icon]',
  standalone: true,
  inputs: ['data'],
  host: {
    xmlns: 'http://www.w3.org/2000/svg',
    '[attr.aria-hidden]': '"true"',
    '[attr.focusable]': '"false"',
    '[class]': 'data?.className',
    '[attr.viewBox]': 'data?.viewBox',
    '[attr.fill]': 'fill',
    '[attr.stroke]': 'strokeAttrs.stroke',
    '[attr.stroke-width]': 'strokeAttrs.strokeWidth',
    '[attr.stroke-linecap]': 'strokeAttrs.strokeLinecap',
    '[attr.stroke-linejoin]': 'strokeAttrs.strokeLinejoin',
  },
  template: `@for (p of paths; track $index) {
    <svg:path
      [attr.d]="p.d"
      [attr.fill]="p.fill"
      [attr.fill-rule]="p.fillRule"
      [attr.clip-rule]="p.clipRule"
      [attr.opacity]="p.opacity"
    />
  }`,
})
export class MolIconSvg implements OnChanges {
  /** The resolved icon data (plain field input, JIT-visible). */
  data?: ResolvedIcon

  /**
   * The fill attribute value: `none` for stroked icons, the icon fill or
   * `currentColor` otherwise.
   * @returns The fill value.
   */
  get fill(): string {
    return this.data?.stroked ? 'none' : (this.data?.icon.fill ?? 'currentColor') || 'currentColor'
  }

  /**
   * Stroke attribute values (null when the icon is not stroked).
   * @returns The stroke attribute bag.
   */
  get strokeAttrs(): {
    stroke: string | null
    strokeWidth: number | null
    strokeLinecap: string | null
    strokeLinejoin: string | null
  } {
    if (!this.data?.stroked) {
      return { stroke: null, strokeWidth: null, strokeLinecap: null, strokeLinejoin: null }
    }
    const icon = this.data.icon
    return {
      stroke: icon.stroke ?? null,
      strokeWidth: icon.strokeWidth ?? null,
      strokeLinecap: icon.strokeLinecap ?? null,
      strokeLinejoin: icon.strokeLinejoin ?? null,
    }
  }

  /**
   * The paths to render (empty for `icon.svg`-backed glyphs).
   * @returns The path list.
   */
  get paths(): IconData['paths'] {
    return this.data?.icon.svg ? [] : (this.data?.icon.paths ?? [])
  }

  /**
   * Injects raw `icon.svg` markup into the svg host when the icon carries it.
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: { data?: { currentValue: ResolvedIcon } }): void {
    if (!changes.data) return
    const svg = changes.data.currentValue.icon.svg
    if (svg) (this.host.nativeElement as SVGSVGElement).innerHTML = svg
  }

  private readonly host: ElementRef<SVGSVGElement> = inject(ElementRef)
}
