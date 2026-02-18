/**
 * Textarea component.
 *
 * @module
 */

import React, { forwardRef, useEffect, useRef } from 'react'

import type { TextareaProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Textarea component.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      autoResize,
      minRows = 3,
      maxRows,
      className,
      style,
      testId,
      disabled,
      required,
      value,
      defaultValue,
      placeholder,
      name,
      id,
      rows,
      onChange,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref || internalRef) as React.RefObject<HTMLTextAreaElement>

    const cm = getClassMap()
    const textareaId = id || name

    useEffect(() => {
      if (autoResize && textareaRef.current) {
        const element = textareaRef.current
        element.style.height = 'auto'
        const lineHeight = parseInt(getComputedStyle(element).lineHeight) || 20
        const minHeight = minRows * lineHeight
        const maxHeight = maxRows ? maxRows * lineHeight : Infinity
        const newHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)
        element.style.height = `${newHeight}px`
      }
    }, [value, autoResize, minRows, maxRows])

    const textareaClasses = cm.cn(cm.textarea({ error: !!error }), className)

    return (
      <div className={cm.inputWrapper}>
        {label && (
          <label
            htmlFor={textareaId}
            className={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
          >
            {label}
          </label>
        )}
        <textarea
          ref={textareaRef}
          id={textareaId}
          name={name}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows || minRows}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          className={textareaClasses}
          style={style}
          data-testid={testId}
          onChange={onChange as unknown as React.ChangeEventHandler<HTMLTextAreaElement>}
          onFocus={onFocus as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
          onBlur={onBlur as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
        {error && (
          <p id={`${textareaId}-error`} className={cm.formError}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className={cm.formHint}>
            {hint}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
