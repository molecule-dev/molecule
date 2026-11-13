/**
 * Form-field context — Angular's stand-in for React's `cloneElement`
 * injection in `FormField`.
 *
 * React's `FormField` clones a single child element, adding `id`,
 * `aria-describedby` and `aria-invalid` to its props. Angular cannot clone a
 * projected component, so `FormField` registers these values on its host
 * element (`utilities/dom-context.ts`) and the field components
 * (`Input`, `Select`, `Textarea`, `Checkbox`) read the nearest enclosing
 * registration.
 *
 * @module
 */

import { findDomContext } from './dom-context.js'

/** The values `FormField` injects into its single child field. */
export interface FormFieldContext {
  /** The field id (`FormField`'s `name`, or a generated id). */
  id?: string
  /** The id of the error/hint paragraph the field should describe itself with. */
  describedBy?: string
  /** Whether the field is invalid (`FormField` render an error). */
  invalid?: boolean
}

/**
 * Finds the nearest enclosing `FormField` context for a field's host element.
 *
 * Resolved on every read: the field's own view is created before `FormField`
 * moves its projected children into place, so a value captured once at
 * construction could be stale.
 *
 * @param host - The field component's host element.
 * @returns The context, or null outside a `FormField`.
 */
export function fieldContext(host: Element | null): FormFieldContext | null {
  return findDomContext<FormFieldContext>(host) ?? null
}
