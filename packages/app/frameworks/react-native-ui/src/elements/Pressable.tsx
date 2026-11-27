/**
 * Pressable: an element the user activates.
 *
 * @module
 */

import { type ReactElement, useCallback, useContext, useRef } from 'react'
import { Pressable as NativePressable, View } from 'react-native'

import type { InlineKind, PressableProps } from '@molecule/app-ui'

import { useOverlayTarget } from '../platform/focus.js'
import { nativeAccessibility } from './accessibility.js'
import { dragViewActions, useDragFrame, useNativeDrag } from './drag.js'
import { registerInline } from './flow.js'
import { DisabledScope, FormScope, useFormRegistration } from './form.js'
import { useGridCell } from './grid.js'
import {
  blockInInline,
  buttonText,
  dataAttributes,
  ElementScope,
  flowOf,
  isCssInline,
  layoutChildren,
  splitClasses,
  useInheritedText,
  useLineStart,
  useTagClasses,
} from './inherited.js'
import { useLabelable, useReferencedLabelText } from './labels.js'
import { useOutsideTouch } from './outsidePress.js'
import { activatePress, AnchorPress, pressProps, useMousePress } from './press.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * Something the user activates: a native `Pressable`. `onClick` fires on press, the mouse
 * handlers on hover where the device has a pointer, and a string child is drawn in a `Text` with
 * the pressable's text classes. Key handlers are web-only.
 *
 * @param props - See {@link PressableProps}.
 * @returns The element.
 */
export function Pressable(props: PressableProps<ElementNode> & ElementRefProps): ReactElement {
  const { as, type, title, className, style, webStyle, children, ref } = props
  const form = useContext(FormScope)
  const fieldsetDisabled = useContext(DisabledScope)
  const anchorPress = useContext(AnchorPress)
  const disabled = props.disabled || (as === 'button' && fieldsetDisabled)
  const owner = as === 'button' && !props.form ? form : null
  const activate = type === 'reset' ? owner?.reset : type === 'button' ? undefined : owner?.submit
  const click = (): void => {
    if (!disabled) activatePress(props.onClick, activate)
  }
  useFormRegistration(owner?.buttons, { type, disabled, activate: click })
  const label = useLabelable(props.id, as === 'button' ? click : undefined)
  const description = useReferencedLabelText(props['aria-describedby'])
  const inherited = useInheritedText()
  const split = splitClasses(
    useTagClasses(className, as),
    as === 'button' ? buttonText(inherited) : inherited,
    dataAttributes(props),
  )
  const text = split.text
  const accessibility = nativeAccessibility(
    { ...props, 'aria-label': props['aria-label'] ?? label ?? title },
    as,
  )
  const interaction = useMousePress(
    props,
    pressProps(props, activate, anchorPress),
    undefined,
    !disabled,
  )
  const host = useRef<View>(null)
  const forward = useNativeRef<View>(ref)
  const setHost = useCallback(
    (view: View | null) => {
      host.current = view
      forward?.(view)
    },
    [forward],
  )
  const target = useOverlayTarget(
    setHost,
    disabled || accessibility['aria-disabled'] ? undefined : 'control',
  )
  const onTouchStart = useOutsideTouch(host)
  const [frame, dragRef] = useDragFrame(target.ref)
  const press = {
    ...interaction,
    onFocus: (event: Parameters<NonNullable<typeof interaction.onFocus>>[0]): void => {
      if (!disabled) target.remember()
      interaction.onFocus?.(event)
    },
    onPress: disabled
      ? undefined
      : (event: Parameters<NonNullable<typeof interaction.onPress>>[0]): void => {
          target.remember()
          interaction.onPress?.(event)
        },
  }
  const secondary = disabled ? undefined : props.secondaryAction
  const responder = useNativeDrag(frame, {
    drag: disabled ? undefined : props.drag,
    secondary,
    press,
  })
  const view = {
    ...accessibility,
    onTouchStart: ref ? onTouchStart : undefined,
    accessibilityHint: description ?? accessibility.accessibilityHint,
    'aria-disabled': disabled || accessibility['aria-disabled'],
    className: split.view || undefined,
    style: [nativeStyle(style, webStyle), useLineStart(pressableFlow(props)), useGridCell()],
  }
  const content = layoutChildren(children, split)
  return (
    <ElementScope split={split} text={text}>
      {responder ? (
        <View
          {...view}
          ref={dragRef}
          collapsable={false}
          accessible
          {...responder}
          {...dragViewActions(
            props,
            press,
            press.onPress
              ? () => {
                  target.remember()
                  activatePress(props.onClick, activate, undefined, anchorPress)
                }
              : undefined,
            secondary,
          )}
        >
          {content}
        </View>
      ) : (
        <NativePressable
          {...view}
          ref={target.ref}
          // A disabled button inside an anchor still consumes its tap without activating either.
          disabled={disabled && anchorPress ? undefined : disabled}
          {...press}
        >
          {content}
        </NativePressable>
      )}
    </ElementScope>
  )
}

/**
 * How a pressable flows: a button or a span is an inline box, a div or an li a block, unless its
 * classes say otherwise.
 *
 * @param props - Its props.
 * @returns Its inline kind.
 */
function pressableFlow(props: {
  as?: unknown
  className?: unknown
  children?: unknown
}): InlineKind {
  const data = dataAttributes(props)
  return blockInInline(
    flowOf(props.className, props.as === 'button' || props.as === 'span' ? 'box' : null, data),
    props.children,
    isCssInline(props.className, props.as === 'span', data),
  )
}

registerInline(Pressable, pressableFlow)
