/**
 * Rich catalog text on React Native.
 *
 * @module
 */

import { type ReactElement, type ReactNode, useEffect } from 'react'

import type { RichNode } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

import { Box } from './Box.js'
import { Text } from './Text.js'

/** Props for {@link RichText}. */
export interface RichTextProps {
  /** Result of a rich translation read. */
  nodes: readonly RichNode[]
  /** Classes on the surrounding container. */
  className?: string
}

/**
 * Renders paragraphs, heading semantics, nested bullet lists and strong emphasis.
 * A custom web catalog that needs unsupported markup logs a migration diagnostic.
 *
 * @param props - The rich translation and container classes.
 * @returns The rich text inside its container.
 */
export function RichText({ nodes, className }: RichTextProps): ReactElement {
  const diagnostic = nodes.find((node) => node.kind === 'legacy-html')?.diagnostic
  useEffect(() => {
    if (diagnostic) getLogger('i18n').warn(diagnostic)
  }, [diagnostic])

  const cm = getClassMap()
  return (
    <Box as="div" className={className}>
      {renderNodes(nodes, cm)}
    </Box>
  )
}

/**
 * Renders the native equivalent of the portable tags. List markers are
 * structural decoration, with the item content in its own wrapping column.
 *
 * @param nodes - The nodes at this level.
 * @param cm - The active ClassMap for native layout and typography.
 * @returns The native element children.
 */
function renderNodes(nodes: readonly RichNode[], cm: UIClassMap): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.kind === 'text') return node.text
    if (node.kind === 'legacy-html') return null
    const children = renderNodes(node.children, cm)
    if (node.tag === 'ul')
      return (
        <Box as="ul" key={index}>
          {children}
        </Box>
      )
    if (node.tag === 'li') {
      return (
        <Box as="li" className={cm.flex({ direction: 'row' })} key={index}>
          <Text as="span" aria-hidden="true">
            {'\u2022 '}
          </Text>
          <Box as="div" className={cm.flex1}>
            {children}
          </Box>
        </Box>
      )
    }
    const className =
      node.tag === 'h2'
        ? cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('my', 2))
        : node.tag === 'p'
          ? cm.sp('mb', 2)
          : undefined
    return (
      <Text as={node.tag} key={index} className={className}>
        {children}
      </Text>
    )
  })
}
