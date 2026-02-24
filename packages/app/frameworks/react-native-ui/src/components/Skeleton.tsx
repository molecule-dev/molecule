/**
 * Skeleton components for React Native.
 *
 * @module
 */

import React, { useEffect, useRef } from 'react'
import { Animated, View, type ViewStyle } from 'react-native'

import type { SkeletonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Skeleton component.
 * @param root0 - Component props.
 * @param root0.width - Skeleton width.
 * @param root0.height - Skeleton height.
 * @param root0.circle - Whether circular.
 * @param root0.animation - Animation type.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Skeleton element.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  circle,
  animation = 'pulse',
  className,
  testId,
}) => {
  const cm = getClassMap()
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (animation === 'pulse') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      )
      pulse.start()
      return () => pulse.stop()
    }
    return undefined
  }, [animation, opacity])

  const classes = cm.cn(
    cm.skeleton(),
    animation === 'wave' && cm.skeletonWave,
    animation === 'none' && cm.skeletonNone,
    circle && cm.skeletonCircle,
    className,
  )

  const sizeStyle: ViewStyle = {
    ...(width !== undefined ? { width: width as ViewStyle['width'] } : {}),
    ...(height !== undefined ? { height: height as ViewStyle['height'] } : {}),
    ...(circle && width ? { borderRadius: typeof width === 'number' ? width / 2 : undefined } : {}),
  }

  return (
    <Animated.View
      className={classes}
      style={[sizeStyle, { opacity: animation === 'pulse' ? opacity : 1 }]}
      testID={testId}
    />
  )
}

/**
 * Renders a SkeletonText component.
 * @param root0 - Component props.
 * @param root0.lines - Number of text lines.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered SkeletonText element.
 */
export const SkeletonText: React.FC<{
  lines?: number
  className?: string
  testId?: string
}> = ({ lines = 3, className, testId }) => {
  const cm = getClassMap()
  return (
    <View className={cm.cn(cm.skeletonTextContainer, className)} testID={testId}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '75%' : '100%'} />
      ))}
    </View>
  )
}

/**
 * Renders a SkeletonCircle component.
 * @param root0 - Component props.
 * @param root0.size - Circle diameter.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered SkeletonCircle element.
 */
export const SkeletonCircle: React.FC<{
  size?: number
  className?: string
  testId?: string
}> = ({ size = 40, className, testId }) => {
  return <Skeleton width={size} height={size} circle className={className} testId={testId} />
}
