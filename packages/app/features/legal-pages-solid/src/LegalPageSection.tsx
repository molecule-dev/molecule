/**
 * Solid one sub-section of a legal page (`h2` + body).
 *
 * @module
 */

import type { Component } from 'solid-js'

import type { SpacingScale } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { LegalPageSectionProps } from './types.js'

/**
 * One sub-section of a legal page (`h2` + body) styled for use inside
 * `LegalPageLayout`.
 *
 * Solid counterpart of `@molecule/app-legal-pages-react`'s `LegalPageSection` —
 * the same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link LegalPageSectionProps}).
 * @returns The rendered legal page section.
 */
export const LegalPageSection: Component<LegalPageSectionProps> = (props) => {
  const cm = getClassMap()
  const stackGap = (): SpacingScale => props.stackGap ?? 2

  return (
    <section class={cm.stack(stackGap())}>
      <h2 class={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>{props.title}</h2>
      {props.children}
    </section>
  )
}
