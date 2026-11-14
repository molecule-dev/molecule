// @vitest-environment jsdom
/**
 * Vue UI conformance: every `@molecule/app-ui-react` component, rendered
 * from the shared framework-neutral cases, must produce the React reference
 * DOM (hashed classes, attributes, inline styles, text, route) and the same
 * callback and service calls. See `@molecule/app-framework-conformance`.
 *
 * `conformance/known-gaps.json` lists cases that do not match yet; it may only
 * shrink. `CONFORMANCE_COMPONENTS=Button,Modal` narrows a local run.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'

import { createVueAdapter } from '@molecule/app-framework-conformance/adapters/vue'
import { runUIConformance, type UIKnownGaps } from '@molecule/app-framework-conformance/ui'
import * as AppVue from '@molecule/app-vue'

import * as VueUI from '../index.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

const vueAdapter = createVueAdapter({ exports: VueUI, binding: AppVue })

runUIConformance(vueAdapter, { knownGaps: knownGaps as UIKnownGaps })
