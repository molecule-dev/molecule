/**
 * Renders an SVG glyph looked up by name from the bonded `@molecule/app-icons`
 * set — the IDE's consistent, high-quality icon source (no unicode glyphs, no
 * ad-hoc inline `<path>`s).
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `Icon` (see that file
 * for the design notes): the same inputs (React prop names), the same DOM for
 * the same input, the same callbacks. The host IS the `<svg>`
 * (`svg[mol-icon]`) — React's spread target — so every extra attribute the
 * caller puts on the element (`data-mol-id`, `aria-*`, `title`, `style`)
 * lands where React's `...rest` spread puts it, and the exported class is
 * the React name. The raw-markup branch injects the icon set's own SVG
 * string as child nodes (React's `dangerouslySetInnerHTML`) — the bond is
 * the trust boundary — replacing only the element children each time so the
 * framework's own view anchors survive a glyph that switches branches.
 *
 * @module
 */

import { Component, ElementRef, inject, type OnChanges } from '@angular/core'

import { getIcon, type IconData, type IconName } from '@molecule/app-icons'

/**
 * Props for `Icon`. In React every extra SVG/HTML attribute travels through the
 * `...rest` spread (`data-mol-id`, `aria-*`, `role`, event handlers, `style`);
 * here the host element's own attributes carry them.
 */
export interface IconProps {
  /** Name of the glyph to look up in the bonded icon set (e.g. `'sync'`). */
  name: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 16. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
  className?: string
  /** React's `...rest`: any other SVG/HTML attribute or event handler. */
  [key: string]: unknown
}

/** SVG namespace: the raw markup parses in it so the nodes adopt `<svg>`'s namespace. */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

/**
 * Renders the named glyph from the bonded icon set.
 */
@Component({
  selector: 'svg[mol-icon]',
  standalone: true,
  inputs: ['name', 'size', 'className', 'onClick'],
  host: {
    '[attr.width]': 'attrSize()',
    '[attr.height]': 'attrSize()',
    '[attr.viewBox]': 'viewBox()',
    '[attr.fill]': 'fillAttr()',
    '[attr.stroke]': 'strokeAttrs().stroke',
    '[attr.stroke-width]': 'strokeAttrs().strokeWidth',
    '[attr.stroke-linecap]': 'strokeAttrs().strokeLinecap',
    '[attr.stroke-linejoin]': 'strokeAttrs().strokeLinejoin',
    '[class]': 'className ?? null',
    // React's Icon takes these as props and never renders them. Angular keeps
    // an input written as a static attribute (`<svg mol-icon name="bug">`) on
    // the host as well, so the host removes them: the DOM is React's however
    // the caller writes the input.
    '[attr.name]': 'null',
    '[attr.size]': 'null',
    '[attr.className]': 'null',
    '(click)': 'onHostClick($event)',
  },
  // prettier-ignore
  template: `@for (p of paths(); track $index) {
      <svg:path
        [attr.d]="p.d"
        [attr.fill]="p.fill"
        [attr.fill-rule]="p.fillRule"
        [attr.clip-rule]="p.clipRule"
        [attr.opacity]="p.opacity"
      />
    }`,
})
export class Icon implements OnChanges {
  /** Name of the glyph to look up in the bonded icon set (e.g. `'sync'`). */
  name!: IconName

  /** Width and height of the rendered SVG in pixels. Defaults to 16. */
  size = 16

  /** Class name forwarded to the root `<svg>`. */
  className?: string

  /**
   * A click handler forwarded to the root `<svg>` — React's rest spread
   * accepts any SVG/HTML attribute, and a handler reaches this host the same
   * way a host listener.
   */
  onClick?: (event: MouseEvent) => void

  /** The resolved icon data of the current `name`. */
  private resolved?: IconData

  /** Whether the previous glyph rendered raw markup (its children are ours to remove). */
  private hadRawMarkup = false

  /** The svg host element. */
  private readonly host: ElementRef<SVGSVGElement> = inject(ElementRef)

  /**
   * Resolves the new glyph and rebuilds the raw-markup children. Angular's
   * template branch destroys and creates the `<path>` views on its own; only
   * the raw branch's children are managed here.
   */
  ngOnChanges(): void {
    const icon = getIcon(this.name)
    this.resolved = icon
    const el = this.host.nativeElement
    if (icon.svg) {
      // Remove only the element children of a previous raw glyph — the
      // framework's comment anchors stay, so a later branch switch keeps its
      // place — then parse the markup in the SVG namespace and adopt it.
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) child.remove()
      }
      const doc = new DOMParser().parseFromString(
        `<svg xmlns="${SVG_NAMESPACE}">${icon.svg}</svg>`,
        'image/svg+xml',
      )
      for (const child of Array.from(doc.documentElement.childNodes)) {
        el.appendChild(document.importNode(child, true))
      }
    } else if (this.hadRawMarkup) {
      // Raw → path: the raw children are not Angular's views, so they are
      // removed here while the template re-creates the `<path>` views.
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) child.remove()
      }
    }
    this.hadRawMarkup = !!icon.svg
  }

  /**
   * The rendered size (the default applies when a later-bound input writes
   * `undefined` over the field default, matching React's absent-prop default).
   * @returns The pixel size.
   */
  protected attrSize(): number {
    return this.size ?? 16
  }

  /**
   * The `viewBox` attribute value, with React's fallback.
   * @returns The viewBox.
   */
  protected viewBox(): string {
    return this.resolved?.viewBox || '0 0 20 20'
  }

  /**
   * The `fill` attribute value (`none` for raw-markup glyphs without an
   * explicit fill and for stroked glyphs, matching React's two branches).
   * @returns The fill.
   */
  protected fillAttr(): string {
    const icon = this.resolved
    if (!icon) return 'currentColor'
    if (icon.svg) return icon.fill || 'none'
    return icon.stroke ? 'none' : icon.fill || 'currentColor'
  }

  /**
   * The stroke attribute values (all `null` when the icon is not stroked, so
   * React's absent attributes are absent here too).
   * @returns The stroke attribute bag.
   */
  protected strokeAttrs(): {
    stroke: string | null
    strokeWidth: number | null
    strokeLinecap: string | null
    strokeLinejoin: string | null
  } {
    const icon = this.resolved
    if (!icon?.stroke) {
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
   * The glyph paths (empty for raw-markup glyphs — React's raw branch has no
   * `<path>` children).
   * @returns The path list.
   */
  protected paths(): IconData['paths'] {
    return this.resolved?.svg ? [] : (this.resolved?.paths ?? [])
  }

  /**
   * Forwards the host click to the caller's handler (React's spread places
   * it on the same element).
   * @param event - The native click event.
   */
  protected onHostClick(event: MouseEvent): void {
    this.onClick?.(event)
  }
}
