// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. three.js (WebGL — unavailable under
 * jsdom) is the only thing faked, the same way `ThreeViewer.test.tsx` does it.
 *
 * @module
 */
import { vi } from 'vitest'

const ctx = vi.hoisted(() => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const loads: Array<{ src: string; onLoad: (gltf: unknown) => void }> = []
  const renderers: any[] = []
  const controls: any[] = []
  /** Fake vector. */
  function FakeVector3(this: any, x = 0, y = 0, z = 0): void {
    this.x = x
    this.y = y
    this.z = z
    this.copy = function () {
      return this
    }
    this.addScaledVector = function () {
      return this
    }
    this.normalize = function () {
      return this
    }
    this.set = vi.fn()
  }
  /** Fake bounding box. */
  function FakeBox3(this: any): void {
    this.setFromObject = function () {
      return this
    }
    this.getSize = (v: { x: number; y: number; z: number }) =>
      Object.assign(v, { x: 1, y: 1, z: 1 })
    this.getCenter = (v: { x: number; y: number; z: number }) =>
      Object.assign(v, { x: 0, y: 0, z: 0 })
  }
  /** Fake scene. */
  function FakeScene(this: any): void {
    this.add = vi.fn()
    this.remove = vi.fn()
  }
  /** Fake camera. */
  function FakePerspectiveCamera(this: any): void {
    this.fov = 45
    this.position = new (FakeVector3 as any)()
    this.updateProjectionMatrix = vi.fn()
  }
  /** Fake WebGL renderer. */
  function FakeWebGLRenderer(this: any): void {
    this.domElement = document.createElement('canvas')
    this.setPixelRatio = vi.fn()
    this.setSize = vi.fn()
    this.render = vi.fn()
    this.dispose = vi.fn()
    renderers.push(this)
  }
  /** Fake light. */
  function FakeLight(this: any): void {
    this.position = { set: vi.fn() }
  }
  /** Fake no-op three class. */
  function FakeNoop(): void {}
  /** Fake GLTF loader that records the requested URL. */
  function FakeGLTFLoader(this: any): void {
    this.load = (src: string, onLoad: (gltf: unknown) => void) => loads.push({ src, onLoad })
  }
  /** Fake orbit controls. */
  function FakeOrbitControls(this: any): void {
    this.target = { copy: vi.fn() }
    this.autoRotate = false
    this.update = vi.fn()
    this.dispose = vi.fn()
    controls.push(this)
  }
  return {
    loads,
    renderers,
    controls,
    three: {
      AmbientLight: FakeLight,
      Box3: FakeBox3,
      Color: FakeNoop,
      DirectionalLight: FakeLight,
      HemisphereLight: FakeLight,
      Mesh: FakeNoop,
      MeshStandardMaterial: FakeNoop,
      PerspectiveCamera: FakePerspectiveCamera,
      Scene: FakeScene,
      Vector3: FakeVector3,
      WebGLRenderer: FakeWebGLRenderer,
    },
    FakeGLTFLoader,
    FakeOrbitControls,
    FakeNoop,
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
})

vi.mock('three', () => ctx.three)
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({ GLTFLoader: ctx.FakeGLTFLoader }))
vi.mock('three/examples/jsm/loaders/OBJLoader.js', () => ({ OBJLoader: ctx.FakeNoop }))
vi.mock('three/examples/jsm/loaders/STLLoader.js', () => ({ STLLoader: ctx.FakeNoop }))
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: ctx.FakeOrbitControls,
}))

import { act, cleanup, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ThreeViewer } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered product model figure.
 */
function ProductModel(): React.JSX.Element {
  const product = { name: 'Rubber duck', modelUrl: '/models/duck.glb' }
  const [loaded, setLoaded] = useState(false)
  return (
    <figure style={{ height: 480 }} aria-busy={!loaded}>
      <ThreeViewer
        src={product.modelUrl}
        lighting="studio"
        autoRotate
        onLoad={() => setLoaded(true)}
      />
      <figcaption>{product.name}</figcaption>
    </figure>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('loads the GLB into a WebGL canvas, auto-rotates, and reports onLoad', async () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ProductModel />
      </I18nProvider>,
    )
    const figure = view.container.querySelector('figure')
    expect(figure?.getAttribute('aria-busy')).toBe('true')
    expect(view.getByText('Rubber duck')).toBeTruthy()
    expect(view.getByRole('img', { name: '3D model viewer' })).toBeTruthy()
    expect(
      view.container.querySelector('[data-mol-id="three-viewer-loading"]')?.textContent,
    ).toContain('Loading 3D model…')

    expect(ctx.loads.map((l) => l.src)).toEqual(['/models/duck.glb'])
    expect(ctx.controls[0]?.autoRotate).toBe(true)
    expect(ctx.renderers[0]?.domElement.isConnected).toBe(true)

    await act(async () => {
      ctx.loads[0]?.onLoad({ scene: { traverse: () => undefined } })
    })
    await waitFor(() => expect(figure?.getAttribute('aria-busy')).toBe('false'))
    expect(view.container.querySelector('[data-mol-id="three-viewer-loading"]')).toBeNull()
    expect(ctx.renderers[0]?.render).toHaveBeenCalled()

    view.unmount()
    expect(ctx.renderers[0]?.dispose).toHaveBeenCalledTimes(1)
  })
})
