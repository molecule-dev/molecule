/**
 * Angular analytics route listener (React parity).
 *
 * @module
 */

import { Component, computed, effect } from '@angular/core'

import { page } from '@molecule/app-analytics'
import { useLocation } from '@molecule/app-angular'

/**
 * AnalyticsRouteListener component.
 *
 * Angular counterpart of `@molecule/app-analytics-react`'s
 * `AnalyticsRouteListener` — the same behavior for the same input: a `page`
 * event with the current pathname / search on mount and on every client-side
 * route change, dispatched through the wired analytics bond. It takes no
 * inputs and renders nothing.
 *
 * React's root is nothing at all, so the host is an empty, layout-neutral
 * element (`display: contents`) that the DOM normalizer unwraps
 * (`data-parity-unwrap`) — the same convention the UI kit's fragment-rooted
 * Angular components use.
 */
@Component({
  selector: 'mol-analytics-route-listener',
  standalone: true,
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: '',
})
export class AnalyticsRouteListener {
  /** The current route location, as the binding's router sees it. */
  private readonly location = useLocation()

  // React keys its effect on the pathname and search VALUES. The computed
  // signals keep that behavior: a navigation that replaces the location
  // without changing either value does not re-record.
  /** The current pathname, the recorded page's `name`. */
  private readonly name = computed(() => this.location().pathname)
  /** The pathname and search together, the recorded page's `path`. */
  private readonly path = computed(() => `${this.name()}${this.location().search}`)

  constructor() {
    effect(() => {
      void page({
        name: this.name(),
        path: this.path(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      })
    })
  }
}
