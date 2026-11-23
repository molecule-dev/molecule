/**
 * Context through the rendered tree — Angular's stand-in for React context.
 *
 * React context flows through the rendered tree. Angular DI follows the
 * template that declared a node instead, so content a component projects
 * through another component's template (`<mol-user-menu>` projecting the
 * consumer's panel into its own `<mol-panel-close-provider>`) cannot inject
 * what that inner component provides. A context here is registered on the
 * provider's host ELEMENT and found by walking the consumer's ancestors in the
 * rendered tree (`renderedParent` from `@molecule/app-angular`): the DOM
 * parent, except that a host which left the page, a portal and a slot rendered
 * elsewhere keep the parent their component gave them. So a provider registers
 * on its own host and a consumer looks up from its own host, whether or not
 * either host is in the page.
 *
 * Each context has its own key ({@link createDomContext}): a consumer finds the
 * nearest provider of ITS context, whatever other providers stand in between.
 *
 * @module
 */

import { renderedParent } from '@molecule/app-angular'

/** Registrations keyed by host element, then by context. */
const registrations = new WeakMap<Element, Map<object, unknown>>()

/** One context: what React's `createContext` returns, in Angular's form. */
export interface DomContext<T> {
  /**
   * Registers the value on a provider's host element.
   *
   * @param host - The provider component's host element.
   * @param value - The context value.
   */
  provide(host: Element, value: T): void
  /**
   * Removes the registration (on provider destroy).
   *
   * @param host - The provider component's host element.
   */
  remove(host: Element): void
  /**
   * Finds the nearest enclosing value for a consumer's element. The element's
   * own registration is ignored: a provider's children see the provider, the
   * provider does not see itself.
   *
   * @param start - The consumer's host element.
   * @returns The nearest registered value, or `undefined` when there is none.
   */
  find(start: Element | null): T | undefined
}

/**
 * Creates a context (React's `createContext`).
 *
 * @param name - The context's name, for debugging.
 * @returns The context.
 */
export function createDomContext<T>(name: string): DomContext<T> {
  return contextWithKey<T>({ name })
}

/**
 * The context registered and found under `key`.
 *
 * @param key - The context's key.
 * @returns The context.
 */
function contextWithKey<T>(key: object): DomContext<T> {
  return {
    provide(host, value) {
      let values = registrations.get(host)
      if (values === undefined) registrations.set(host, (values = new Map()))
      values.set(key, value)
    },
    remove(host) {
      registrations.get(host)?.delete(key)
    },
    find(start) {
      for (let el = renderedParent(start); el !== null; el = renderedParent(el)) {
        const values = registrations.get(el)
        if (values?.has(key)) return values.get(key) as T
      }
      return undefined
    },
  }
}

/** The key of the one context the deprecated functions below share. */
const sharedKey = { name: 'shared' }
/** That context. */
const shared = contextWithKey<unknown>(sharedKey)

/**
 * Registers a value on a provider's host element, in the one context every
 * caller of these three functions shares: a consumer then finds the nearest
 * registration of ANY of them.
 *
 * @param host - The provider component's host element.
 * @param value - The context value.
 * @deprecated Use a context of your own: {@link createDomContext}.
 */
export function provideDomContext(host: Element, value: unknown): void {
  shared.provide(host, value)
}

/**
 * Removes a registration (on provider destroy).
 *
 * @param host - The provider component's host element.
 * @deprecated Use a context of your own: {@link createDomContext}.
 */
export function removeDomContext(host: Element): void {
  shared.remove(host)
}

/**
 * Finds the nearest enclosing value for a consumer's element.
 *
 * @param start - The consumer's element (its own registration is ignored).
 * @returns The nearest registered value, or `undefined` when there is none.
 * @deprecated Use a context of your own: {@link createDomContext}.
 */
export function findDomContext<T>(start: Element | null): T | undefined {
  return shared.find(start) as T | undefined
}

/**
 * Finds the value registered on the element itself, or else the nearest
 * enclosing one.
 *
 * @param start - The consumer's element.
 * @returns The registered value, or `undefined` when there is none.
 * @deprecated Use a context of your own: {@link createDomContext}. A provider
 * registers on its own host and a consumer looks up from its own host, so no
 * lookup needs to include itself.
 */
export function findDomContextIncludingSelf<T>(start: Element | null): T | undefined {
  const own = start === null ? undefined : registrations.get(start)
  if (own?.has(sharedKey)) return own.get(sharedKey) as T
  return findDomContext<T>(start)
}
