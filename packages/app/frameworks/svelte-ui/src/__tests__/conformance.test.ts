// @vitest-environment jsdom
/**
 * Svelte UI conformance: every `@molecule/app-ui-react` component, rendered
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

import { createSvelteAdapter } from '@molecule/app-framework-conformance/adapters/svelte'
import { runUIConformance, type UIKnownGaps } from '@molecule/app-framework-conformance/ui'
import * as AppSvelte from '@molecule/app-svelte'

import * as SvelteUI from '../index.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

const svelteAdapter = createSvelteAdapter({ exports: SvelteUI, binding: AppSvelte })

runUIConformance(svelteAdapter, { knownGaps: knownGaps as UIKnownGaps })
