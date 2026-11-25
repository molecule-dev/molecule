/**
 * Rich catalog text, with a DOM compatibility path for trusted custom catalogs.
 *
 * @module
 */

import { createElement, type ReactElement, type ReactNode } from 'react'

import type { RichNode } from '@molecule/app-i18n'

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
 * Renders portable rich translations as elements. The legacy result for a
 * trusted custom catalog uses the web renderer's HTML compatibility path.
 *
 * @param props - The rich translation and container classes.
 * @returns The rich text inside its container.
 */
export function RichText({ nodes, className }: RichTextProps): ReactElement {
  const legacy = nodes.find((node) => node.kind === 'legacy-html')
  if (legacy) {
    return createElement('div', { className, dangerouslySetInnerHTML: { __html: legacy.html } })
  }
  return createElement('div', { className }, renderNodes(nodes))
}

/**
 * Renders portable nodes with their original tag and text boundaries.
 *
 * @param nodes - The nodes at this level.
 * @returns Their text or React elements.
 */
function renderNodes(nodes: readonly RichNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.kind === 'text') return node.text
    if (node.kind === 'legacy-html') return null
    const children = renderNodes(node.children)
    return node.tag === 'ul' || node.tag === 'li' ? (
      <Box as={node.tag} key={index}>
        {children}
      </Box>
    ) : (
      <Text as={node.tag} key={index}>
        {children}
      </Text>
    )
  })
}
