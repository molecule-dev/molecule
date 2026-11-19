// @vitest-environment jsdom
/**
 * `Link` (`<a molLink>`) against react-router `<Link>`'s behavior: the shared
 * `@molecule/app-framework-conformance/link` cases, rendered as a real zoneless
 * Angular application with `provideMolecule({ router })`.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  createComponent,
  type ElementRef,
  provideZonelessChangeDetection,
  ViewChild,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import { runLinkConformance } from '@molecule/app-framework-conformance/link'

import { Link } from '../link.js'
import { provideMolecule } from '../providers.js'

/** Each case compiles its own host; selectors must not repeat. */
let hosts = 0

runLinkConformance('@molecule/app-angular', async (container, router, props) => {
  const attrs = Object.entries(props.attrs ?? {})
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ')
  const Host = Component({
    selector: `mol-link-host-${++hosts}`,
    standalone: true,
    imports: [Link],
    // The host re-renders on a field write (Angular 22 defaults to OnPush).
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<a #anchor [molLink]="to" [replace]="replace" [state]="state" (click)="clicked($event)" ${attrs}>{{ text }}</a>`,
  })(
    class LinkHost {
      to = props.to
      replace = props.replace
      state = props.state
      text = props.text
      clicked = (event: MouseEvent): void => props.onClick?.(event)
      anchor?: ElementRef<HTMLAnchorElement>
    },
  )
  // React's `ref` on a Link is, in Angular, a query for the anchor `molLink` sits on: the caller
  // writes that anchor, so a template reference reaches it.
  ViewChild('anchor', { static: true })(Host.prototype, 'anchor')
  const appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideMolecule({ router })],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  props.ref?.(ref.instance.anchor?.nativeElement ?? null)
  return {
    setTo: async (next) => {
      ref.instance.to = next
      // Zoneless: a plain field write marks nothing dirty.
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    unmount: async () => {
      ref.destroy()
      appRef.destroy()
    },
  }
})
