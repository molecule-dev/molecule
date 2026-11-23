/**
 * The routed view this bond gives `@molecule/app-angular`: Angular Router's own outlet, so
 * `<mol-routed-view />` in a layout or guard renders the matched child route, as React's
 * `RoutedView` renders react-router's `<Outlet />`.
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'
import { RouterOutlet } from '@angular/router'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'

/**
 * Angular Router's `<router-outlet />`, as a component: `RoutedView` creates its routed view
 * with `createComponent`, which takes a component, and `RouterOutlet` is a directive. Created
 * inside a routed layout, the outlet is that layout route's child outlet, as one written in the
 * layout's template is. The matched page renders where this component stands, and neither this
 * component's element nor the `<router-outlet>` element is in the page, as React's `<Outlet />`
 * renders only the page.
 */
@Component({
  selector: 'mol-router-outlet',
  standalone: true,
  imports: [RouterOutlet],
  hostDirectives: [MolPlacement],
  template: '<router-outlet #outlet />',
})
export class MoleculeRouterOutlet {
  /** The `<router-outlet>` element; the pages render after it, so it stays where it is, absent. */
  @ViewChild('outlet', { read: ElementRef, static: true }) outlet?: ElementRef<HTMLElement>
  private readonly host = inject(ElementRef).nativeElement as HTMLElement

  constructor() {
    usePlacement(() => {
      placeContentBefore(this.host, this.host)
      setElementPresent(this.outlet?.nativeElement, false)
      setElementPresent(this.host, false)
    })
  }
}
