// @vitest-environment jsdom
/**
 * Angular conformance of `@molecule/app-image-gallery-editor-angular`: every `@molecule/app-image-gallery-editor-react`
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

import * as Binding from '@molecule/app-angular'
import { createAngularAdapter } from '@molecule/app-framework-conformance/adapters/angular'
import { runFeatureConformance } from '@molecule/app-framework-conformance/features'
import { imageGalleryEditorFeature } from '@molecule/app-framework-conformance/features/cases/image-gallery-editor'
import type { UIKnownGaps } from '@molecule/app-framework-conformance/ui'
import * as UI from '@molecule/app-ui-angular'

import * as Feature from '../index.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

const adapter = createAngularAdapter({ exports: { ...UI, ...Feature }, binding: Binding })

runFeatureConformance('@molecule/app-image-gallery-editor-react', adapter, {
  module: Feature,
  cases: imageGalleryEditorFeature,
  knownGaps: knownGaps as UIKnownGaps,
})
