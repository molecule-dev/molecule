/**
 * PulseDots: decorative typing activity paint on React Native.
 *
 * @module
 */

import { type ReactElement, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { AccessibilityInfo, Animated, Easing } from 'react-native'

import { DEFAULT_TYPING_PULSE, getClassMap, type PulseDotsProps } from '@molecule/app-ui'

import { registerInline } from './flow.js'
import { Circle, Svg } from './Svg.js'

const stationary = { opacity: 1, transform: [{ scale: 1 }] }

/**
 * Draws three decorative dots with the ClassMap pulse and the OS reduced-motion preference.
 *
 * @param props - See {@link PulseDotsProps}.
 * @returns Three animated views, with the caller providing their layout and status semantics.
 */
export function PulseDots({ size, durationMs }: PulseDotsProps): ReactElement {
  const { peakAt, restAt, stagger, dimOpacity, dimScale } =
    getClassMap().typingPulse ?? DEFAULT_TYPING_PULSE
  const [motionAllowed, setMotionAllowed] = useState(false)
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(1)))
  const animate = motionAllowed && durationMs > 0 && Number.isFinite(durationMs)
  const paint = useMemo(
    () =>
      dots.map((dot) => ({
        opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [dimOpacity, 1] }),
        transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [dimScale, 1] }) }],
      })),
    [dots, dimOpacity, dimScale],
  )

  useEffect(() => {
    let useInitialPreference = true
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      useInitialPreference = false
      setMotionAllowed(!reduced)
    })
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (reduced) => {
        if (useInitialPreference) setMotionAllowed(!reduced)
      },
      (_error: unknown) => {
        // Keep the stationary dots when the OS cannot supply its preference.
      },
    )
    return () => {
      useInitialPreference = false
      subscription.remove()
    }
  }, [])

  useLayoutEffect(() => {
    if (!animate) return

    const easeInOut = Easing.bezier(0.42, 0, 0.58, 1)
    // Timing goes from one to zero, leaving the dot fully lit during its initial delay.
    // The easing encodes the complete cycle so the native driver can repeat it on its own.
    const easing = (fraction: number): number => {
      if (fraction < peakAt) return 1 - easeInOut(fraction / peakAt)
      if (fraction < restAt) return easeInOut((fraction - peakAt) / (restAt - peakAt))
      return 1
    }
    const loops = dots.map((dot, index) => {
      dot.setValue(1)
      const loop = Animated.loop(
        Animated.timing(dot, {
          toValue: 0,
          duration: durationMs,
          delay: index * durationMs * stagger,
          easing,
          isInteraction: false,
          useNativeDriver: true,
        }),
      )
      loop.start()
      return loop
    })
    return () => {
      for (const loop of loops) loop.stop()
    }
  }, [animate, dots, durationMs, peakAt, restAt, stagger])

  return (
    <>
      {dots.map((_, index) => (
        <Animated.View
          key={index}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[{ width: size, height: size }, animate ? paint[index] : stationary]}
        >
          <Svg width={size} height={size} aria-hidden>
            <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="currentColor" />
          </Svg>
        </Animated.View>
      ))}
    </>
  )
}

registerInline(PulseDots, () => 'box')
