import { type Context, createComponent, type JSX, Show } from 'solid-js'

/**
 * `inner` wrapped in `context`'s provider carrying `value`, or `inner` itself without a value.
 *
 * Providers are composed with explicit `createComponent` calls and getter props, the shape
 * `vite-plugin-solid` compiles JSX to. Solid evaluates children eagerly, so the getter
 * `children` chain is what keeps each level lazy: a child component's `useContext` would
 * otherwise read a context whose provider has not run yet.
 *
 * @param context - The context to provide.
 * @param value - Its value, or `undefined` to leave it out.
 * @param inner - Renders the tree below.
 * @returns Renders the provided tree.
 */
export function wrap<T>(
  context: Context<T | undefined>,
  value: T | undefined,
  inner: () => JSX.Element,
): () => JSX.Element {
  if (value === undefined || value === null) return inner
  return () =>
    createComponent(context.Provider, {
      value,
      get children() {
        return inner()
      },
    })
}

/**
 * A provider of one service, whose tree is re-created when the service changes.
 *
 * @param context - The context the service's primitives read.
 * @param value - Reads the service prop.
 * @param children - Reads the children prop.
 * @returns The provided tree.
 */
export function serviceProvider<T extends object>(
  context: Context<T | undefined>,
  value: () => T,
  children: () => JSX.Element,
): JSX.Element {
  return Show({
    get when() {
      return value()
    },
    keyed: true,
    children: (service: T) => wrap(context, service, children)(),
  })
}
