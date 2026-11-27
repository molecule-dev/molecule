// @vitest-environment jsdom
/**
 * Solid conformance of `@molecule/app-ide-solid`: every `@molecule/app-ide-react`
 * component, rendered from the shared framework-neutral feature cases, must
 * produce the React reference DOM and the same callback and service calls, and
 * every plain export must equal React's. The components React renders but does not export come
 * from `../parts.js`, and the hooks run through the binding adapter. See `@molecule/app-framework-conformance`.
 *
 * `conformance/known-gaps.json` lists cases that do not match yet; it may only
 * shrink. `CONFORMANCE_COMPONENTS=<Component>` narrows a local run.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'

import { createSolidAdapter } from '@molecule/app-framework-conformance/adapters/solid'
import { createSolidBindingAdapter } from '@molecule/app-framework-conformance/adapters/solid-bindings'
import { runFeatureConformance } from '@molecule/app-framework-conformance/features'
import { ideFeature } from '@molecule/app-framework-conformance/features/cases/ide'
import type { UIKnownGaps } from '@molecule/app-framework-conformance/ui'
import * as PanelLogic from '@molecule/app-ide-panel-logic'
import * as Binding from '@molecule/app-solid'
import * as Models from '@molecule/app-solid/ai-models'
import * as Chat from '@molecule/app-solid/chat'
import * as UI from '@molecule/app-ui-solid'

import * as Feature from '../index.js'
import * as Parts from '../parts.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

const binding = { ...Binding, ...Chat, ...Models }
const adapter = createSolidAdapter({ exports: { ...UI, ...Feature, ...Parts }, binding })

runFeatureConformance('@molecule/app-ide-react', adapter, {
  module: Feature,
  cases: ideFeature,
  knownGaps: knownGaps as UIKnownGaps,
  sharedModules: { '@molecule/app-ide-panel-logic': PanelLogic },
  parts: Parts,
  bindingAdapter: createSolidBindingAdapter({
    exports: { ...binding, ...Feature },
    binding,
  }),
})
