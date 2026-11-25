/**
 * Disclosure: native HTML expansion with a summary slot.
 *
 * @module
 */

import { createElement, forwardRef, type ReactElement, type SyntheticEvent } from 'react'

import type { DisclosureProps, ElementHandle } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'
import type { ElementNode } from './types.js'

/**
 * Renders one details element with the summary first. The browser handles activation and queues
 * the toggle notification for changes from either the user or the parent.
 */
export const Disclosure = forwardRef<ElementHandle, DisclosureProps<ElementNode>>(
  function Disclosure(
    { as, summary, summaryProps, onToggle, children, ...props },
    ref,
  ): ReactElement {
    return createElement(
      as,
      {
        ...webElementAttributes(props),
        ref: useElementRef<HTMLDetailsElement>(ref),
        onToggle: onToggle
          ? (event: SyntheticEvent<HTMLDetailsElement>): void => {
              if (event.target === event.currentTarget) onToggle(event.currentTarget.open)
            }
          : undefined,
      },
      createElement(
        'summary',
        { ...(summaryProps && webElementAttributes(summaryProps)) },
        summary,
      ),
      children,
    )
  },
)
