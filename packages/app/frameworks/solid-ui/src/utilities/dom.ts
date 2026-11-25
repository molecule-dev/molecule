/**
 * Internal DOM-prop helpers shared by every component.
 *
 * The package ships preserved JSX. Under the hyperscript runtime the tests
 * render through (`solid-js/h`), and under `vite-plugin-solid` in a consumer
 * build, the one prop form that stays reactive in BOTH is a spread object with
 * a getter (`<div {...{ get class() { … } }}>`): hyperscript routes getter
 * descriptors through `spread()`, and the real Solid compiler emits
 * `spread(el, obj)` for JSX spreads, whose runtime reads getters inside a
 * render effect. Plain attribute expressions are eager in the hyperscript
 * runtime, so they are only used for values that never change.
 *
 * @module
 */

import { mergeProps, type Ref, splitProps } from 'solid-js'

export { toStyleProps } from '../style.js'

/**
 * A component's props plus the `ref` Solid passes the component. Solid hands a
 * component its ref as a callback prop: a component whose rest spread sits on
 * its ref element (the element that takes the caller's `className` and `style`,
 * as `BaseProps` documents) lets that spread call it.
 *
 * @template P - The component's own props.
 * @template E - The element the caller's ref receives.
 */
export type WithRef<P, E extends Element> = P & { ref?: Ref<E> }

/**
 * Writes the reflected `checked` attribute of a controlled checkbox or radio
 * when it is created, the way React does: react-dom sets the attribute at
 * creation and only the property on later renders, so a box created unchecked
 * and checked afterwards has no attribute, and one created checked keeps it.
 * Call it once, from the input's `ref`; the JSX `checked` binding keeps the
 * live property in step. `undefined` leaves an uncontrolled input alone.
 *
 * @param element - The checkbox or radio, as its `ref` receives it.
 * @param checked - The controlled value at creation, or `undefined` when uncontrolled.
 */
export function reflectCheckedAtCreation(
  element: HTMLInputElement,
  checked: boolean | undefined,
): void {
  if (checked === true) element.setAttribute('checked', '')
  else if (checked === false) element.removeAttribute('checked')
}

/**
 * React's rest spread for a Solid element. React's `onFocus` and `onBlur` listen to the
 * bubbling `focusin` and `focusout`, and its `onDoubleClick` to `dblclick`, while Solid
 * attaches `on` + the lowercased prop name: spread raw, those three would hear the
 * non-bubbling `focus` and `blur` (so focus moving onto a child never reaches a container)
 * and a `doubleclick` event nothing dispatches. Returns the same props, still reactive, with
 * those three under Solid's `onFocusIn`, `onFocusOut` and `onDblClick`, and with
 * `BaseProps.automationId` as the `data-mol-id` attribute it documents.
 *
 * @param props - The rest props a component spreads onto its element.
 * @returns The props to spread, with React's aliased names renamed.
 */
export function reactDomProps(props: Record<string, unknown>): Record<string, unknown> {
  const [aliased, others] = splitProps(props, [
    'onFocus',
    'onBlur',
    'onDoubleClick',
    'automationId',
  ])
  return mergeProps(others, {
    get onFocusIn() {
      return aliased.onFocus
    },
    get onFocusOut() {
      return aliased.onBlur
    },
    get onDblClick() {
      return aliased.onDoubleClick
    },
    get 'data-mol-id'() {
      return aliased.automationId
    },
  })
}
