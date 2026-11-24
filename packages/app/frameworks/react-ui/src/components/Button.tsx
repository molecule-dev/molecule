/**
 * Button component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { slot } from '@molecule/app-react/render'
import type { ButtonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { rootProps } from '../utilities/rootProps.js'
import { Spinner } from './Spinner.js'

/**
 * Button component.
 *
 * While `loading` is true, the native button is disabled and marked busy.
 * Drive it from the request's pending state so an unavailable interaction is
 * visible and the next click is accepted after the request settles. Loading
 * does not queue clicks; an app that must preserve every intent needs its own
 * serial action queue.
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
      leftIcon: leftIconProp,
      rightIcon: rightIconProp,
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
    const leftIcon = slot(leftIconProp as React.ReactNode)
    const rightIcon = slot(rightIconProp as React.ReactNode)
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
        onClick={onClick}
        aria-busy={loading}
        {...(rootProps(rest) as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {loading && <Spinner size="sm" className={cm.buttonIconLeft} />}
        {!loading && !!leftIcon && <span className={cm.buttonIconLeft}>{leftIcon}</span>}
        {loading && loadingText ? loadingText : (children as React.ReactNode)}
        {!loading && !!rightIcon && <span className={cm.buttonIconRight}>{rightIcon}</span>}
      </button>
    )
  },
)

Button.displayName = 'Button'
