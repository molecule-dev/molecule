import { Directive, ElementRef, inject, Input, type OnDestroy } from '@angular/core'

import { bindWebWheelZoom, type WebWheelZoomHandler } from '@molecule/app-pointer-events-dom'

/**
 * Handles shared Ctrl-wheel zoom steps. Import `WebWheelZoomDirective`
 * into a standalone component and bind `[molWheelZoom]="onStep"`.
 * Pass undefined to leave the wheel to the browser.
 */
@Directive({ selector: '[molWheelZoom]', standalone: true })
export class WebWheelZoomDirective implements OnDestroy {
  private readonly binding = bindWebWheelZoom(
    inject<ElementRef<HTMLElement | SVGElement>>(ElementRef).nativeElement,
  )

  /** Sets the callback that receives each handled zoom step. */
  @Input()
  set molWheelZoom(onStep: WebWheelZoomHandler | undefined) {
    this.binding.update(onStep)
  }

  /** Removes the wheel listener when Angular destroys the host. */
  ngOnDestroy(): void {
    this.binding.destroy()
  }
}
