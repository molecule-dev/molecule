// @vitest-environment jsdom
/**
 * Solid conformance of `@molecule/app-three-viewer-solid`: every `@molecule/app-three-viewer-react`
 * component, rendered from the shared framework-neutral feature cases, must
 * produce the React reference DOM and the same callback and service calls, and
 * every plain export must equal React's. See `@molecule/app-framework-conformance`.
 *
 * `conformance/known-gaps.json` lists cases that do not match yet; it may only
 * shrink. `CONFORMANCE_COMPONENTS=<Component>` narrows a local run.
 *
 * three.js is substituted here (see `./stubs/three.js`): jsdom has no WebGL
 * context, so the real `WebGLRenderer` throws before the viewer's DOM exists —
 * the React reference is recorded the same way. The DOM the component renders
 * does not depend on three.js.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { vi } from 'vitest'

import { createSolidAdapter } from '@molecule/app-framework-conformance/adapters/solid'
import { runFeatureConformance } from '@molecule/app-framework-conformance/features'
import { threeViewerFeature } from '@molecule/app-framework-conformance/features/cases/three-viewer'
import type { UIKnownGaps } from '@molecule/app-framework-conformance/ui'
import * as Binding from '@molecule/app-solid'
import * as UI from '@molecule/app-ui-solid'

import * as Feature from '../index.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

vi.mock('three', async () => await import('./stubs/three.js'))
vi.mock('three/examples/jsm/controls/OrbitControls.js', async () => ({
  OrbitControls: (await import('./stubs/three.js')).OrbitControls,
}))
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', async () => ({
  GLTFLoader: (await import('./stubs/three.js')).GLTFLoader,
}))
vi.mock('three/examples/jsm/loaders/OBJLoader.js', async () => ({
  OBJLoader: (await import('./stubs/three.js')).OBJLoader,
}))
vi.mock('three/examples/jsm/loaders/STLLoader.js', async () => ({
  STLLoader: (await import('./stubs/three.js')).STLLoader,
}))

const adapter = createSolidAdapter({ exports: { ...UI, ...Feature }, binding: Binding })

runFeatureConformance('@molecule/app-three-viewer-react', adapter, {
  module: Feature,
  cases: threeViewerFeature,
  knownGaps: knownGaps as UIKnownGaps,
})
