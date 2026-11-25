import {
  booleanAttribute,
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  type OnDestroy,
} from '@angular/core'

import { bindWebHover } from '@molecule/app-pointer-events-dom'

/**
 * Handles shared mouse and pen hover. Import `WebHoverDirective` into a
 * standalone component, add `molHover` to the host and listen for
 * `(molHoverEnter)` and `(molHoverLeave)`. Bind `[molHover]="false"`
 * to disable hover.
 */
@Directive({
  selector: '[molHover]',
  standalone: true,
  outputs: ['molHoverEnter', 'molHoverLeave'],
})
export class WebHoverDirective implements OnDestroy {
  /** Emits when a mouse or pen enters the host. */
  readonly molHoverEnter = new EventEmitter<MouseEvent>()

  /** Emits when the hovering mouse or pen leaves the host. */
  readonly molHoverLeave = new EventEmitter<MouseEvent>()

  private readonly binding = bindWebHover(
    inject<ElementRef<HTMLElement | SVGElement>>(ElementRef).nativeElement,
  )

  private readonly handlers = {
    onEnter: (event: MouseEvent) => this.molHoverEnter.emit(event),
    onLeave: (event: MouseEvent) => this.molHoverLeave.emit(event),
  }

  /** Enables the gesture on this host. */
  @Input({ transform: booleanAttribute })
  set molHover(enabled: boolean) {
    this.binding.update(enabled ? this.handlers : undefined)
  }

  /** Removes the hover listeners when Angular destroys the host. */
  ngOnDestroy(): void {
    this.binding.destroy()
  }
}
