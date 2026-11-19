/**
 * Skeleton component.
 *
 * @module
 */

import { createMemo, Index, splitProps } from 'solid-js'

import type { SkeletonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'

/**
 * Renders the Skeleton component.
 * @param props - The component props.
 * @returns The rendered skeleton JSX.
 */
export const Skeleton = withDisplayName<WithRef<SkeletonProps, HTMLDivElement>>((props) => {
  const [local, rest] = splitProps(props, [
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

  const skeletonClasses = (): string =>
    cm.cn(
      cm.skeleton(),
      local.circle && cm.skeletonCircle,
      (local.animation ?? 'pulse') === 'none' && cm.skeletonNone,
      local.animation === 'wave' && cm.skeletonWave,
      local.className,
    )

  const computedStyle = (): Record<string, string | number | undefined> => {
    const style: Record<string, string | number | undefined> = {
      ...local.style,
      width: typeof local.width === 'number' ? `${local.width}px` : local.width,
      height: typeof local.height === 'number' ? `${local.height}px` : local.height,
      borderRadius: local.circle
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

  return (
    <div
      class={skeletonClasses()}
      style={toStyleProps(computedStyle())}
      data-testid={local.testId}
      {...reactDomProps(rest)}
    />
  )
}, 'Skeleton')

/**
 * Renders the SkeletonText component (placeholder text lines).
 * @param props - The component props (`lines` defaults to 3).
 * @returns The rendered skeleton text JSX.
 */
export const SkeletonText = withDisplayName<
  WithRef<{ lines?: number; className?: string }, HTMLDivElement>
>((props) => {
  const [local] = splitProps(props, ['ref'])
  const cm = getClassMap()
  const lines = createMemo(() => props.lines ?? 3)

  return (
    <div
      ref={(el) => {
        if (typeof local.ref === 'function') local.ref(el)
      }}
      class={cm.cn(cm.skeletonTextContainer, props.className)}
    >
      {/* React keys the lines `key={i}`, so `<Index>` — a position's node
          survives a line-count change and its width updates. */}
      <Index each={Array.from({ length: lines() }, (_, i) => i)}>
        {(i) => <Skeleton height={16} width={i() === lines() - 1 ? '60%' : '100%'} />}
      </Index>
    </div>
  )
}, 'SkeletonText')

/**
 * Renders the SkeletonCircle component (avatar placeholder).
 * @param props - The component props (`size` defaults to 40).
 * @returns The rendered skeleton circle JSX.
 */
export const SkeletonCircle = withDisplayName<
  WithRef<{ size?: number; className?: string }, HTMLDivElement>
>(
  (props) => (
    <Skeleton
      circle
      width={props.size ?? 40}
      height={props.size ?? 40}
      className={props.className}
      ref={props.ref}
    />
  ),
  'SkeletonCircle',
)
