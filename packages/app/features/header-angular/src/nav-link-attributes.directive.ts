/**
 * Writes a navigation link entry's extra anchor props the way React's
 * `<Link {...link} to>` does.
 *
 * @module
 */

import { Directive, ElementRef, inject, type OnDestroy, Renderer2 } from '@angular/core'

import { ElementPropsWriter } from '@molecule/app-ui-angular'

/**
 * Entry keys the template and the router link own; they are never written as
 * raw attributes. `onClick` is invoked by the template's own listener so it
 * runs before the router link's click handler, as react-router does.
 *
 * `className`/`class` and `style` are not listed: the writer composes and
 * serializes them exactly as React spreads them, which is what React's
 * `<Link>` does with the same entry.
 */
const OWNED = new Set([
  'children',
  'dangerouslySetInnerHTML',
  'replace',
  'state',
  'href',
  'onClick',
])

/**
 * `<a [molNavLinkAttrs]="link">`: applies every remaining anchor prop of a
 * navigation link entry (`target`, `rel`, `aria-*`, `data-*` event handlers,
 * …) to the anchor, adding, updating and removing them as the entry changes —
 * React spreads the entry onto its `<Link>`, so the Angular port writes the
 * same attributes onto the same anchor.
 *
 * `className`/`class` are composed into one `class` attribute and `style` is
 * serialized from React's style object. `href`, `replace` and `state` stay
 * with the binding's `Link` directive, and `onClick` with the template's
 * `(click)` listener (it must run first so `preventDefault()` cancels the
 * navigation, exactly like react-router's `<Link>`).
 */
@Directive({
  selector: 'a[molNavLinkAttrs]',
  standalone: true,
  inputs: ['molNavLinkAttrs'],
})
export class NavLinkAttributes implements OnDestroy {
  /** The navigation link entry whose extra anchor props are applied. */
  molNavLinkAttrs?: Record<string, unknown>

  private readonly element = inject<ElementRef<HTMLAnchorElement>>(ElementRef)
  private readonly renderer = inject(Renderer2)
  private readonly writer = new ElementPropsWriter(this.renderer, this.element.nativeElement)

  /** Applies the entry's attributes after every render check (React's spread on each render). */
  ngAfterViewChecked(): void {
    this.writer.write(this.molNavLinkAttrs ?? {}, OWNED)
  }

  /** Removes the entry's listeners when the anchor goes away. */
  ngOnDestroy(): void {
    this.writer.destroy()
  }
}
