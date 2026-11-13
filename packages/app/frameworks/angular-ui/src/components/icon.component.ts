/**
 * Icon component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, type OnChanges } from '@angular/core'

import { getIcon, type IconData, type IconName } from '@molecule/app-icons'

/**
 * Icon component.
 *
 * Renders an SVG glyph looked up by `name` from the bonded icon set. The host
 * IS the `<svg>` (`svg[mol-icon-root]`). Extra attributes (`data-mol-id`,
 * `aria-label`, `role`, …) land on the host — React's spread target — and
 * switch the glyph out of decorative mode (no `aria-hidden`).
 */
@Component({
  selector: 'svg[mol-icon-root]',
  standalone: true,
  inputs: ['name', 'size', 'className', 'ariaHidden: aria-hidden'],
  host: {
    '[attr.width]': 'attrSize()',
    '[attr.height]': 'attrSize()',
    '[attr.viewBox]': 'failed ? "0 0 20 20" : icon().viewBox || "0 0 20 20"',
    '[attr.fill]': 'failed ? "none" : fill()',
    '[attr.stroke]': 'strokeAttrs().stroke',
    '[attr.stroke-width]': 'strokeAttrs().strokeWidth',
    '[attr.stroke-linecap]': 'strokeAttrs().strokeLinecap',
    '[attr.stroke-linejoin]': 'strokeAttrs().strokeLinejoin',
    '[class]': 'className',
    '[attr.aria-hidden]': 'ariaHiddenAttr()',
    '[attr.focusable]': 'decorative() ? "false" : null',
  },
  template: `@if (failed) {
      <svg:circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15" />
    } @else {
      @for (p of paths(); track $index) {
        <svg:path
          [attr.d]="p.d"
          [attr.fill]="p.fill"
          [attr.fill-rule]="p.fillRule"
          [attr.clip-rule]="p.clipRule"
          [attr.opacity]="p.opacity"
        />
      }
    }`,
})
export class Icon implements OnChanges {
  /** The glyph name from the bonded icon set. */
  name!: IconName
  /** Width and height in pixels (default 20). */
  size = 20
  /** Class name forwarded to the `<svg>`. */
  className?: string
  /**
   * Explicit `aria-hidden` (React stringifies `false` to `"false"` rather
   * than dropping the attribute).
   */
  ariaHidden?: boolean | string

  /** Whether the name is missing from the bonded set (placeholder renders). */
  failed = false

  /**
   * The rendered size (the default applies when a later-bound input writes
   * `undefined` over the field default, matching React's absent-prop default).
   * @returns The pixel size.
   */
  attrSize(): number {
    return this.size ?? 20
  }

  /**
   * Resolves the icon, warning once per render pass like React does.
   */
  ngOnChanges(): void {
    this.failed = false
    this.resolved = undefined
    try {
      this.resolved = getIcon(this.name)
    } catch (error) {
      console.warn(
        `Icon: no bonded glyph for "${String(this.name)}" — rendering a placeholder.`,
        error,
      )
      this.failed = true
    }
    const svg = this.resolved?.svg
    if (svg) (this.host.nativeElement as SVGSVGElement).innerHTML = svg
  }

  private resolved?: IconData

  /**
   * The resolved icon data (throws nothing; placeholder branch covers gaps).
   * @returns The icon data.
   */
  icon(): IconData {
    return this.resolved ?? { paths: [] }
  }

  /**
   * The fill attribute value (`none` for `icon.svg`-backed glyphs without an
   * explicit fill, matching React's two branches).
   * @returns The fill.
   */
  fill(): string {
    const icon = this.icon()
    if (icon.svg) return icon.fill || 'none'
    return icon.stroke ? 'none' : icon.fill || 'currentColor'
  }

  /**
   * Stroke attribute values (null when the icon is not stroked).
   * @returns The stroke attribute bag.
   */
  strokeAttrs(): {
    stroke: string | null
    strokeWidth: number | null
    strokeLinecap: string | null
    strokeLinejoin: string | null
  } {
    const icon = this.icon()
    if (!icon.stroke) {
      return { stroke: null, strokeWidth: null, strokeLinecap: null, strokeLinejoin: null }
    }
    return {
      stroke: icon.stroke ?? null,
      strokeWidth: icon.strokeWidth ?? null,
      strokeLinecap: icon.strokeLinecap ?? null,
      strokeLinejoin: icon.strokeLinejoin ?? null,
    }
  }

  /**
   * The glyph paths (empty for `icon.svg`-backed glyphs).
   * @returns The path list.
   */
  paths(): IconData['paths'] {
    return this.icon().svg ? [] : this.icon().paths
  }

  /**
   * Whether the glyph renders in decorative mode (no caller accessibility
   * props on the host).
   * @returns True when `aria-hidden` applies.
   */
  decorative(): boolean {
    const el = this.host.nativeElement
    return (
      !el.hasAttribute('aria-label') &&
      !el.hasAttribute('aria-labelledby') &&
      !el.hasAttribute('role')
    )
  }

  /**
   * The `aria-hidden` attribute value: an explicit value wins (React keeps
   * `aria-hidden={false}` as `"false"`), otherwise decorative mode applies.
   * @returns The attribute text or null.
   */
  ariaHiddenAttr(): string | null {
    if (this.ariaHidden !== undefined)
      return this.ariaHidden === true
        ? 'true'
        : this.ariaHidden === false
          ? 'false'
          : String(this.ariaHidden)
    return this.decorative() ? 'true' : null
  }

  /** The svg host element. */
  readonly host: ElementRef<SVGSVGElement> = inject(ElementRef)
}
