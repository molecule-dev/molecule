/**
 * DOM-scoped provider lookup — Angular's stand-in for React context.
 *
 * React context flows through the rendered tree, including projected
 * children. Angular DI does not: `<ng-content>` nodes keep their declaration
 * site's injector, so a provider declared on a wrapper component is invisible
 * to components projected inside it. Contexts here are therefore registered
 * on the provider's host ELEMENT and looked up by walking the DOM ancestors —
 * the same "nearest enclosing provider in the rendered tree" semantics React
 * has.
 *
 * @module
 */

/** Registrations keyed by host element. */
const registrations = new WeakMap<Element, unknown>()

/**
 * Registers a context value on a provider's host element.
 *
 * @param host - The provider component's host element.
 * @param value - The context value.
 */
export function provideDomContext(host: Element, value: unknown): void {
  registrations.set(host, value)
}

/**
 * Removes a registration (on provider destroy).
 *
 * @param host - The provider component's host element.
 */
export function removeDomContext(host: Element): void {
  registrations.delete(host)
}

/**
 * Finds the nearest enclosing context value for a consumer's element.
 *
 * @param start - The consumer's element (its own registrations are ignored —
 * a provider's children see the provider, the provider does not see itself).
 * @returns The nearest registered value, or `undefined` when there is none.
 */
export function findDomContext<T>(start: Element | null): T | undefined {
  let el: Element | null = start ? start.parentElement : null
  while (el) {
    const value = registrations.get(el)
    if (value !== undefined) return value as T
    el = el.parentElement
  }
  return undefined
}

/**
 * Finds the nearest enclosing context INCLUDING the element itself.
 *
 * @param start - The element to start from.
 * @returns The nearest registered value, or `undefined` when there is none.
 */
export function findDomContextIncludingSelf<T>(start: Element | null): T | undefined {
  let el: Element | null = start
  while (el) {
    const value = registrations.get(el)
    if (value !== undefined) return value as T
    el = el.parentElement
  }
  return undefined
}
