// @vitest-environment jsdom
//
// NOTE on test setup:
// 1. `vi` is imported on its own line, separate from the test-runner helpers.
// 2. The mocked three.js classes are written as `function ConstructorName()`
//    constructor functions, NOT ES `class` declarations. ES class syntax
//    inside `vi.hoisted` (or inside a `vi.mock` factory body) trips a
//    vitest hoist-order bug — `__vi_import_N__ before initialization` —
//    when this file also imports `@testing-library/react`. Plain function
//    constructors compile to a form vitest's hoister handles cleanly.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mock context — class fakes + recording arrays
// ---------------------------------------------------------------------------

const ctx = vi.hoisted(() => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const loaderInstances: any[] = []
  const rendererInstances: any[] = []
  const controlsInstances: any[] = []

  /** Minimal three.js Material stub with a dispose spy. */
  function FakeMaterial(this: any): void {
    this.dispose = vi.fn()
  }
  /** Minimal three.js MeshStandardMaterial stub with a dispose spy. */
  function FakeMeshStandardMaterial(this: any): void {
    this.dispose = vi.fn()
  }
  /** Minimal three.js BufferGeometry stub with a dispose spy. */
  function FakeGeometry(this: any): void {
    this.dispose = vi.fn()
  }
  /** Minimal three.js Mesh stub with geometry, material, and traverse. */
  function FakeMesh(this: any): void {
    this.geometry = new (FakeGeometry as any)()
    this.material = new (FakeMaterial as any)()
    this.traverse = (cb: (o: unknown) => void) => cb(this)
  }
  /** Minimal three.js Object3D stub with children list and traverse. */
  function FakeObject3D(this: any): void {
    this.children = []
    this.traverse = (cb: (o: unknown) => void) => cb(this)
  }
  /** Minimal three.js Scene stub with add/remove spies and a children list. */
  function FakeScene(this: any): void {
    this.children = []
    this.background = null
    this.add = vi.fn()
    this.remove = vi.fn()
  }
  /** Minimal three.js PerspectiveCamera stub with projection matrix spy. */
  function FakePerspectiveCamera(this: any): void {
    this.fov = 45
    this.aspect = 1
    this.near = 0.1
    this.far = 1000
    this.position = { copy: vi.fn(), addScaledVector: vi.fn(), set: vi.fn() }
    this.updateProjectionMatrix = vi.fn()
  }
  /** Minimal three.js WebGLRenderer stub that records instances and exposes spies. */
  function FakeWebGLRenderer(this: any): void {
    this.domElement = document.createElement('canvas')
    this.setPixelRatio = vi.fn()
    this.setSize = vi.fn()
    this.render = vi.fn()
    this.dispose = vi.fn()
    rendererInstances.push(this)
  }
  /** Minimal three.js Box3 stub with setFromObject, getSize, and getCenter helpers. */
  function FakeBox3(this: any): void {
    this.setFromObject = function (this: any) {
      return this
    }
    this.getSize = function (v: { x: number; y: number; z: number }) {
      v.x = 1
      v.y = 1
      v.z = 1
    }
    this.getCenter = function (v: { x: number; y: number; z: number }) {
      v.x = 0
      v.y = 0
      v.z = 0
    }
  }
  /** Minimal three.js Vector3 stub supporting copy, addScaledVector, and normalize. */
  function FakeVector3(this: any, x = 0, y = 0, z = 0): void {
    this.x = x
    this.y = y
    this.z = z
    this.copy = function (this: any, o: { x: number; y: number; z: number }) {
      this.x = o.x
      this.y = o.y
      this.z = o.z
      return this
    }
    this.addScaledVector = function () {
      return this
    }
    this.normalize = function () {
      return this
    }
  }
  /** Minimal three.js Color stub that accepts an optional color value. */
  function FakeColor(_v?: string): void {}
  /** Minimal three.js AmbientLight stub. */
  function FakeAmbientLight(): void {}
  /** Minimal three.js DirectionalLight stub with a position.set spy. */
  function FakeDirectionalLight(this: any): void {
    this.position = { set: vi.fn() }
  }
  /** Minimal three.js HemisphereLight stub. */
  function FakeHemisphereLight(): void {}

  // `loadOverride` lets a test inject a synchronous `load` impl (e.g. one
  // that fires its error callback) used by the next FakeGLTFLoader that
  // gets constructed.
  const loadOverrides: { gltf: ((...a: unknown[]) => void) | null } = { gltf: null }
  /** Minimal GLTFLoader stub that records instances and supports load override injection. */
  function FakeGLTFLoader(this: any): void {
    this.load = loadOverrides.gltf ? vi.fn(loadOverrides.gltf) : vi.fn()
    loaderInstances.push(this)
  }
  // Expose the override knob on the returned context.
  ;(FakeGLTFLoader as any)._setNextLoad = (fn: ((...a: unknown[]) => void) | null) => {
    loadOverrides.gltf = fn
  }
  /** Minimal OBJLoader stub that records instances and provides a load spy. */
  function FakeOBJLoader(this: any): void {
    this.load = vi.fn()
    loaderInstances.push(this)
  }
  /** Minimal STLLoader stub that records instances and provides a load spy. */
  function FakeSTLLoader(this: any): void {
    this.load = vi.fn()
    loaderInstances.push(this)
  }
  /** Minimal OrbitControls stub with target, damping, autoRotate, update, and dispose spies. */
  function FakeOrbitControls(this: any): void {
    this.target = { copy: vi.fn() }
    this.enableDamping = false
    this.autoRotate = false
    this.update = vi.fn()
    this.dispose = vi.fn()
    controlsInstances.push(this)
  }

  return {
    loaderInstances,
    rendererInstances,
    controlsInstances,
    threeMock: {
      AmbientLight: FakeAmbientLight,
      Box3: FakeBox3,
      Color: FakeColor,
      DirectionalLight: FakeDirectionalLight,
      HemisphereLight: FakeHemisphereLight,
      Material: FakeMaterial,
      Mesh: FakeMesh,
      MeshStandardMaterial: FakeMeshStandardMaterial,
      Object3D: FakeObject3D,
      PerspectiveCamera: FakePerspectiveCamera,
      Scene: FakeScene,
      Vector3: FakeVector3,
      WebGLRenderer: FakeWebGLRenderer,
    },
    FakeGLTFLoader,
    FakeOBJLoader,
    FakeSTLLoader,
    FakeOrbitControls,
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
})

vi.mock('three', () => ctx.threeMock)
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({ GLTFLoader: ctx.FakeGLTFLoader }))
vi.mock('three/examples/jsm/loaders/OBJLoader.js', () => ({ OBJLoader: ctx.FakeOBJLoader }))
vi.mock('three/examples/jsm/loaders/STLLoader.js', () => ({ STLLoader: ctx.FakeSTLLoader }))
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: ctx.FakeOrbitControls,
}))

// ---------------------------------------------------------------------------
// Real imports (registered mocks apply to all subsequent imports)
// ---------------------------------------------------------------------------

import { render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { disposeObject3D, resolveFormat, ThreeViewer } from '../ThreeViewer.js'

const { loaderInstances, rendererInstances, controlsInstances, FakeGLTFLoader } = ctx

// ---------------------------------------------------------------------------
// ClassMap stub + i18n wrapper
// ---------------------------------------------------------------------------

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings, every
 * other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  loaderInstances.length = 0
  rendererInstances.length = 0
  controlsInstances.length = 0
})

afterEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// resolveFormat
// ---------------------------------------------------------------------------

describe('resolveFormat', () => {
  it('returns explicit format when provided', () => {
    expect(resolveFormat('foo.bar', 'stl')).toBe('stl')
  })

  it('infers gltf from .gltf extension', () => {
    expect(resolveFormat('/models/duck.gltf')).toBe('gltf')
  })

  it('infers glb from .glb extension', () => {
    expect(resolveFormat('/models/duck.glb')).toBe('glb')
  })

  it('infers obj from .obj extension', () => {
    expect(resolveFormat('/models/duck.obj')).toBe('obj')
  })

  it('infers stl from .stl extension', () => {
    expect(resolveFormat('/models/duck.stl')).toBe('stl')
  })

  it('handles query strings and fragments', () => {
    expect(resolveFormat('https://cdn.example/duck.glb?v=2')).toBe('glb')
    expect(resolveFormat('/foo.stl#fragment')).toBe('stl')
  })

  it('falls back to gltf for unknown extensions', () => {
    expect(resolveFormat('/foo.unknown')).toBe('gltf')
  })
})

// ---------------------------------------------------------------------------
// disposeObject3D
// ---------------------------------------------------------------------------

describe('disposeObject3D', () => {
  it('disposes geometry and a single material on a mesh', () => {
    const mat = { dispose: vi.fn() }
    const geom = { dispose: vi.fn() }
    const mesh = {
      geometry: geom,
      material: mat,
      traverse(cb: (o: unknown) => void) {
        cb(this)
      },
    }
    disposeObject3D(mesh as never)
    expect(geom.dispose).toHaveBeenCalledTimes(1)
    expect(mat.dispose).toHaveBeenCalledTimes(1)
  })

  it('disposes all materials in a material array', () => {
    const matA = { dispose: vi.fn() }
    const matB = { dispose: vi.fn() }
    const geom = { dispose: vi.fn() }
    const mesh = {
      geometry: geom,
      material: [matA, matB],
      traverse(cb: (o: unknown) => void) {
        cb(this)
      },
    }
    disposeObject3D(mesh as never)
    expect(matA.dispose).toHaveBeenCalled()
    expect(matB.dispose).toHaveBeenCalled()
  })

  it('disposes texture maps on a material', () => {
    const tex = { isTexture: true, dispose: vi.fn() }
    const mat = { map: tex, dispose: vi.fn() }
    const mesh = {
      geometry: { dispose: vi.fn() },
      material: mat,
      traverse(cb: (o: unknown) => void) {
        cb(this)
      },
    }
    disposeObject3D(mesh as never)
    expect(tex.dispose).toHaveBeenCalled()
    expect(mat.dispose).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// <ThreeViewer> mount + cleanup
// ---------------------------------------------------------------------------

describe('<ThreeViewer>', () => {
  it('renders the canvas region with data-mol-id and aria-label', () => {
    const { container } = render(
      <Wrap>
        <ThreeViewer src="/models/x.glb" />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="three-viewer"]')
    expect(root).not.toBeNull()
    const canvas = container.querySelector('[data-mol-id="three-viewer-canvas"]')
    expect(canvas).not.toBeNull()
    expect(canvas?.getAttribute('aria-label')).toContain('3D model')
  })

  it('renders a loading overlay while pending', () => {
    const { container } = render(
      <Wrap>
        <ThreeViewer src="/models/x.glb" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="three-viewer-loading"]')).not.toBeNull()
  })

  it('instantiates a GLTFLoader for .glb sources', () => {
    render(
      <Wrap>
        <ThreeViewer src="/models/x.glb" />
      </Wrap>,
    )
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
  })

  it('instantiates a STLLoader for .stl sources', () => {
    render(
      <Wrap>
        <ThreeViewer src="/models/x.stl" />
      </Wrap>,
    )
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
  })

  it('instantiates an OBJLoader for .obj sources', () => {
    render(
      <Wrap>
        <ThreeViewer src="/models/x.obj" />
      </Wrap>,
    )
    expect(loaderInstances.length).toBe(1)
  })

  it('honors explicit format prop over file extension', () => {
    render(
      <Wrap>
        <ThreeViewer src="/models/x.unknown" format="stl" />
      </Wrap>,
    )
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
  })

  it('shows error overlay and calls onError when loader fails', async () => {
    const onError = vi.fn()
    // Inject a load impl that fires its error callback synchronously.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    ;(FakeGLTFLoader as any)._setNextLoad(
      (_src: unknown, _onLoad: unknown, _onProgress: unknown, onErr: (e: unknown) => void) => {
        onErr(new Error('boom'))
      },
    )
    /* eslint-enable @typescript-eslint/no-explicit-any */
    try {
      const { container } = render(
        <Wrap>
          <ThreeViewer src="/models/bad.glb" onError={onError} />
        </Wrap>,
      )
      await waitFor(() => {
        expect(container.querySelector('[data-mol-id="three-viewer-error"]')).not.toBeNull()
      })
      expect(onError).toHaveBeenCalledTimes(1)
      const arg = onError.mock.calls[0][0]
      expect(arg).toBeInstanceOf(Error)
      expect((arg as Error).message).toBe('boom')
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(FakeGLTFLoader as any)._setNextLoad(null)
    }
  })

  it('disposes renderer and controls on unmount', () => {
    const { unmount } = render(
      <Wrap>
        <ThreeViewer src="/models/x.glb" />
      </Wrap>,
    )
    expect(rendererInstances.length).toBe(1)
    expect(controlsInstances.length).toBe(1)
    unmount()
    expect(rendererInstances[0].dispose).toHaveBeenCalledTimes(1)
    expect(controlsInstances[0].dispose).toHaveBeenCalledTimes(1)
  })

  it('rebuilds renderer when src changes', () => {
    const { rerender } = render(
      <Wrap>
        <ThreeViewer src="/models/a.glb" />
      </Wrap>,
    )
    expect(rendererInstances.length).toBe(1)
    rerender(
      <Wrap>
        <ThreeViewer src="/models/b.glb" />
      </Wrap>,
    )
    expect(rendererInstances.length).toBe(2)
    expect(rendererInstances[0].dispose).toHaveBeenCalledTimes(1)
  })

  it('accepts and applies the autoRotate prop on orbit controls', () => {
    render(
      <Wrap>
        <ThreeViewer src="/models/x.glb" autoRotate />
      </Wrap>,
    )
    expect(controlsInstances[0].autoRotate).toBe(true)
  })
})
