/**
 * `RoutedView`, as `@molecule/app-react`'s: the matched child route, through whichever routing
 * bond the app wired.
 *
 * @module
 */

import { Component, type OnInit, ViewChild, ViewContainerRef } from '@angular/core'

import { routedViewOrThrow } from './routed-view-token.js'

/**
 * Renders the matched child route, through whichever routing bond the app wired (an outlet
 * component under the angular-router bond). A layout or guard renders it where its page goes
 * when it was given no projected content, so the component imports no router library. The page
 * renders inside this element, whose box the page takes (`display: contents`).
 *
 * Throws an `I18nError` (`angular.error.noRoutedView`) when it is created and the routing bond
 * has no routed view: project the page instead. Rendering nothing there would show a blank page
 * with no error.
 *
 * @example
 * ```ts
 * @Component({
 *   selector: 'app-shell',
 *   imports: [RoutedView],
 *   template: `<main><mol-routed-view /></main>`,
 * })
 * class Shell {}
 * ```
 */
@Component({
  selector: 'mol-routed-view',
  standalone: true,
  template: '<ng-container #outlet />',
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
})
export class RoutedView implements OnInit {
  private readonly view = routedViewOrThrow()
  /**
   * An anchor of its own template: a RoutedView created outside any template (a test mounting it
   * alone) has no parent element for its host's container, so a page placed there never shows. A
   * decorator query, not `viewChild()`: this package is compiled by `tsc`, and Angular's JIT
   * compiler sees no signal query in a field initializer (NG0951). Static, so set before ngOnInit.
   */
  @ViewChild('outlet', { read: ViewContainerRef, static: true }) outlet?: ViewContainerRef

  /** Creates the routed view's component at this element's anchor. */
  ngOnInit(): void {
    this.outlet?.createComponent(this.view)
  }
}
