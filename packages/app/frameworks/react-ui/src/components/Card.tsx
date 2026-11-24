/**
 * Card component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { CardProps, CardSectionProps, KitKeyboardEvent } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

import { rootProps } from '../utilities/rootProps.js'

const variantMap: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
  elevated: 'elevated',
  outlined: 'outline',
  filled: 'default',
}

/**
 * Card component.
 */
export const Card = forwardRef<HTMLDivElement, CardProps & { 'data-mol-id'?: string }>(
  (
    {
      children,
      variant = 'elevated',
      interactive,
      padding = 'md',
      className,
      style,
      testId,
      onClick,
      onKeyDown,
      disabled,
      onDoubleClick,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onKeyUp,
      onKeyPress,
      tabIndex,
      role,
      ...rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    const paddingClass = padding === 'none' ? '' : cm.cardPadding(padding)
    const cardVariant = variantMap[variant] || 'default'

    const cardClasses = cm.cn(
      cm.card({ variant: cardVariant }),
      paddingClass,
      interactive && cm.cardInteractive,
      className,
    )
    const content = children as React.ReactNode

    // Every handler and the caller's own props reach the card. A disabled card never calls
    // onClick; on a device a card with a handler or a tab stop is pressable.
    const common = {
      as: 'div',
      ref,
      className: cardClasses,
      webStyle: style,
      'data-testid': testId,
      ...rootProps(rest),
      onClick: disabled ? undefined : onClick,
      onDoubleClick,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onKeyUp,
      onKeyPress,
    } as const
    if (!interactive) {
      return (
        <Box {...common} role={role} tabIndex={tabIndex} onKeyDown={onKeyDown}>
          {content}
        </Box>
      )
    }

    // An interactive card is announced as a button and sits in the tab order, so
    // Enter and Space activate it the way they activate a native button: by
    // clicking it, which runs `onClick` with a real click event. Keys pressed in a
    // control inside the card belong to that control. The caller's `onKeyDown` runs
    // first; its preventDefault() cancels the activation, as it does on a native button.
    // A disabled interactive card is announced as disabled and leaves the tab order. A device
    // has no keyboard events: a press calls onClick there.
    const handleKeyDown = (event: KitKeyboardEvent): void => {
      onKeyDown?.(event)
      if (event.defaultPrevented || disabled) return
      if (event.target !== event.currentTarget) return
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      const target = event.currentTarget
      if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) target.click()
    }

    return (
      <Pressable
        {...common}
        // A caller's role or tabIndex replaces the interactive default.
        role={role ?? 'button'}
        tabIndex={tabIndex ?? (disabled ? -1 : 0)}
        aria-disabled={disabled ? true : undefined}
        onKeyDown={handleKeyDown}
      >
        {content}
      </Pressable>
    )
  },
)

Card.displayName = 'Card'

/**
 * Card header component.
 */
export const CardHeader = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className, style, ...props }, ref) => {
    const cm = getClassMap()

    return (
      <Box
        as="div"
        ref={ref}
        className={cm.cn(cm.cardHeader, className)}
        webStyle={style}
        {...props}
      >
        {children as React.ReactNode}
      </Box>
    )
  },
)

CardHeader.displayName = 'CardHeader'

/**
 * Card title component.
 */
export const CardTitle = forwardRef<HTMLHeadingElement, CardSectionProps>(
  ({ children, className, style, ...props }, ref) => {
    const cm = getClassMap()

    return (
      <Text
        as="h3"
        ref={ref}
        className={cm.cn(cm.cardTitle, className)}
        webStyle={style}
        {...props}
      >
        {children as React.ReactNode}
      </Text>
    )
  },
)

CardTitle.displayName = 'CardTitle'

/**
 * Card description component.
 */
export const CardDescription = forwardRef<HTMLParagraphElement, CardSectionProps>(
  ({ children, className, style, ...props }, ref) => {
    const cm = getClassMap()

    return (
      <Text
        as="p"
        ref={ref}
        className={cm.cn(cm.cardDescription, className)}
        webStyle={style}
        {...props}
      >
        {children as React.ReactNode}
      </Text>
    )
  },
)

CardDescription.displayName = 'CardDescription'

/**
 * Card content component.
 */
export const CardContent = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className, style, ...props }, ref) => {
    const cm = getClassMap()

    return (
      <Box
        as="div"
        ref={ref}
        className={cm.cn(cm.cardContent, className)}
        webStyle={style}
        {...props}
      >
        {children as React.ReactNode}
      </Box>
    )
  },
)

CardContent.displayName = 'CardContent'

/**
 * Card footer component.
 */
export const CardFooter = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className, style, ...props }, ref) => {
    const cm = getClassMap()

    return (
      <Box
        as="div"
        ref={ref}
        className={cm.cn(cm.cardFooter, className)}
        webStyle={style}
        {...props}
      >
        {children as React.ReactNode}
      </Box>
    )
  },
)

CardFooter.displayName = 'CardFooter'
