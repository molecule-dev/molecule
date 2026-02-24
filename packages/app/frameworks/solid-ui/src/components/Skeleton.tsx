/**
 * Skeleton component.
 *
 * @module
 */

import { type Component, For, splitProps } from 'solid-js'

import type { SkeletonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Skeleton component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Skeleton: Component<SkeletonProps> = (props) => {
  const [local] = splitProps(props, [
    'width',
    'height',
    'circle',
    'borderRadius',
    'animation',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const animation = (): string => local.animation ?? 'pulse'

  const skeletonClasses = (): string =>
    cm.cn(
      cm.skeleton(),
      local.circle && cm.skeletonCircle,
      animation() === 'none' && cm.skeletonNone,
      animation() === 'wave' && cm.skeletonWave,
      local.className,
    )

  const computedStyle = (): Record<string, string | undefined> => {
    const style: Record<string, string | undefined> = {
      ...local.style,
      width: typeof local.width === 'number' ? `${local.width}px` : local.width,
      height: typeof local.height === 'number' ? `${local.height}px` : local.height,
      'border-radius': local.circle
        ? '9999px'
        : typeof local.borderRadius === 'number'
          ? `${local.borderRadius}px`
          : local.borderRadius,
    }

    // If circle, make width and height equal
    if (local.circle && local.width && !local.height) {
      style.height = style.width
    }

    return style
  }

  return <div class={skeletonClasses()} style={computedStyle()} data-testid={local.testId} />
}

/**
 * Skeleton text line.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const SkeletonText: Component<{ lines?: number; class?: string }> = (props) => {
  const cm = getClassMap()
  const lines = (): number => props.lines ?? 3
  return (
    <div class={cm.cn(cm.skeletonTextContainer, props.class)}>
      <For each={Array.from({ length: lines() })}>
        {(_, i) => <Skeleton height={16} width={i() === lines() - 1 ? '60%' : '100%'} />}
      </For>
    </div>
  )
}

/**
 * Skeleton circle (avatar placeholder).
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const SkeletonCircle: Component<{ size?: number; class?: string }> = (props) => {
  const size = (): number => props.size ?? 40
  return <Skeleton circle width={size()} height={size()} className={props.class} />
}
