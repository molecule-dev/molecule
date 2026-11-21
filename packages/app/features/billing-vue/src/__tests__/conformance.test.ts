// @vitest-environment jsdom
/**
 * Vue conformance of `@molecule/app-billing-vue`: every `@molecule/app-billing-react`
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
import { createVueBindingAdapter } from '@molecule/app-framework-conformance/adapters/vue-bindings'
import { runFeatureConformance } from '@molecule/app-framework-conformance/features'
import { billingFeature } from '@molecule/app-framework-conformance/features/cases/billing'
import type { UIKnownGaps } from '@molecule/app-framework-conformance/ui'
import * as UI from '@molecule/app-ui-vue'
import * as Binding from '@molecule/app-vue'

import * as Feature from '../index.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

const adapter = createVueAdapter({ exports: { ...UI, ...Feature }, binding: Binding })

runFeatureConformance('@molecule/app-billing-react', adapter, {
  module: Feature,
  cases: billingFeature,
  knownGaps: knownGaps as UIKnownGaps,
  bindingAdapter: createVueBindingAdapter({
    exports: { ...Binding, ...Feature },
    binding: Binding,
  }),
})
