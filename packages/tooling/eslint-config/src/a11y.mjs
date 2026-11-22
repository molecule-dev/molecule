/**
 * The accessibility plugins with one correction: a focusable `separator` counts as the
 * widget WAI-ARIA makes it.
 *
 * @module
 */

import jsxA11y from 'eslint-plugin-jsx-a11y'

/**
 * jsx-a11y, except that a focusable `separator` counts as the widget WAI-ARIA makes it. ARIA 1.2: a separator
 * that is focusable is a widget (a window splitter the keyboard moves) and must then carry `aria-valuenow`.
 * aria-query files every separator under "structure", so the plugin reported a correct splitter's `tabIndex`
 * and its key handler, and the only way to pass was to drop the keyboard support. Neither rule's options can
 * name a role-plus-attribute pair, so these two rules skip exactly the reports on a literal
 * `role="separator"` element that has `aria-valuenow`; a separator without it, and every other element, is
 * judged as before.
 */
const isFocusableSeparator = (node) =>
  node?.type === 'JSXOpeningElement' &&
  node.attributes.some(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name.name === 'role' &&
      a.value?.type === 'Literal' &&
      a.value.value === 'separator',
  ) &&
  node.attributes.some((a) => a.type === 'JSXAttribute' && a.name.name === 'aria-valuenow')
const separatorAware = (rule) => ({
  meta: rule.meta,
  create(context) {
    const report = (descriptor) => {
      const element =
        descriptor.node.type === 'JSXOpeningElement' ? descriptor.node : descriptor.node.parent
      if (!isFocusableSeparator(element)) context.report(descriptor)
    }
    return rule.create(Object.create(context, { report: { value: report } }))
  },
})

/**
 * eslint-plugin-jsx-a11y with the two rules that misjudge a focusable separator corrected.
 */
export const jsxA11yGate = {
  ...jsxA11y,
  rules: {
    ...jsxA11y.rules,
    'no-noninteractive-tabindex': separatorAware(jsxA11y.rules['no-noninteractive-tabindex']),
    'no-noninteractive-element-interactions': separatorAware(
      jsxA11y.rules['no-noninteractive-element-interactions'],
    ),
  },
}

/**
 * eslint-plugin-vuejs-accessibility with the same correction as {@link jsxA11yGate}: the plugin
 * calls a focusable `separator` (a window splitter with `aria-valuenow`) a static element, so
 * `no-static-element-interactions` skips exactly the reports on one.
 *
 * @param {import('eslint').ESLint.Plugin} vueA11y - The loaded `eslint-plugin-vuejs-accessibility` module.
 * @returns {import('eslint').ESLint.Plugin} The plugin with the corrected rule.
 */
export function vueA11yGate(vueA11y) {
  const isFocusableSeparator = (node) => {
    const attributes = node?.type === 'VElement' ? node.startTag.attributes : []
    const role = attributes.find((a) => !a.directive && a.key.name === 'role')
    const valueNow = attributes.some((a) =>
      a.directive
        ? a.key.name.name === 'bind' && a.key.argument?.name === 'aria-valuenow'
        : a.key.name === 'aria-valuenow',
    )
    return role?.value?.value === 'separator' && valueNow
  }
  const staticInteractions = vueA11y.rules['no-static-element-interactions']
  return {
    ...vueA11y,
    rules: {
      ...vueA11y.rules,
      'no-static-element-interactions': {
        meta: staticInteractions.meta,
        create(context) {
          const report = (descriptor) => {
            if (!isFocusableSeparator(descriptor.node)) context.report(descriptor)
          }
          return staticInteractions.create(Object.create(context, { report: { value: report } }))
        },
      },
    },
  }
}
