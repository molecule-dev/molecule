import { Directive, ElementRef, inject, Input, type OnDestroy } from '@angular/core'

import { createWebDrag } from '@molecule/app-pointer-events-dom'
import type { ElementDrag } from '@molecule/app-ui'

/**
 * Binds an HTML or SVG element to the web kits' shared drag gesture. Import
 * `WebDragDirective` into a standalone component and bind `[molDrag]="handlers"`.
 * Pass undefined to disable the gesture.
 */
@Directive({
  selector: '[molDrag]',
  standalone: true,
  host: { '(pointerdown)': 'onPointerDown($event)' },
})
export class WebDragDirective implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement | SVGElement>>(ElementRef).nativeElement
  private readonly gesture = createWebDrag()

  /** The current handlers for this host. */
  @Input()
  set molDrag(drag: ElementDrag | undefined) {
    this.gesture.update(drag)
  }

  /**
   * Offers a primary pointer press to this directive's element.
   *
   * @param event - The native bubbling pointer event.
   */
  onPointerDown(event: PointerEvent): void {
    this.gesture.start(this.host, event)
  }

  /** Cancels the gesture when Angular destroys its host. */
  ngOnDestroy(): void {
    this.gesture.cancel()
  }
}
