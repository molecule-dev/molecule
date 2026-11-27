/**
 * Disclosure: a pressable summary and a mounted, collapsible body.
 *
 * @module
 */

import { type ReactElement, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'

import type { DisclosureProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { registerInline } from './flow.js'
import { useGridCell } from './grid.js'
import {
  dataAttributes,
  ElementScope,
  layoutChildren,
  splitClasses,
  useInheritedText,
  useTagClasses,
} from './inherited.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/** Tracks the applied open state and coalesces changes into one queued notification. */
function useExpanded(
  open: boolean | undefined,
  onToggle: DisclosureProps['onToggle'],
): { expanded: boolean; toggle: () => void } {
  const [expanded, setExpanded] = useState(open ?? false)
  const current = useRef(false)
  const callback = useRef(onToggle)
  const pending = useRef(false)
  const task = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const queue = useCallback(() => {
    pending.current = true
    if (task.current !== undefined) return
    task.current = setTimeout(() => {
      task.current = undefined
      pending.current = false
      callback.current?.(current.current)
    }, 0)
  }, [])
  const transition = useCallback(
    (next: boolean) => {
      if (current.current === next) return
      current.current = next
      setExpanded(next)
      queue()
    },
    [queue],
  )

  useLayoutEffect(() => {
    callback.current = onToggle
  }, [onToggle])
  // Reapply only when the parent changes the supplied value, as React does for the open attribute.
  useLayoutEffect(() => transition(open ?? false), [open, transition])
  useLayoutEffect(() => {
    // React can replay effect setup after cleanup while keeping state, e.g. in StrictMode.
    if (pending.current) queue()
    return () => {
      clearTimeout(task.current)
      task.current = undefined
    }
  }, [queue])
  return { expanded, toggle: () => transition(!current.current) }
}

/** Draws the summary as a button and keeps closed content mounted but inaccessible. */
export function Disclosure(props: DisclosureProps<ElementNode> & ElementRefProps): ReactElement {
  const { as, open, summary, summaryProps, onToggle, style, webStyle, children, ref } = props
  const { expanded, toggle } = useExpanded(open, onToggle)
  const split = splitClasses(
    useTagClasses(props.className, as),
    useInheritedText(),
    dataAttributes(props),
  )
  const summarySplit = splitClasses(
    useTagClasses(summaryProps?.className, 'summary', { first: true, last: children == null }),
    split.text,
    summaryProps && dataAttributes(summaryProps),
  )
  return (
    <View
      {...nativeAccessibility(props, as)}
      ref={useNativeRef<View>(ref)}
      className={split.view || undefined}
      style={[nativeStyle(style, webStyle), useGridCell()]}
    >
      <ElementScope split={split}>
        <Pressable
          {...nativeAccessibility({
            ...summaryProps,
            role: summaryProps?.role ?? 'button',
            children: summary,
          })}
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          className={summarySplit.view || undefined}
          onPress={toggle}
          style={nativeStyle(summaryProps?.style, summaryProps?.webStyle)}
        >
          <ElementScope split={summarySplit}>{layoutChildren(summary, summarySplit)}</ElementScope>
        </Pressable>
        <View
          accessibilityElementsHidden={expanded ? undefined : true}
          importantForAccessibility={expanded ? undefined : 'no-hide-descendants'}
          pointerEvents={expanded ? undefined : 'none'}
          style={expanded ? undefined : { display: 'none' }}
        >
          {layoutChildren(children, split)}
        </View>
      </ElementScope>
    </View>
  )
}

registerInline(Disclosure, () => null)
