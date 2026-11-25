/**
 * `Link` (`<a molLink="/path">`): an in-app anchor for Angular, the counterpart
 * of react-router's `<Link>`.
 *
 * @module
 */

import { DestroyRef, Directive, ElementRef, inject, type OnInit, Renderer2 } from '@angular/core'

import { followRouterLink, routerLinkHref } from '@molecule/app-routing'

import { useLinkRouter } from './hooks/use-router.js'

/**
 * The inputs {@link Link} takes: `@molecule/app-react`'s `LinkProps` for an
 * Angular directive. React's `to` is the directive's own attribute,
 * `molLink`; every other anchor attribute (`class`, `target`, `rel`) is
 * written on the `<a>` as usual.
 */
export interface LinkProps {
  /** The destination: an app path or a URL (React's `to`). */
  molLink: string
  /** Replace the current history entry instead of pushing one. */
  replace?: boolean
  /** State stored with the new history entry. */
  state?: unknown
}

/**
 * `<a molLink="/settings">`: sets the anchor's `href` and navigates in-app
 * through the molecule router, with react-router `<Link>`'s rules
 * (`followRouterLink` from `@molecule/app-routing`): a plain primary click
 * navigates without a page load; a ctrl/cmd, shift or alt click, a `target`
 * other than `_self`, a click the template's own `(click)` handler prevented,
 * and a URL on another origin are left to the browser.
 *
 * A link to a URL outside the app (another origin, `mailto:`, `//host`) needs
 * no router: the browser, or on a device the URL handler, opens it. It renders
 * with no router registered, the URL as its `href`, and a click is left to the
 * browser (the template's own `(click)` handler still runs). A link to an app
 * path needs a router, and fails without one with the error `useRouterInstance`
 * throws.
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
 *     <a molLink="https://molecule.dev">Molecule</a>
 *   `,
 * })
 * export class NavComponent {}
 * ```
 */
@Directive({
  selector: 'a[molLink]',
  standalone: true,
  inputs: ['molLink', 'replace', 'state'],
  host: { '[attr.href]': 'href' },
})
export class Link implements OnInit, LinkProps {
  /**
   * The destination: an app path (`/settings?tab=billing#plan`) or a URL. An app path's `href` is
   * the one the router writes for it (`routerLinkHref`), base path included; a URL's is the URL as
   * written.
   */
  molLink = ''
  /** Replace the current history entry instead of pushing one. */
  replace?: boolean
  /** State stored with the new history entry. */
  state?: unknown

  /**
   * Reads the registered router once, here in the field initializer's injection context, and
   * answers for each destination this link shows: an app path fails with the no-router error
   * when none is registered. It takes the hook's function form because `molLink` is not set
   * when a field initializer runs.
   */
  private readonly linkRouter = useLinkRouter()

  /**
   * The anchor's `href`: the URL as written for a URL outside the app with no router registered,
   * else the one the router writes for an app path, base path included. An app path with no
   * router fails here with the no-router error.
   */
  get href(): string {
    const router = this.linkRouter(this.molLink)
    return router === null ? this.molLink : routerLinkHref(this.molLink, router)
  }
  private readonly element = inject<ElementRef<HTMLAnchorElement>>(ElementRef)
  private readonly renderer = inject(Renderer2)
  private readonly destroyRef = inject(DestroyRef)

  /**
   * Starts handling clicks. The listener is added here, after the template
   * created this anchor's own `(click)` listeners, so those run first and can
   * prevent the navigation (react-router calls `onClick` first too). With no
   * router (a URL outside the app) the browser follows the anchor instead.
   */
  ngOnInit(): void {
    const stop = this.renderer.listen(this.element.nativeElement, 'click', (event: MouseEvent) => {
      const router = this.linkRouter(this.molLink)
      if (router !== null) {
        followRouterLink(event, this.molLink, router, {
          replace: this.replace,
          state: this.state,
        })
      }
    })
    this.destroyRef.onDestroy(stop)
  }
}
