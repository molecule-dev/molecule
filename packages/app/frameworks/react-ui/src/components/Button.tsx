/**
 * Button component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { ButtonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Spinner } from './Spinner.js'

/**
 * Button component.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'solid',
      color = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      style,
      testId,
      disabled,
      type = 'button',
      onClick,
      ...rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    const classes = cm.cn(cm.button({ variant, color, size, fullWidth }), className)

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        style={style}
        data-testid={testId}
        disabled={disabled || loading}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
        aria-busy={loading}
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {loading && <Spinner size="sm" className={cm.buttonIconLeft} />}
        {!loading && !!leftIcon && (
          <span className={cm.buttonIconLeft}>{leftIcon as React.ReactNode}</span>
        )}
        {loading && loadingText ? loadingText : (children as React.ReactNode)}
        {!loading && !!rightIcon && (
          <span className={cm.buttonIconRight}>{rightIcon as React.ReactNode}</span>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
