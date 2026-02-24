/**
 * Form components.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { FormFieldProps, FormProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Form component.
 */
export const Form = forwardRef<HTMLFormElement, FormProps>(
  (
    {
      children,
      onFormSubmit,
      submitting,
      className,
      style,
      testId,
      onSubmit,
      action,
      method,
      noValidate,
      ...rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
      if (onFormSubmit) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data: Record<string, unknown> = {}
        formData.forEach((value, key) => {
          data[key] = value
        })
        onFormSubmit(data)
      }
      onSubmit?.(e as unknown as Event)
    }

    return (
      <form
        ref={ref}
        className={className}
        style={style}
        data-testid={testId}
        action={action}
        method={method}
        noValidate={noValidate}
        onSubmit={handleSubmit}
        {...(rest as React.FormHTMLAttributes<HTMLFormElement>)}
      >
        <fieldset disabled={submitting} className={cm.formFieldsetContents}>
          {children as React.ReactNode}
        </fieldset>
      </form>
    )
  },
)

Form.displayName = 'Form'

/**
 * Form field wrapper component.
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ children, label, name, error, hint, required, className, style, testId }, ref) => {
    const cm = getClassMap()

    return (
      <div
        ref={ref}
        className={cm.cn(cm.inputWrapper, cm.sp('mb', 4), className)}
        style={style}
        data-testid={testId}
      >
        {label && (
          <label
            htmlFor={name}
            className={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
          >
            {label}
          </label>
        )}
        {children as React.ReactNode}
        {error && (
          <p id={`${name}-error`} className={cm.formError}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${name}-hint`} className={cm.formHint}>
            {hint}
          </p>
        )}
      </div>
    )
  },
)

FormField.displayName = 'FormField'

/**
 * Label component.
 */
export const Label = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ children, required, className, ...props }, ref) => {
  const cm = getClassMap()

  return (
    <label ref={ref} className={cm.cn(cm.label({ required: !!required }), className)} {...props}>
      {children}
    </label>
  )
})

Label.displayName = 'Label'
