/**
 * Card component for React Native.
 *
 * @module
 */

import React from 'react'
import { Pressable, Text, View } from 'react-native'

import type { CardProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
 * @param root0.onClick - Click handler.
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
}) => {
  const cm = getClassMap()
  const classes = cm.cn(
    cm.card({ variant: variant as 'default' | 'elevated' | 'outline' | 'ghost' }),
    cm.cardPadding(padding),
    interactive && cm.cardInteractive,
    className,
  )

  const Wrapper = onClick || interactive ? Pressable : View

  return (
    <Wrapper
      className={classes}
      style={style as object}
      testID={testId}
      {...(onClick ? { onPress: onClick as unknown as () => void } : {})}
      {...(onClick ? { accessibilityRole: 'button' as const } : {})}
    >
      {children as React.ReactNode}
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
