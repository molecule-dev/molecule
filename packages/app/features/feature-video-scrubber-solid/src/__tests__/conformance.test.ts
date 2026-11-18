// @vitest-environment jsdom
/**
 * Solid conformance of `@molecule/app-feature-video-scrubber-solid`: every `@molecule/app-feature-video-scrubber-react`
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

import { createSolidAdapter } from '@molecule/app-framework-conformance/adapters/solid'
import { runFeatureConformance } from '@molecule/app-framework-conformance/features'
import { featureVideoScrubberFeature } from '@molecule/app-framework-conformance/features/cases/feature-video-scrubber'
import type { UIKnownGaps } from '@molecule/app-framework-conformance/ui'
import * as Binding from '@molecule/app-solid'
import * as UI from '@molecule/app-ui-solid'

import * as Feature from '../index.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

const adapter = createSolidAdapter({ exports: { ...UI, ...Feature }, binding: Binding })

runFeatureConformance('@molecule/app-feature-video-scrubber-react', adapter, {
  module: Feature,
  cases: featureVideoScrubberFeature,
  knownGaps: knownGaps as UIKnownGaps,
})
