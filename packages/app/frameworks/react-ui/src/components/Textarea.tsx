/**
 * Textarea component.
 *
 * @module
 */

import React, { forwardRef, useCallback, useEffect, useId, useRef } from 'react'

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
    // Always track the node in internalRef (for autoResize) AND forward it to
    // the caller's ref. The previous `(ref || internalRef) as RefObject` cast
    // silently broke autoResize whenever the caller passed a CALLBACK ref
    // (functions have no `.current`).
    const internalRef = useRef<HTMLTextAreaElement | null>(null)
    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref],
    )

    const cm = getClassMap()
    // Fall back to a generated id so label htmlFor / aria-describedby never
    // point at `undefined-error` (which also collides across multiple
    // id-less textareas on the same page).
    const generatedId = useId()
    const textareaId = id || name || generatedId

    const resize = useCallback(() => {
      const element = internalRef.current
      if (!autoResize || !element) return
      element.style.height = 'auto'
      const lineHeight = parseInt(getComputedStyle(element).lineHeight) || 20
      const minHeight = minRows * lineHeight
      const maxHeight = maxRows ? maxRows * lineHeight : Infinity
      const newHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)
      element.style.height = `${newHeight}px`
    }, [autoResize, minRows, maxRows])

    // Controlled usage (value tracked by the caller) recomputes here.
    useEffect(() => {
      resize()
    }, [value, resize])

    // Uncontrolled usage (defaultValue + the user typing) never changes
    // `value`, so the effect above never re-runs — autoResize silently did
    // nothing for every uncontrolled textarea. Listening for real `input`
    // events on the element itself catches keystrokes, paste, and IME
    // composition regardless of whether the caller tracks `value`.
    useEffect(() => {
      const element = internalRef.current
      if (!autoResize || !element) return
      element.addEventListener('input', resize)
      return () => element.removeEventListener('input', resize)
    }, [autoResize, resize])

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
          ref={setRefs}
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
