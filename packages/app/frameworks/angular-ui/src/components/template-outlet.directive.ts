/**
 * Renders a `TemplateRef` where the host element sits (Angular's
 * `NgTemplateOutlet` without the `@angular/common` dependency).
 *
 * Used for node-valued props the adapter passes as `TemplateRef`s: a data
 * prop's `icon` (`items[0].icon`), render functions, or a node that must be
 * placed inside a template's own structure rather than projected directly.
 *
 * @module
 */

import {
  Directive,
  type EmbeddedViewRef,
  inject,
  Input,
  type TemplateRef,
  ViewContainerRef,
} from '@angular/core'

/**
 * Instantiates a template at the directive's host position and re-instantiates
 * it when the template changes.
 */
@Directive({
  selector: '[molTemplateOutlet]',
  standalone: true,
})
export class MolTemplateOutlet {
  private readonly vcr = inject(ViewContainerRef)
  private current: TemplateRef<unknown> | null = null
  private view?: EmbeddedViewRef<unknown>
  /** The live context object shared with the rendered view. */
  private context: Record<string, unknown> = {}

  /**
   * The template to render (a React node value in template form).
   *
   * @param template - The template, or null/undefined to render nothing.
   */
  @Input() set molTemplateOutlet(template: TemplateRef<unknown> | null | undefined) {
    if (template === this.current) return
    this.current = template ?? null
    this.view?.destroy()
    this.view = undefined
    if (this.current) this.view = this.vcr.createEmbeddedView(this.current, this.context)
  }

  /**
   * The template context (React's render-function arguments, e.g. a table
   * cell's `{ $implicit, a0, a1, a2 }`). The properties of the view's own
   * context object are updated in place — replacing the object is deprecated.
   *
   * @param context - The context object.
   */
  @Input() set molTemplateOutletContext(context: Record<string, unknown> | null | undefined) {
    const next = context ?? {}
    for (const key of Object.keys(this.context)) {
      if (!(key in next)) delete this.context[key]
    }
    Object.assign(this.context, next)
    this.view?.markForCheck()
  }

  /**
   * The current template context.
   * @returns The context object.
   */
  get molTemplateOutletContext(): Record<string, unknown> {
    return this.context
  }

  /**
   * The template currently rendered.
   * @returns The template, or null.
   */
  get molTemplateOutlet(): TemplateRef<unknown> | null {
    return this.current
  }
}
