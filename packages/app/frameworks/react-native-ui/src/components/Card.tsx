/**
 * Card component for React Native.
 *
 * @module
 */

import React from 'react'
import { Pressable, Text, View } from 'react-native'

import { isReactNode } from '@molecule/app-react-ui-kit-components/helpers'
import { getClassMap } from '@molecule/app-ui'

import { splitClasses, wrapStrings } from '../elements/inherited.js'
import type { CardProps } from '../types.js'

/** A card's visual variant as the ClassMap names it (`filled` is the default surface). */
const variantMap: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
  elevated: 'elevated',
  outlined: 'outline',
  filled: 'default',
}

/**
 * Renders a Card component.
 * @param root0 - Component props.
 * @param root0.children - Card content.
 * @param root0.variant - Visual variant.
 * @param root0.padding - Padding size.
 * @param root0.interactive - Whether interactive.
 * @param root0.className - CSS class name override.
 * @param root0.style - Inline style object.
 * @param root0.testId - Test identifier.
 * @param root0.onClick - Called when the card is pressed.
 * @param root0.disabled - Whether the card is disabled.
 * @returns The rendered Card element.
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  interactive,
  className,
  style,
  testId,
  onClick,
  disabled,
}) => {
  const cm = getClassMap()
  const classes = cm.cn(
    cm.card({ variant: variantMap[variant] || 'default' }),
    cm.cardPadding(padding),
    interactive && cm.cardInteractive,
    className,
  )

  const Wrapper = onClick || interactive ? Pressable : View

  // Text goes in a Text with the classes the card hands its text, as on a device, where a view
  // neither holds text nor passes its text classes down.
  const text = splitClasses(classes, '').text

  return (
    <Wrapper
      className={classes}
      style={style as object}
      testID={testId}
      {...(onClick
        ? {
            onPress: () => onClick(),
            disabled,
            accessibilityRole: 'button' as const,
            accessibilityState: { disabled },
          }
        : {})}
    >
      {wrapStrings(isReactNode(children) ? children : undefined, text)}
    </Wrapper>
  )
}

/**
 * Renders a CardHeader component.
 * @param root0 - Component props.
 * @param root0.children - Header content.
 * @param root0.className - CSS class name override.
 * @returns The rendered CardHeader element.
 */
export const CardHeader: React.FC<{ children: unknown; className?: string }> = ({
  children,
  className,
}) => {
  const cm = getClassMap()
  return <View className={cm.cn(cm.cardHeader, className)}>{children as React.ReactNode}</View>
}

/**
 * Renders a CardTitle component.
 * @param root0 - Component props.
 * @param root0.children - Title content.
 * @param root0.className - CSS class name override.
 * @returns The rendered CardTitle element.
 */
export const CardTitle: React.FC<{ children: unknown; className?: string }> = ({
  children,
  className,
}) => {
  const cm = getClassMap()
  return <Text className={cm.cn(cm.cardTitle, className)}>{children as React.ReactNode}</Text>
}

/**
 * Renders a CardDescription component.
 * @param root0 - Component props.
 * @param root0.children - Description content.
 * @param root0.className - CSS class name override.
 * @returns The rendered CardDescription element.
 */
export const CardDescription: React.FC<{ children: unknown; className?: string }> = ({
  children,
  className,
}) => {
  const cm = getClassMap()
  return <Text className={cm.cn(cm.cardDescription, className)}>{children as React.ReactNode}</Text>
}

/**
 * Renders a CardContent component.
 * @param root0 - Component props.
 * @param root0.children - Body content.
 * @param root0.className - CSS class name override.
 * @returns The rendered CardContent element.
 */
export const CardContent: React.FC<{ children: unknown; className?: string }> = ({
  children,
  className,
}) => {
  const cm = getClassMap()
  return <View className={cm.cn(cm.cardContent, className)}>{children as React.ReactNode}</View>
}

/**
 * Renders a CardFooter component.
 * @param root0 - Component props.
 * @param root0.children - Footer content.
 * @param root0.className - CSS class name override.
 * @returns The rendered CardFooter element.
 */
export const CardFooter: React.FC<{ children: unknown; className?: string }> = ({
  children,
  className,
}) => {
  const cm = getClassMap()
  return <View className={cm.cn(cm.cardFooter, className)}>{children as React.ReactNode}</View>
}
