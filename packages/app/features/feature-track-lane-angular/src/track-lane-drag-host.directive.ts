/**
 * Drag-host directive of the Angular track lane (React parity).
 *
 * @module
 */

import { Directive, ElementRef, inject, type OnDestroy } from '@angular/core'

import type { DragHosts } from './drag.js'

/**
 * Sits on each drag host of a track lane (a clip block and its resize handle)
 * and ends the pointer contact the element owns when it leaves the lane, as
 * React's drag cleanup does when the host unmounts.
 */
@Directive({
  selector: '[molTrackLaneDragHost]',
  standalone: true,
  inputs: ['molTrackLaneDragHost'],
})
export class TrackLaneDragHost implements OnDestroy {
  /** The lane's drag hosts, which end this element's contact. */
  molTrackLaneDragHost?: DragHosts

  /** The element the directive sits on. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  /** Ends the contact when the clip block or its handle leaves the lane. */
  ngOnDestroy(): void {
    this.molTrackLaneDragHost?.cancel(this.host.nativeElement)
  }
}
