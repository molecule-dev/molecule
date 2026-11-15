import { Component, DestroyRef, ElementRef, inject, type OnInit, Renderer2 } from '@angular/core'

import { useLocation, useRouterInstance } from '@molecule/app-angular'
import { followRouterLink } from '@molecule/app-routing'

/**
 * SafeLink component — the Angular counterpart of
 * `@molecule/app-safe-link-react`'s `SafeLink`: the same props (React names)
 * and the same DOM for the same input.
 *
 * `<SafeLink>` renders an in-app anchor with react-router `<Link>`'s click
 * rules (`followRouterLink` from `@molecule/app-routing`, the rule the
 * binding's `Link` follows), but if its destination matches the current path
 * it appends a `#top` fragment so clicking still produces an observable URL
 * change.
 *
 * Avoids "dead-link" probes that return no URL/DOM mutation when a same-path
 * link is clicked — useful for nav primitives that get exercised by
 * behavioural verifiers / e2e probes.
 *
 * The host IS the `<a>` (`a[mol-safe-link]`), matching React's root exactly.
 * The link's content is projected (the element's default content), and every
 * other attribute (`id`, `target`, `rel`, `aria-*`, `data-*`) is written on
 * the host anchor as usual.
 */
@Component({
  selector: 'a[mol-safe-link]',
  standalone: true,
  inputs: ['to', 'replace', 'state', 'className'],
  host: {
    '[attr.href]': 'target()',
    '[class]': 'className',
  },
  template: `<ng-content></ng-content>`,
})
export class SafeLink implements OnInit {
  /** The destination: a string app path (`/settings`, `/blog/`). */
  to = ''
  /** Replace the current history entry instead of pushing one. */
  replace?: boolean
  /** State stored with the new history entry. */
  state?: unknown
  /** Extra classes on the anchor. */
  className?: string

  private readonly location = useLocation()
  private readonly router = useRouterInstance()
  private readonly element = inject<ElementRef<HTMLAnchorElement>>(ElementRef)
  private readonly renderer = inject(Renderer2)
  private readonly destroyRef = inject(DestroyRef)

  /**
   * The anchor's destination with the same-path `#top` fragment applied (a
   * destination matching the current path — or the current path plus a
   * trailing slash — gets `#top`, its own trailing slash stripped first).
   * @returns The rendered `href`.
   */
  target(): string {
    const to = this.to
    const pathname = this.location().pathname
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  /**
   * Starts handling clicks. The listener is added here, after the host
   * element's own `(click)` bindings were created, so those run first and can
   * prevent the navigation (react-router calls `onClick` first too).
   */
  ngOnInit(): void {
    const stop = this.renderer.listen(this.element.nativeElement, 'click', (event: MouseEvent) => {
      followRouterLink(event, this.target(), this.router, {
        replace: this.replace,
        state: this.state,
      })
    })
    this.destroyRef.onDestroy(stop)
  }
}

export default SafeLink
