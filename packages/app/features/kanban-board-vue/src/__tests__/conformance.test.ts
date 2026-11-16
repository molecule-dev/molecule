// @vitest-environment jsdom
/**
 * Vue conformance of `@molecule/app-kanban-board-vue`: every `@molecule/app-kanban-board-react`
 * component, rendered from the shared framework-neutral feature cases, must
 * produce the React reference DOM and the same callback and service calls, and
 * every plain export must equal React's. See `@molecule/app-framework-conformance`.
 *
 * `conformance/known-gaps.json` lists cases that do not match yet; it may only
 * shrink. `CONFORMANCE_COMPONENTS=<Component>` narrows a local run.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'

import { createVueAdapter } from '@molecule/app-framework-conformance/adapters/vue'
import { runFeatureConformance } from '@molecule/app-framework-conformance/features'
import { kanbanBoardFeature } from '@molecule/app-framework-conformance/features/cases/kanban-board'
import type { UIKnownGaps } from '@molecule/app-framework-conformance/ui'
import * as UI from '@molecule/app-ui-vue'
import * as Binding from '@molecule/app-vue'

import * as Feature from '../index.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

const adapter = createVueAdapter({ exports: { ...UI, ...Feature }, binding: Binding })

runFeatureConformance('@molecule/app-kanban-board-react', adapter, {
  module: Feature,
  cases: kanbanBoardFeature,
  knownGaps: knownGaps as UIKnownGaps,
})
