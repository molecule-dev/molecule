/**
 * Textarea component.
 *
 * @module
 */

import { forwardRef, useId } from 'react'

import type { TextareaProps } from '@molecule/app-ui'
import { fieldLayout, getClassMap } from '@molecule/app-ui'
import { Box, Text, TextField } from '@molecule/app-ui-react/elements'

import { rootProps } from '../utilities/rootProps.js'

/**
 * Textarea component.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size,
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
      onValueChange,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    // A column around the label, the control and the message, so the control's margin moves
    // the control on every renderer (the same layout in every framework's kit).
    const field = fieldLayout(cm)
    // Fall back to a generated id so label htmlFor / aria-describedby never
    // point at `undefined-error` (which also collides across multiple
    // id-less textareas on the same page).
    const generatedId = useId()
    const textareaId = id || name || generatedId

    const textareaClasses = cm.cn(cm.textarea({ error: !!error, size }), className)

    return (
      <Box as="div" className={field.root}>
        {label && (
          <Text
            as="label"
            htmlFor={textareaId}
            className={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
          >
            {label}
          </Text>
        )}
        <TextField
          as="textarea"
          ref={ref}
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
          webStyle={autoResize ? { resize: 'none', ...style } : style}
          autoGrow={autoResize ? { minRows, maxRows } : undefined}
          data-testid={testId}
          onChange={onChange}
          onValueChange={onValueChange}
          onFocus={onFocus}
          onBlur={onBlur}
          {...rootProps(rest)}
        />
        {error && (
          <Text as="p" id={`${textareaId}-error`} className={cm.formError}>
            {error}
          </Text>
        )}
        {hint && !error && (
          <Text as="p" id={`${textareaId}-hint`} className={cm.formHint}>
            {hint}
          </Text>
        )}
      </Box>
    )
  },
)

Textarea.displayName = 'Textarea'
