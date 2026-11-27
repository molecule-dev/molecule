/**
 * Language binding for the Angular kit's text and label elements.
 *
 * @module
 */

import { Directive, ElementRef, inject, Input, Renderer2 } from '@angular/core'

import type { ElementProps } from '@molecule/app-ui'

/**
 * Renders the shared language prop as an HTML attribute. An omitted input leaves any
 * caller-owned HTML attribute alone. Clearing a bound input removes the attribute.
 */
@Directive({ standalone: true })
export class ElementLanguage {
  private readonly element: ElementRef<Element> = inject(ElementRef)
  private readonly renderer = inject(Renderer2)

  /** BCP 47 language tag for the host element. */
  @Input()
  set lang(value: ElementProps['lang']) {
    if (value == null) this.renderer.removeAttribute(this.element.nativeElement, 'lang')
    else this.renderer.setAttribute(this.element.nativeElement, 'lang', value)
  }
}
