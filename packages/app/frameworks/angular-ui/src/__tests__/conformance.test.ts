// @vitest-environment jsdom
/**
 * Angular UI conformance: every `@molecule/app-ui-react` component, rendered
 * from the shared framework-neutral cases, must produce the React reference
 * DOM (hashed classes, attributes, inline styles, text, route) and the same
 * callback and service calls. See `@molecule/app-framework-conformance`.
 *
 * `conformance/known-gaps.json` lists cases that do not match yet; it may only
 * shrink. `CONFORMANCE_COMPONENTS=Button,Modal` narrows a local run.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'

import * as AppAngular from '@molecule/app-angular'
import { createAngularAdapter } from '@molecule/app-framework-conformance/adapters/angular'
import { runUIConformance, type UIKnownGaps } from '@molecule/app-framework-conformance/ui'

import * as AngularUI from '../index.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

runUIConformance(createAngularAdapter({ exports: AngularUI, binding: AppAngular }), {
  knownGaps: knownGaps as UIKnownGaps,
})
