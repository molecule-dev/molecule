/**
 * The native `Pressable` props for an element's interaction props.
 *
 * @module
 */

import { createContext, useContext, useRef } from 'react'
import type { GestureResponderEvent, PressableProps as NativePressableProps } from 'react-native'

import { t } from '@molecule/app-i18n'
import type {
  InteractionProps,
  KitMouseEvent,
  MouseEventHandler,
  MousePressProps,
} from '@molecule/app-ui'

import { focusEvent, mouseEvent } from './events.js'
import { type PasteOwner, PasteScope } from './paste.js'

/** The containing anchor's click when a nested button owns the native press. */
export const AnchorPress = createContext<MouseEventHandler | undefined>(undefined)

/** Carries a container's context request to the pressable hit target that owns the gesture. */
export const ContextMenuScope = createContext<MouseEventHandler | undefined>(undefined)

type MouseTarget = InteractionProps & MousePressProps

/** The native props {@link pressProps} sets. */
export type NativePressProps = Pick<
  NativePressableProps,
  'focusable' | 'onPress' | 'onHoverIn' | 'onHoverOut' | 'onFocus' | 'onBlur'
>

/**
 * Whether an element is something the user can press, hover or focus on a device: it has a
 * handler a device fires, or a tab stop. Key handlers alone do not count (a device sends no key
 * events to a view).
 *
 * @param props - The element's interaction props.
 * @returns Whether it renders as a native `Pressable` rather than a `View`.
 */
export function isPressable(props: MouseTarget): boolean {
  return (
    props.onClick !== undefined ||
    props.onContextMenu !== undefined ||
    props.onMouseDown !== undefined ||
    props.onMouseEnter !== undefined ||
    props.onMouseLeave !== undefined ||
    props.onFocus !== undefined ||
    props.onBlur !== undefined ||
    props.tabIndex !== undefined
  )
}

/** Native press-in and context actions for the element that receives the touch. */
export function useMousePress(
  props: MouseTarget,
  base: NativePressProps,
  ownPaste?: PasteOwner,
  enabled = true,
): NativePressProps &
  Pick<
    NativePressableProps,
    | 'onPressIn'
    | 'onPressOut'
    | 'onLongPress'
    | 'onPointerDown'
    | 'accessibilityActions'
    | 'onAccessibilityAction'
  > {
  const inheritedContext = useContext(ContextMenuScope)
  const inheritedPaste = useContext(PasteScope)
  const paste = enabled ? (ownPaste ?? (base.focusable ? inheritedPaste : undefined)) : undefined
  const context = enabled ? (props.onContextMenu ?? inheritedContext) : undefined
  const onMouseDown = enabled ? props.onMouseDown : undefined
  const down = useRef<KitMouseEvent>(null)
  const contextLabel = context
    ? t('ui.contextMenu', undefined, { defaultValue: 'Context menu' })
    : ''
  const requestContext = (event?: GestureResponderEvent): void => {
    context?.(mouseEvent(event, 2))
  }
  return {
    ...base,
    onPressIn: onMouseDown
      ? (event) => {
          down.current = mouseEvent(event)
          onMouseDown(down.current)
        }
      : undefined,
    onPressOut: onMouseDown
      ? () => {
          const released = down.current
          // Pressability can deliver press-out immediately before press in the same turn.
          queueMicrotask(() => {
            if (down.current === released) down.current = null
          })
        }
      : undefined,
    onPress:
      base.onPress && onMouseDown
        ? (event) => {
            if (!down.current?.defaultPrevented) base.onPress?.(event)
            down.current = null
          }
        : base.onPress,
    onLongPress: context ? requestContext : paste?.showMenu,
    onPointerDown: context
      ? (event) => {
          if (event.nativeEvent.button !== 2) return
          event.stopPropagation()
          context(mouseEvent(event, 2))
        }
      : undefined,
    accessibilityActions:
      context || paste || (onMouseDown && !base.onPress)
        ? [
            ...(context ? [{ name: 'contextMenu', label: contextLabel }] : []),
            ...(paste ? [{ name: 'paste', label: paste.label }] : []),
            ...(onMouseDown && !base.onPress ? [{ name: 'activate' }] : []),
          ]
        : undefined,
    onAccessibilityAction:
      context || paste || onMouseDown
        ? (event) => {
            const { actionName } = event.nativeEvent
            if (actionName === 'contextMenu') requestContext()
            else if (actionName === 'paste') paste?.activate()
            else if (actionName === 'activate' && !base.onPress)
              onMouseDown?.(mouseEvent(undefined))
          }
        : undefined,
  }
}

/**
 * The native `Pressable` props for an element's interaction props: a press calls `onClick`,
 * hovering (a pointer on iPad, Android or the web) calls the mouse handlers, and a tab stop makes
 * it focusable.
 *
 * @param props - The element's interaction props.
 * @param activate - Its default action, when the click is not canceled.
 * @param onBubble - The containing anchor's click, when native press events do not bubble.
 * @returns The native props.
 */
export function pressProps(
  props: InteractionProps,
  activate?: () => void,
  onBubble?: MouseEventHandler,
): NativePressProps {
  const { onClick, onMouseEnter, onMouseLeave, onFocus, onBlur, tabIndex } = props
  return {
    focusable: tabIndex === undefined ? undefined : tabIndex >= 0,
    onPress:
      onClick || activate || onBubble
        ? (event: GestureResponderEvent): void => activatePress(onClick, activate, event, onBubble)
        : undefined,
    onHoverIn: onMouseEnter ? (): void => onMouseEnter(mouseEvent(undefined)) : undefined,
    onHoverOut: onMouseLeave ? (): void => onMouseLeave(mouseEvent(undefined)) : undefined,
    onFocus: onFocus ? (): void => onFocus(focusEvent()) : undefined,
    onBlur: onBlur ? (): void => onBlur(focusEvent()) : undefined,
  }
}

/** Runs the same click and default action for a direct press, a label, or an implicit submit. */
export function activatePress(
  onClick: MouseEventHandler | undefined,
  activate: (() => void) | undefined,
  event?: GestureResponderEvent,
  onBubble?: MouseEventHandler,
): void {
  const click = mouseEvent(event)
  onClick?.(click)
  if (onBubble && !event?.isPropagationStopped()) onBubble(click)
  if (!click.defaultPrevented) activate?.()
}
