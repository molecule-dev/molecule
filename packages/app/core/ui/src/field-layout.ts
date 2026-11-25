/**
 * The shared layout of a closed form control's wrappers.
 *
 * @module
 */

import type { UIClassMap } from './types.js'

/**
 * The classes for the two wrappers a closed form control (`Input`, `Select`, `Textarea`) puts
 * around its native element.
 *
 * Both wrappers are flex columns. On the web, a control's top and bottom margins collapse
 * through a block wrapper: the wrapper's neighbours move instead of the control, and a label
 * above the control changes where the control's margin shows up. React Native keeps the margins
 * inside. A column keeps them inside on every renderer, so a field sits at the same place in a
 * browser and on a device.
 *
 * - `root` goes on the outer wrapper: the field's full-width column, which holds the label, the
 *   control's row and the error or hint line.
 * - `inner` goes on the row that holds the control and its adornments (a leading icon, a clear
 *   button), which the row positions. `Textarea` has no adornments and uses `root` alone.
 *
 * A caller's `className`, `style`, ref and test id stay on the control itself. Moving them to a
 * wrapper would move the caller's border, focus ring and typography with them. A wrapper that
 * takes arbitrary children (`FormField`) keeps the plain `inputWrapper` token.
 *
 * @param cm - The ClassMap the control renders with.
 * @returns `root`, the outer wrapper's classes, and `inner`, the control row's classes.
 */
export function fieldLayout(cm: UIClassMap): { root: string; inner: string } {
  return {
    root: cm.cn(cm.inputWrapper, cm.formFieldWrapper),
    inner: cm.cn(cm.inputInner, cm.formFieldWrapper),
  }
}
