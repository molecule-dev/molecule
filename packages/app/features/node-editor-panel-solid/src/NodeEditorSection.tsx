/**
 * Solid labeled section inside the properties panel — the label uses the
 * canonical 11px uppercase-tracking-widest style, with an optional trailing
 * node on the right of the label row.
 *
 * Solid counterpart of `@molecule/app-node-editor-panel-react`'s
 * `NodeEditorSection` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { ResolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { NodeEditorSectionProps } from './types.js'

/**
 * Labeled section — the Solid counterpart of
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorSection`.
 *
 * @param props - The label, the optional trailing node and the stack gap.
 * @returns The rendered labeled section.
 */
export const NodeEditorSection: Component<NodeEditorSectionProps> = (props) => {
  const cm = getClassMap()

  return (
    <div class={cm.stack(props.gap ?? 3)}>
      <div class={cm.flex({ justify: 'between', align: 'center' })}>
        <label
          class={cm.cn(cm.fontWeight('bold'), cm.nodeEditorPanelSectionLabel)}
          for={props.htmlFor}
        >
          {props.label}
        </label>
        <ResolveNode node={props.trailing}>{(trailing) => <>{trailing()}</>}</ResolveNode>
      </div>
      {props.children}
    </div>
  )
}
