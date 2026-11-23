/**
 * `RoutedView`, as `@molecule/app-react`'s: the matched child route, through whichever routing
 * bond the app wired.
 *
 * @module
 */

import {
  Component,
  ElementRef,
  inject,
  type OnInit,
  ViewChild,
  ViewContainerRef,
} from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from './dom-placement.js'
import { routedViewOrThrow } from './routed-view-token.js'

/**
 * Renders the matched child route, through whichever routing bond the app wired (an outlet
 * component under the angular-router bond). A layout or guard renders it where its page goes
 * when it was given no projected content, so the component imports no router library. The page
 * renders where this element stands, and the element itself is not in the page: React's
 * `RoutedView` renders only the page.
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
  hostDirectives: [MolPlacement],
  template: '<ng-container #outlet />',
})
export class RoutedView implements OnInit {
  private readonly view = routedViewOrThrow()
  private readonly host = inject(ElementRef).nativeElement as HTMLElement
  /**
   * An anchor of its own template: a RoutedView created outside any template (a test mounting it
   * alone) has no parent element for its host's container, so a page placed there never shows. A
   * decorator query, not `viewChild()`: this package is compiled by `tsc`, and Angular's JIT
   * compiler sees no signal query in a field initializer (NG0951). Static, so set before ngOnInit.
   */
  @ViewChild('outlet', { read: ViewContainerRef, static: true }) outlet?: ViewContainerRef

  constructor() {
    // Alone (no parent element), the host keeps the page: placeContentBefore needs a place.
    usePlacement(() => {
      placeContentBefore(this.host, this.host)
      setElementPresent(this.host, false)
    })
  }

  /** Creates the routed view's component at this element's anchor. */
  ngOnInit(): void {
    this.outlet?.createComponent(this.view)
  }
}
