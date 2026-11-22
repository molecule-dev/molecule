/**
 * The routed view this bond gives `@molecule/app-angular`: Angular Router's own outlet, so
 * `<mol-routed-view />` in a layout or guard renders the matched child route, as React's
 * `RoutedView` renders react-router's `<Outlet />`.
 *
 * @module
 */

import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'

/**
 * Angular Router's `<router-outlet />`, as a component: `RoutedView` creates its routed view
 * with `createComponent`, which takes a component, and `RouterOutlet` is a directive. Created
 * inside a routed layout, the outlet is that layout route's child outlet, as one written in the
 * layout's template is. Its element takes no box of its own (`display: contents`), as React's
 * `<Outlet />` renders none.
 */
@Component({
  selector: 'mol-router-outlet',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
})
export class MoleculeRouterOutlet {}
