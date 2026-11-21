import type { Component, JSX } from 'solid-js'
import { splitProps } from 'solid-js'

/**
 * Stand-in for `@molecule/app-ui-solid`'s `Button` in the unit tests: renders
 * the marker attribute and forwards `aria-pressed`, the same observable
 * contract the React suite's `Button` mock has.
 *
 * @param props - The button props; `children` and `aria-pressed` are used.
 * @returns The rendered button.
 */
export const MockButton: Component<{ children?: JSX.Element } & Record<string, unknown>> = (
  props,
) => {
  const [local] = splitProps(props, ['children', 'aria-pressed'])
  return (
    <button data-button="" aria-pressed={local['aria-pressed'] as boolean | undefined}>
      {local.children}
    </button>
  )
}
