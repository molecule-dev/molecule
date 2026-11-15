// @vitest-environment jsdom
/**
 * Svelte conformance of `@molecule/app-countdown-svelte`: every `@molecule/app-countdown-react`
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

import { createSvelteAdapter } from '@molecule/app-framework-conformance/adapters/svelte'
import { createSvelteBindingAdapter } from '@molecule/app-framework-conformance/adapters/svelte-bindings'
import { runFeatureConformance } from '@molecule/app-framework-conformance/features'
import { countdownFeature } from '@molecule/app-framework-conformance/features/cases/countdown'
import type { UIKnownGaps } from '@molecule/app-framework-conformance/ui'
import * as Binding from '@molecule/app-svelte'
import * as UI from '@molecule/app-ui-svelte'

import * as Feature from '../index.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

const adapter = createSvelteAdapter({ exports: { ...UI, ...Feature }, binding: Binding })

runFeatureConformance('@molecule/app-countdown-react', adapter, {
  module: Feature,
  cases: countdownFeature,
  knownGaps: knownGaps as UIKnownGaps,
  bindingAdapter: createSvelteBindingAdapter({
    exports: { ...Binding, ...Feature },
    binding: Binding,
  }),
})
