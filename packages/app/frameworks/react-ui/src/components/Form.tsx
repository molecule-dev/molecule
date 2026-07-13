/**
 * Form components.
 *
 * @module
 */

import React, { forwardRef, useId } from 'react'

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
    // Fall back to a generated id when `name` is absent so `htmlFor`/the
    // error-message id never resolve to the literal string "undefined" —
    // and so they never collide across multiple id-less FormFields on the
    // same page (same class of bug fixed inside Input/Select/Textarea).
    const generatedId = useId()
    const fieldId = name || generatedId
    const errorId = `${fieldId}-error`
    const hintId = `${fieldId}-hint`
    const describedBy = error ? errorId : hint ? hintId : undefined

    // The error/hint <p> below is a same-DOM sibling — invisible to a
    // screen reader unless something actually points `aria-describedby` at
    // it. When `children` is a single real element (the common case: one
    // Input/Select/Textarea), inject `id`/`aria-describedby`/`aria-invalid`
    // onto it directly so its own label association and the announced
    // description both resolve correctly. Composite/text children can't be
    // safely cloned into, so they fall back to label-only association —
    // consumers with custom composite fields should wire their own
    // `aria-describedby` (Input/Select/Textarea's own `error` prop remains
    // the fully-automatic path).
    const singleChild = React.isValidElement<Record<string, unknown>>(children) ? children : null
    const content: React.ReactNode = singleChild
      ? React.cloneElement(singleChild, {
          id: (singleChild.props.id as string | undefined) || fieldId,
          ...(describedBy
            ? {
                'aria-describedby': [
                  singleChild.props['aria-describedby'] as string | undefined,
                  describedBy,
                ]
                  .filter(Boolean)
                  .join(' '),
              }
            : {}),
          ...(error ? { 'aria-invalid': true } : {}),
        })
      : (children as React.ReactNode)

    return (
      <div
        ref={ref}
        className={cm.cn(cm.inputWrapper, cm.sp('mb', 4), className)}
        style={style}
        data-testid={testId}
      >
        {label && (
          <label
            htmlFor={
              singleChild ? (singleChild.props.id as string | undefined) || fieldId : fieldId
            }
            className={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
          >
            {label}
          </label>
        )}
        {content}
        {error && (
          <p id={errorId} className={cm.formError}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className={cm.formHint}>
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
