/**
 * Anchor: a link with a literal href.
 *
 * @module
 */

import { forwardRef } from 'react'
import { Linking, Pressable, type View } from 'react-native'

import type { AnchorProps, ElementHandle, InlineKind, KitMouseEvent } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { resolvePublicDocumentUrl } from './documentUrl.js'
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
  useLineStart,
  useTagClasses,
} from './inherited.js'
import { AnchorPress, pressProps } from './press.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import type { ElementNode } from './types.js'

export { setPublicDocumentUrl } from './documentUrl.js'

/** Opens the literal destination, resolving relative references with the public document URL. */
async function openAnchor(href: string): Promise<void> {
  try {
    const destination = resolvePublicDocumentUrl(href)
    if (destination === undefined) {
      console.error(
        `Cannot open Anchor href ${JSON.stringify(href)} without a public document URL. Call setPublicDocumentUrl() with an absolute HTTP(S) URL at app startup.`,
      )
      return
    }
    await Linking.openURL(typeof destination === 'string' ? destination : await destination)
  } catch (error) {
    console.error(`Could not open Anchor href ${JSON.stringify(href)}.`, error)
  }
}

/** Determines how the anchor sits among inline or block siblings. */
function anchorFlow(props: { className?: unknown; children?: unknown }): InlineKind {
  const data = dataAttributes(props)
  return blockInInline(
    flowOf(props.className, 'box', data),
    props.children,
    isCssInline(props.className, true, data),
  )
}

/**
 * Renders a native pressable link. A press runs the caller's handler, then opens the href through
 * the OS unless the handler prevented it or the href is the `'#'` placeholder.
 */
export const Anchor = forwardRef<ElementHandle, AnchorProps<ElementNode>>(
  function Anchor(props, ref) {
    const { href, title, className, style, webStyle, onClick, children } = props
    const split = splitClasses(
      useTagClasses(className, 'a'),
      useInheritedText(),
      dataAttributes(props),
    )
    const accessibility = nativeAccessibility({
      ...props,
      role: props.role ?? 'link',
      'aria-label': props['aria-label'] ?? title,
    })

    /** Runs the same click for the link and any nested button that received the press. */
    function follow(event: KitMouseEvent): void {
      onClick?.(event)
      if (!event.defaultPrevented && href !== '#') void openAnchor(href)
    }

    return (
      <ElementScope split={split} text={split.text}>
        <Pressable
          {...accessibility}
          ref={useNativeRef<View>(ref)}
          className={split.view || undefined}
          style={[nativeStyle(style, webStyle), useLineStart(anchorFlow(props)), useGridCell()]}
          {...pressProps({ ...props, onClick: follow })}
        >
          <AnchorPress.Provider value={follow}>
            {layoutChildren(children, split)}
          </AnchorPress.Provider>
        </Pressable>
      </ElementScope>
    )
  },
)

registerInline(Anchor, anchorFlow)
