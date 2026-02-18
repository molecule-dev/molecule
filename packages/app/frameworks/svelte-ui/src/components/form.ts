/**
 * Form component class generator for Svelte.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating form field classes.
 */
export interface FormFieldClassOptions {
  className?: string
}

/**
 * Generate classes for a form field wrapper.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getFormFieldClasses, getFormLabelClasses, getFormErrorClass, getFormHintClass } from '`@molecule/app-ui-svelte`'
 * </script>
 * <form on:submit|preventDefault={handleSubmit}>
 *   <fieldset disabled={submitting} class="contents">
 *     <div class={getFormFieldClasses()}>
 *       <label for={name} class={getFormLabelClasses({ required })}>{label}</label>
 *       <slot />
 *       {#if error}<p class={getFormErrorClass()}>{error}</p>{/if}
 *       {#if hint && !error}<p class={getFormHintClass()}>{hint}</p>{/if}
 *     </div>
 *   </fieldset>
 * </form>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getFormFieldClasses(options: FormFieldClassOptions = {}): string {
  const { className } = options
  const cm = getClassMap()
  return cm.cn(cm.formField, className)
}

/**
 * Generate classes for a form label.
 *
 * @param options - The options.
 * @param options.required - Whether the field is required.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getFormLabelClasses(
  options: { required?: boolean; className?: string } = {},
): string {
  const { required = false, className } = options
  const cm = getClassMap()
  return cm.cn(cm.label({ required }), cm.labelBlock, className)
}

/**
 * Form fieldset class (for disabled state wrapping).
 *
 * @returns The form fieldset class string.
 */
export function getFormFieldsetClass(): string {
  return getClassMap().formFieldset
}

/**
 * Form fieldset class constant.
 *
 * @deprecated Use getFormFieldsetClass() instead.
 */
export const formFieldsetClass = /* @__PURE__ */ getClassMap().formFieldset

/**
 * Get the form error message class string.
 *
 * @returns The form error class string.
 */
export function getFormErrorClass(): string {
  return getClassMap().formError
}

/**
 * Get the form hint message class string.
 * @returns The resulting string.
 */
export function getFormHintClass(): string {
  return getClassMap().formHint
}
