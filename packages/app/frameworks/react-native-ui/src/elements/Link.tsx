/**
 * Link: an in-app or external link.
 *
 * @module
 */

import type { ReactElement } from 'react'
import { Linking, Pressable, type View } from 'react-native'

import { useLinkRouter } from '@molecule/app-react'
import { formatLocation, parseLocation, resolveLinkPath } from '@molecule/app-routing'
import type { ElementLinkProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { focusEvent, mouseEvent } from './events.js'
import { registerInline } from './flow.js'
import { useGridCell } from './grid.js'
import {
  blockInInline,
  dataAttributes,
  ElementScope,
  flowOf,
  isCssInline,
  layoutChildren,
  splitClasses,
  useInheritedText,
  useTagClasses,
} from './inherited.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * A link: a native `Pressable` with the link role. A press runs `onClick`, then (unless the
 * handler called `preventDefault()`) navigates through the router for an app path, or opens a URL
 * outside the app. A link to the location already shown replaces it, as on the web. A URL outside
 * the app needs no router: it opens through the device's URL handler in an app with none mounted,
 * while an app path without one fails with the binding's no-router error, as on the web.
 *
 * @param props - See {@link ElementLinkProps}.
 * @returns The element.
 */
export function Link(props: ElementLinkProps<ElementNode> & ElementRefProps): ReactElement {
  const {
    to,
    replace,
    state,
    title,
    className,
    style,
    webStyle,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    children,
    ref,
  } = props
  const router = useLinkRouter(to)
  const split = splitClasses(
    useTagClasses(className, 'a'),
    useInheritedText(),
    dataAttributes(props),
  )
  const text = split.text
  const accessibility = nativeAccessibility({
    ...props,
    role: props.role ?? 'link',
    'aria-label': props['aria-label'] ?? title,
  })
  return (
    <ElementScope split={split} text={text}>
      <Pressable
        {...accessibility}
        ref={useNativeRef<View>(ref)}
        className={split.view || undefined}
        style={[nativeStyle(style, webStyle), useGridCell()]}
        onPress={(nativeEvent) => {
          const event = mouseEvent(nativeEvent)
          onClick?.(event)
          if (event.defaultPrevented) return
          const path = resolveLinkPath(to)
          // `router` is null only for a URL outside the app with no router mounted, so that case
          // opens the URL like every other one outside the app. An app path always has a router
          // here: `useLinkRouter` threw the binding's no-router error without one.
          if (router === null || path === null) {
            void Linking.openURL(to)
            return
          }
          const navigation = {
            replace:
              replace ??
              formatLocation(router.getLocation()) === formatLocation(parseLocation(path)),
            ...(state === undefined ? {} : { state }),
          }
          router.navigate(path, navigation)
        }}
        onHoverIn={onMouseEnter ? () => onMouseEnter(mouseEvent(undefined)) : undefined}
        onHoverOut={onMouseLeave ? () => onMouseLeave(mouseEvent(undefined)) : undefined}
        onFocus={onFocus ? () => onFocus(focusEvent()) : undefined}
        onBlur={onBlur ? () => onBlur(focusEvent()) : undefined}
      >
        {layoutChildren(children, split)}
      </Pressable>
    </ElementScope>
  )
}

registerInline(Link, (props) =>
  blockInInline(
    flowOf(props.className, 'box', dataAttributes(props)),
    props.children,
    isCssInline(props.className, true, dataAttributes(props)),
  ),
)
