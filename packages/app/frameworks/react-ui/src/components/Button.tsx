/**
 * Button component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { slot } from '@molecule/app-react/render'
import type { ButtonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, registerInline } from '@molecule/app-ui-react/elements'

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
      <Pressable
        as="button"
        ref={ref}
        type={type}
        className={classes}
        webStyle={style}
        data-testid={testId}
        disabled={disabled || loading}
        onClick={onClick}
        aria-busy={loading}
        {...rootProps(rest)}
      >
        {loading && <Spinner size="sm" className={cm.buttonIconLeft} />}
        {!loading && !!leftIcon && (
          <Box as="span" className={cm.buttonIconLeft}>
            {leftIcon}
          </Box>
        )}
        {loading && loadingText ? loadingText : (children as React.ReactNode)}
        {!loading && !!rightIcon && (
          <Box as="span" className={cm.buttonIconRight}>
            {rightIcon}
          </Box>
        )}
      </Pressable>
    )
  },
)

Button.displayName = 'Button'

registerInline(Button, () => 'box')
