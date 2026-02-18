/**
 * Card component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { CardProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

const variantMap: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
  elevated: 'elevated',
  outlined: 'outline',
  filled: 'default',
}

// paddingMap removed — use cm.cardPadding(size) instead

/**
 * Card component.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
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

    return (
      <div
        ref={ref}
        className={cardClasses}
        style={style}
        data-testid={testId}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLDivElement>}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
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
