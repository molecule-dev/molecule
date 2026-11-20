/**
 * Card component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { CardProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { rootProps } from '../utilities/rootProps.js'

const variantMap: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
  elevated: 'elevated',
  outlined: 'outline',
  filled: 'default',
}

// paddingMap removed — use cm.cardPadding(size) instead

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

    // An interactive card is announced as a button and sits in the tab order, so
    // Enter and Space activate it the way they activate a native button: by
    // clicking it, which runs `onClick` with a real click event. Keys pressed in a
    // control inside the card belong to that control. The caller's `onKeyDown` runs
    // first; its preventDefault() cancels the activation, as it does on a native button.
    // A disabled card, like a disabled button, never calls onClick: an interactive one is
    // announced as disabled and leaves the tab order.
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
      onKeyDown?.(event)
      if (event.defaultPrevented || !interactive || disabled) return
      if (event.target !== event.currentTarget) return
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.currentTarget.click()
    }

    return (
      <div
        ref={ref}
        className={cardClasses}
        style={style}
        data-testid={testId}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? (disabled ? -1 : 0) : undefined}
        aria-disabled={interactive && disabled ? true : undefined}
        // Every other declared prop (id, title, aria-*, data-*, the DOM event handlers) reaches
        // the div, as Container's do; a caller's role or tabIndex replaces the interactive default.
        {...rootProps(rest)}
        onClick={disabled ? undefined : onClick}
        onKeyDown={handleKeyDown}
      >
        {children as React.ReactNode}
      </div>
    )
  },
)

Card.displayName = 'Card'

/**
 * Card header component.
 */
export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    const cm = getClassMap()

    return (
      <div ref={ref} className={cm.cn(cm.cardHeader, className)} {...props}>
        {children}
      </div>
    )
  },
)

CardHeader.displayName = 'CardHeader'

/**
 * Card title component.
 */
export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className, ...props }, ref) => {
    const cm = getClassMap()

    return (
      <h3 ref={ref} className={cm.cn(cm.cardTitle, className)} {...props}>
        {children}
      </h3>
    )
  },
)

CardTitle.displayName = 'CardTitle'

/**
 * Card description component.
 */
export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ children, className, ...props }, ref) => {
  const cm = getClassMap()

  return (
    <p ref={ref} className={cm.cn(cm.cardDescription, className)} {...props}>
      {children}
    </p>
  )
})

CardDescription.displayName = 'CardDescription'

/**
 * Card content component.
 */
export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    const cm = getClassMap()

    return (
      <div ref={ref} className={cm.cn(cm.cardContent, className)} {...props}>
        {children}
      </div>
    )
  },
)

CardContent.displayName = 'CardContent'

/**
 * Card footer component.
 */
export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    const cm = getClassMap()

    return (
      <div ref={ref} className={cm.cn(cm.cardFooter, className)} {...props}>
        {children}
      </div>
    )
  },
)

CardFooter.displayName = 'CardFooter'
