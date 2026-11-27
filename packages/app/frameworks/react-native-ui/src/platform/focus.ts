/**
 * Native focus targets and the dialog's name and description.
 * @module
 */

import {
  createContext,
  type RefCallback,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react'
import { AccessibilityInfo, findNodeHandle, Platform, type Text, type View } from 'react-native'

import type { AriaAttributes, ElementHandle, OverlayTarget } from '@molecule/app-ui'

import { useReferencedLabelText } from '../elements/labels.js'

/** Focus candidates and dialog speech in one native presentation. */
export class NativeFocusScope {
  readonly controls = new Set<OverlayTarget>()
  readonly headings = new Set<OverlayTarget>()
  summary = ''
}

/** A presentation tracks its own candidates even while another modal covers it. */
export const NativeFocus = createContext(new NativeFocusScope())

let current: OverlayTarget | undefined

/** The last focused or activated native kit control, while it still exists. */
export function focusedNativeTarget(): OverlayTarget | undefined {
  return current?.current ? current : undefined
}

/** Registers a mounted control or heading and makes it available for focus restoration. */
export function useOverlayTarget<T extends ElementHandle>(
  forward: RefCallback<T> | undefined,
  kind: 'control' | 'heading' | undefined,
): { ref: RefCallback<T> | undefined; remember: () => void } {
  const scope = useContext(NativeFocus)
  const target = useRef<T>(null)
  const candidates =
    kind === 'control' ? scope.controls : kind === 'heading' ? scope.headings : undefined
  const ref = useCallback(
    (node: T | null): void => {
      target.current = node
      if (node) candidates?.add(target)
      else {
        candidates?.delete(target)
        if (current === target) current = undefined
      }
      forward?.(node)
    },
    [candidates, forward],
  )
  const remember = (): void => {
    if (target.current) current = target
  }
  return { ref: candidates || forward ? ref : undefined, remember }
}

/** Real RN host refs have native measurement methods in both Paper and Fabric. */
function isNativeHost(handle: ElementHandle): handle is View | Text {
  return 'measureInWindow' in handle && typeof handle.measureInWindow === 'function'
}

/** Focuses a mounted native target without depending on a React Native renderer private tag. */
export function focusNativeTarget(target: OverlayTarget | undefined): boolean {
  const node = target?.current
  if (!node || !isNativeHost(node)) return false
  const tag = findNodeHandle(node)
  if (tag === null) return false
  node.focus()
  AccessibilityInfo.setAccessibilityFocus(tag)
  current = target
  return true
}

/** Reads names and descriptions registered by actual Text children in this presentation. */
export function useDialogAccessibility(props: AriaAttributes): {
  'aria-label'?: string
  accessibilityHint?: string
} {
  const scope = useContext(NativeFocus)
  const modal = props['aria-modal'] === true || props['aria-modal'] === 'true'
  const title = useReferencedLabelText(modal ? props['aria-labelledby'] : undefined)
  const description = useReferencedLabelText(modal ? props['aria-describedby'] : undefined)
  const name = props['aria-label'] ?? title
  const summary = [name, description].filter(Boolean).join('. ')
  useLayoutEffect(() => {
    if (!modal) return
    scope.summary = summary
    return () => {
      scope.summary = ''
    }
  }, [scope, modal, summary])
  return modal ? { 'aria-label': name, accessibilityHint: description } : {}
}

/** Announces the dialog context without grouping or hiding its interactive children. */
export function announceDialog(summary: string): void {
  if (!summary) return
  if (Platform.OS === 'ios')
    AccessibilityInfo.announceForAccessibilityWithOptions(summary, { queue: true })
  else AccessibilityInfo.announceForAccessibility(summary)
}
