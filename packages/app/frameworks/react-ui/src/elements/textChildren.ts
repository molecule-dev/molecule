/**
 * The development check that a container holds no bare text.
 *
 * @module
 */

import { Children, Fragment, isValidElement, type ReactNode } from 'react'

/**
 * Whether `children` holds a string or number outside a text element, looking through arrays and
 * fragments (which the types cannot see into).
 *
 * @param children - A container's children.
 * @returns `true` when some bare text is found.
 */
function holdsBareText(children: ReactNode): boolean {
  let found = false
  Children.forEach(children, (child) => {
    if (found) return
    if (typeof child === 'string' || typeof child === 'number') found = true
    else if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment)
      found = holdsBareText(child.props.children)
  })
  return found
}

/**
 * Logs an error when a container receives bare text: React Native throws on it ("Text strings
 * must be rendered within a <Text> component"), so the web reports it first.
 *
 * @param element - The element's name, for the message.
 * @param tag - Its web tag.
 * @param children - Its children.
 */
export function reportBareText(element: string, tag: string, children: ReactNode): void {
  if (!holdsBareText(children)) return
  console.error(
    `<${element} as="${tag}"> received text outside a text element. React Native renders text only inside a <Text>: wrap it in <Text as="span">.`,
  )
}
