/**
 * Skeleton component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { SkeletonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Skeleton component.
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width, height, circle, borderRadius, animation = 'pulse', className, style, testId }, ref) => {
    const cm = getClassMap()

    const skeletonClasses = cm.cn(
      cm.skeleton(),
      circle && cm.skeletonCircle,
      animation === 'none' && cm.skeletonNone,
      animation === 'wave' && cm.skeletonWave,
      className,
    )

    const computedStyle: React.CSSProperties = {
      ...style,
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      borderRadius: circle
        ? '9999px'
        : typeof borderRadius === 'number'
          ? `${borderRadius}px`
          : borderRadius,
    }

    // If circle, make width and height equal
    if (circle && width && !height) {
      computedStyle.height = computedStyle.width
    }

    return <div ref={ref} className={skeletonClasses} style={computedStyle} data-testid={testId} />
  },
)

Skeleton.displayName = 'Skeleton'

/**
 * Skeleton text line.
 */
export const SkeletonText = forwardRef<HTMLDivElement, { lines?: number; className?: string }>(
  ({ lines = 3, className }, ref) => {
    const cm = getClassMap()

    return (
      <div ref={ref} className={cm.cn(cm.skeletonTextContainer, className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} height={16} width={i === lines - 1 ? '60%' : '100%'} />
        ))}
      </div>
    )
  },
)

SkeletonText.displayName = 'SkeletonText'

/**
 * Skeleton circle (avatar placeholder).
 */
export const SkeletonCircle = forwardRef<HTMLDivElement, { size?: number; className?: string }>(
  ({ size = 40, className }, ref) => (
    <Skeleton ref={ref} circle width={size} height={size} className={className} />
  ),
)

SkeletonCircle.displayName = 'SkeletonCircle'
