/**
 * `Link` (`<a molLink="/path">`): an in-app anchor for Angular, the counterpart
 * of react-router's `<Link>`.
 *
 * @module
 */

import { DestroyRef, Directive, ElementRef, inject, type OnInit, Renderer2 } from '@angular/core'

import { followRouterLink } from '@molecule/app-routing'

import { useRouterInstance } from './hooks/use-router.js'

/**
 * `<a molLink="/settings">`: sets the anchor's `href` and navigates in-app
 * through the molecule router, with react-router `<Link>`'s rules
 * (`followRouterLink` from `@molecule/app-routing`): a plain primary click
 * navigates without a page load; a ctrl/cmd, shift or alt click, a `target`
 * other than `_self`, a click the template's own `(click)` handler prevented,
 * and a URL on another origin are left to the browser.
 *
 * Inputs: `molLink` (the destination: an app path or a URL), `replace` (replace
 * the current history entry; when unset, a link to the location already shown
 * replaces it and any other link pushes, as with react-router's `<Link>`), and
 * `state` (stored with the new entry). Every other attribute (`class`,
 * `target`, `rel`) is written on the anchor as usual.
 *
 * Use it for every internal link instead of an anchor with a `(click)` handler
 * that calls `navigate()`. Needs the router from `provideMolecule({ router })`.
 *
 * @example
 * ```typescript
 * import { Component } from '@angular/core'
 * import { Link } from '@molecule/app-angular'
 *
 * @Component({
 *   selector: 'app-nav',
 *   standalone: true,
 *   imports: [Link],
 *   template: `
 *     <a molLink="/projects" class="nav-link">Projects</a>
 *     <a molLink="/login" [replace]="true" [state]="{ from: '/projects' }">Log in</a>
 *   `,
 * })
 * export class NavComponent {}
 * ```
 */
@Directive({
  selector: 'a[molLink]',
  standalone: true,
  inputs: ['molLink', 'replace', 'state'],
  host: { '[attr.href]': 'molLink' },
})
export class Link implements OnInit {
  /** The destination: an app path (`/settings?tab=billing#plan`) or a URL. */
  molLink = ''
  /** Replace the current history entry instead of pushing one. */
  replace?: boolean
  /** State stored with the new history entry. */
  state?: unknown

  private readonly router = useRouterInstance()
  private readonly element = inject<ElementRef<HTMLAnchorElement>>(ElementRef)
  private readonly renderer = inject(Renderer2)
  private readonly destroyRef = inject(DestroyRef)

  /**
   * Starts handling clicks. The listener is added here, after the template
   * created this anchor's own `(click)` listeners, so those run first and can
   * prevent the navigation (react-router calls `onClick` first too).
   */
  ngOnInit(): void {
    const stop = this.renderer.listen(this.element.nativeElement, 'click', (event: MouseEvent) => {
      followRouterLink(event, this.molLink, this.router, {
        replace: this.replace,
        state: this.state,
      })
    })
    this.destroyRef.onDestroy(stop)
  }
}
