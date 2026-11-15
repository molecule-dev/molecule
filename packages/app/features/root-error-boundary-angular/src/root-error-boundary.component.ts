/**
 * RootErrorBoundary component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  type OnChanges,
  signal,
  type SimpleChanges,
  type TemplateRef,
} from '@angular/core'

import { RootErrorFallback } from './root-error-fallback.component.js'

/**
 * RootErrorBoundary component.
 *
 * Top-level error boundary that catches descendant render errors, reports
 * them via the bonded `@molecule/app-logger`, and falls back to a minimal
 * localized recovery surface read through `useTranslation()` from
 * `@molecule/app-angular`. It renders its children untouched while no error
 * has been caught — there is no wrapper element, matching React's fragment
 * root, so the host is unwrapped (`data-parity-unwrap`, `display: contents`).
 *
 * This is the Angular counterpart of `@molecule/app-root-error-boundary-react`.
 *
 * @remarks
 * Angular's `@boundary` template block is the boundary: the caught error
 * swaps the guarded tree for the recovery alert (React's
 * `getDerivedStateFromError` + fallback render), and the alert reports the
 * error through the bonded logger (React's `componentDidCatch`). Projected
 * content (`children`) is created by the parent's view, OUTSIDE this
 * boundary's catch — an app guarding a route component passes it as the
 * `content` `TemplateRef` input instead, which the boundary instantiates
 * inside its own view.
 */
@Component({
  selector: 'mol-root-error-boundary',
  standalone: true,
  imports: [NgTemplateOutlet, RootErrorFallback],
  inputs: ['content'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `@boundary {
      @if (contentTemplate(); as tpl) {
        <ng-container [ngTemplateOutlet]="tpl"></ng-container>
      } @else {
        <ng-content></ng-content>
      }
    } @error (caught = $error) {
      <div mol-root-error-fallback [error]="caught"></div>
    }`,
})
export class RootErrorBoundary implements OnChanges {
  /** The protected content template, when the caller passed one. */
  content?: TemplateRef<unknown>

  /** The template as a signal, so the `@if` re-renders when the input lands. */
  readonly contentTemplate = signal<TemplateRef<unknown> | undefined>(undefined)

  /**
   * Mirrors the input into the signal.
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) this.contentTemplate.set(this.content)
  }
}
