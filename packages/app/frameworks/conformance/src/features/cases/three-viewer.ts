/**
 * `@molecule/app-three-viewer-react` cases: the WebGL viewer frame, its
 * loading / loaded / error overlays, the props that rebuild the scene
 * (`src`, `format`, `lighting`, `background`) or update it in place
 * (`autoRotate`, `cameraTarget`, the callbacks), and the format-inference and
 * disposal helpers.
 *
 * The viewer creates a real `WebGLRenderer`, which no jsdom environment can
 * provide (a jsdom canvas hands back no WebGL context, so three.js throws
 * before the package's DOM exists). This module therefore substitutes three.js
 * for every run that loads these cases — the React recorder and each
 * framework package's own conformance test — with stand-ins whose `load`
 * resolves for a `load-me` source and fails for `fail-me`, the two outcomes
 * the cases below drive. The DOM the component renders does not depend on the
 * renderer: it is the viewer frame plus the loading / error overlays.
 *
 * @module
 */

import { vi } from 'vitest'

import type { FeatureCases } from '../spec.js'

/**
 * Build the `three` module stand-in: the renderer, camera, scene, lights and
 * helpers the viewer constructs, each a no-op recorder-free fake (jsdom has no
 * WebGL context, so the real `WebGLRenderer` cannot be constructed).
 *
 * @returns The stand-in's runtime exports, named as `three` names them.
 */
function threeStandIn(): Record<string, unknown> {
  /** Minimal Vector3 stand-in. */
  class Vector3 {
    /** X coordinate. */
    x: number
    /** Y coordinate. */
    y: number
    /** Z coordinate. */
    z: number
    /**
     * Builds a vector.
     *
     * @param x - X coordinate.
     * @param y - Y coordinate.
     * @param z - Z coordinate.
     */
    constructor(x = 0, y = 0, z = 0) {
      this.x = x
      this.y = y
      this.z = z
    }
    /**
     * Sets the coordinates.
     *
     * @param x - X coordinate.
     * @param y - Y coordinate.
     * @param z - Z coordinate.
     * @returns This vector.
     */
    set(x: number, y: number, z: number): this {
      this.x = x
      this.y = y
      this.z = z
      return this
    }
    /**
     * Copies another vector into this one.
     *
     * @param other - The vector to copy.
     * @returns This vector.
     */
    copy(other: Vector3): this {
      this.x = other.x
      this.y = other.y
      this.z = other.z
      return this
    }
    /**
     * Adds a scaled direction.
     *
     * @returns This vector.
     */
    addScaledVector(): this {
      return this
    }
    /**
     * Normalises this vector.
     *
     * @returns This vector.
     */
    normalize(): this {
      return this
    }
  }

  /** Minimal Box3 stand-in: a unit box around the origin. */
  class Box3 {
    /**
     * Fits the box to an object.
     *
     * @returns This box.
     */
    setFromObject(): this {
      return this
    }
    /**
     * Writes the box size (1×1×1).
     *
     * @param size - The vector to write.
     */
    getSize(size: Vector3): void {
      size.x = 1
      size.y = 1
      size.z = 1
    }
    /**
     * Writes the box centre (the origin).
     *
     * @param center - The vector to write.
     */
    getCenter(center: Vector3): void {
      center.x = 0
      center.y = 0
      center.z = 0
    }
  }

  /** Minimal Color stand-in. */
  class Color {
    /**
     * Builds a colour.
     *
     * @param value - The colour value.
     */
    constructor(readonly value?: string) {}
  }

  /** Minimal Object3D stand-in. */
  class Object3D {
    /** Child nodes. */
    children: unknown[] = []
    /**
     * Visits this node.
     *
     * @param callback - Called with this node.
     */
    traverse(callback: (node: unknown) => void): void {
      callback(this)
    }
  }

  /** Minimal Material stand-in. */
  class Material {
    /** Releases the material (a no-op stand-in). */
    dispose(): void {}
  }

  /** Minimal MeshStandardMaterial stand-in. */
  class MeshStandardMaterial extends Material {}

  /** Minimal geometry stand-in. */
  class BufferGeometry {
    /** Releases the geometry (a no-op stand-in). */
    dispose(): void {}
  }

  /** Minimal Mesh stand-in. */
  class Mesh extends Object3D {
    /** The mesh geometry. */
    geometry: unknown
    /** The mesh material. */
    material: unknown
    /**
     * Builds a mesh.
     *
     * @param geometry - The geometry.
     * @param material - The material.
     */
    constructor(geometry: unknown = new BufferGeometry(), material: unknown = new Material()) {
      super()
      this.geometry = geometry
      this.material = material
    }
  }

  /** Minimal Scene stand-in. */
  class Scene extends Object3D {
    /** The scene background. */
    background: unknown = null
    /**
     * Adds a node (a no-op stand-in).
     *
     * @param node - The node to add.
     */
    add(node: unknown): void {
      this.children.push(node)
    }
    /**
     * Removes a node (a no-op stand-in).
     *
     * @param node - The node to remove.
     */
    remove(node: unknown): void {
      const index = this.children.indexOf(node)
      if (index >= 0) this.children.splice(index, 1)
    }
  }

  /** Minimal PerspectiveCamera stand-in. */
  class PerspectiveCamera {
    /** Vertical field of view. */
    fov = 45
    /** Aspect ratio. */
    aspect = 1
    /** Near plane. */
    near = 0.1
    /** Far plane. */
    far = 1000
    /** Camera position. */
    position = new Vector3()
    /** Updates the projection matrix (a no-op stand-in). */
    updateProjectionMatrix(): void {}
  }

  /** Minimal WebGLRenderer stand-in over a real canvas element. */
  class WebGLRenderer {
    /** The renderer canvas. */
    domElement = document.createElement('canvas')
    /**
     * Sets the pixel ratio (a no-op stand-in).
     *
     * @param ratio - The pixel ratio.
     */
    setPixelRatio(ratio: number): void {
      void ratio
    }
    /**
     * Sets the drawing-buffer size (a no-op stand-in).
     *
     * @param width - CSS width.
     * @param height - CSS height.
     */
    setSize(width: number, height: number): void {
      void width
      void height
    }
    /**
     * Renders a frame (a no-op stand-in).
     *
     * @param scene - The scene.
     * @param camera - The camera.
     */
    render(scene: unknown, camera: unknown): void {
      void scene
      void camera
    }
    /** Releases the renderer (a no-op stand-in). */
    dispose(): void {}
  }

  /** Minimal AmbientLight stand-in. */
  class AmbientLight {}
  /** Minimal HemisphereLight stand-in. */
  class HemisphereLight {}
  /** Minimal DirectionalLight stand-in. */
  class DirectionalLight {
    /** Light position. */
    position = new Vector3()
  }

  return {
    AmbientLight,
    Box3,
    Color,
    DirectionalLight,
    HemisphereLight,
    Material,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer,
  }
}

/**
 * Build the orbit-controls stand-in: it holds the target the viewer aims and
 * the flags it syncs in place.
 *
 * @returns The stand-in class, named as `OrbitControls`.
 */
function orbitControlsStandIn(): new (camera: unknown, domElement: unknown) => unknown {
  /** Minimal OrbitControls stand-in. */
  return class OrbitControls {
    /** Orbit target. */
    target = { copy: (): void => undefined }
    /** Whether damping is on. */
    enableDamping = false
    /** Whether the camera auto-rotates. */
    autoRotate = false
    /**
     * Builds controls over a camera and its canvas.
     *
     * @param camera - The camera.
     * @param domElement - The canvas.
     */
    constructor(
      readonly camera: unknown,
      readonly domElement: unknown,
    ) {}
    /** Applies the pending orbit state (a no-op stand-in). */
    update(): void {}
    /** Releases the controls (a no-op stand-in). */
    dispose(): void {}
  }
}

/**
 * The model root a stand-in loader resolves with.
 *
 * @returns A three.js-like node the viewer can add, fit and dispose.
 */
function standInModel(): Record<string, unknown> {
  const root: Record<string, unknown> = { children: [] }
  root.traverse = (callback: (node: unknown) => void): void => callback(root)
  return root
}

/**
 * Build one loader stand-in. Its `load` reproduces the two outcomes the cases
 * drive: a `load-me` source resolves with the shape that loader hands its
 * `onLoad`, and a `fail-me` source rejects.
 *
 * @param kind - The loader's format.
 * @returns The stand-in class.
 */
function loaderStandIn(kind: 'gltf' | 'obj' | 'stl'): new () => unknown {
  /** Minimal model-loader stand-in. */
  return class StandInLoader {
    /**
     * Loads a model: resolves for `load-me`, fails for `fail-me`, otherwise
     * stays pending like a real request that never settles.
     *
     * @param src - The model URL.
     * @param onLoad - Called with the loaded value.
     * @param onProgress - Ignored progress callback.
     * @param onError - Called with the failure.
     */
    load(
      src: string,
      onLoad?: (value: unknown) => void,
      onProgress?: unknown,
      onError?: (error: unknown) => void,
    ): void {
      void onProgress
      if (src.includes('load-me')) {
        if (kind === 'gltf') onLoad?.({ scene: standInModel() })
        else onLoad?.(standInModel())
      }
      if (src.includes('fail-me')) onError?.(new Error('boom'))
    }
  }
}

vi.mock('three', threeStandIn)
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: orbitControlsStandIn(),
}))
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({ GLTFLoader: loaderStandIn('gltf') }))
vi.mock('three/examples/jsm/loaders/OBJLoader.js', () => ({ OBJLoader: loaderStandIn('obj') }))
vi.mock('three/examples/jsm/loaders/STLLoader.js', () => ({ STLLoader: loaderStandIn('stl') }))

/**
 * A three.js-like root the disposal helper accepts: one mesh with a single
 * material, one with a material array, and a texture map on the second, so
 * every branch of the walk runs.
 *
 * @returns A fresh fake model root.
 */
const fakeModelRoot = (): Record<string, unknown> => {
  const texture = { isTexture: true, dispose: (): void => undefined }
  const material = { map: texture, dispose: (): void => undefined }
  const meshA = {
    geometry: { dispose: (): void => undefined },
    material,
    children: [] as unknown[],
  }
  const meshB = {
    geometry: { dispose: (): void => undefined },
    material: [{ dispose: (): void => undefined }, { dispose: (): void => undefined }],
    children: [] as unknown[],
  }
  const root = {
    children: [meshA, meshB],
    /**
     * Walks this tree the way three.js does.
     *
     * @param callback - Called with each node.
     */
    traverse(callback: (node: unknown) => void): void {
      callback(root)
      callback(meshA)
      callback(meshB)
    },
  }
  return root
}

/** `@molecule/app-three-viewer-react`. */
export const threeViewerFeature: FeatureCases = {
  package: '@molecule/app-three-viewer-react',
  families: [
    {
      component: 'ThreeViewer',
      cases: [
        {
          name: 'defaults',
          props: { src: '/models/duck.glb' },
        },
        {
          name: 'explicit gltf format for an extension-less source',
          props: { src: '/models/duck', format: 'gltf' },
        },
        {
          name: 'explicit glb format over an stl extension',
          props: { src: '/models/duck.stl', format: 'glb' },
        },
        {
          name: 'obj source',
          props: { src: '/models/duck.obj' },
        },
        {
          name: 'stl source',
          props: { src: '/models/duck.stl' },
        },
        {
          name: 'source with a query string and a fragment',
          props: { src: '/models/duck.glb?v=2#top' },
        },
        {
          name: 'unknown extension falls back to gltf',
          props: { src: '/models/duck.unknown' },
        },
        {
          name: 'studio lighting',
          props: { src: '/models/duck.glb', lighting: 'studio' },
        },
        {
          name: 'sunset lighting',
          props: { src: '/models/duck.glb', lighting: 'sunset' },
        },
        {
          name: 'flat lighting',
          props: { src: '/models/duck.glb', lighting: 'flat' },
        },
        {
          name: 'background colour',
          props: { src: '/models/duck.glb', background: '#112233' },
        },
        {
          name: 'background colour and flat lighting',
          props: { src: '/models/duck.glb', background: 'rgb(20, 30, 40)', lighting: 'flat' },
        },
        {
          name: 'auto rotate',
          props: { src: '/models/duck.glb', autoRotate: true },
        },
        {
          name: 'camera target',
          props: { src: '/models/duck.glb', cameraTarget: [1, 2, 3] },
        },
        {
          name: 'extra class',
          props: { src: '/models/duck.glb', className: 'parity-token' },
        },
        {
          name: 'every prop at once',
          props: {
            src: '/models/duck.obj',
            format: 'obj',
            lighting: 'sunset',
            background: '#000000',
            autoRotate: true,
            cameraTarget: [0, 1, 0],
            className: 'parity-token',
          },
        },
        {
          name: 'model loaded',
          props: { src: '/models/load-me.glb' },
          callbacks: ['onLoad'],
        },
        {
          name: 'load fails',
          props: { src: '/models/fail-me.glb' },
          callbacks: ['onError'],
        },
        {
          name: 'model loaded, then the source changes',
          props: { src: '/models/load-me.glb' },
          callbacks: ['onLoad'],
          interactions: [{ type: 'props', props: { src: '/models/other.glb' } }],
        },
        {
          name: 'source changes while loading',
          props: { src: '/models/duck.glb' },
          interactions: [{ type: 'props', props: { src: '/models/other.glb' } }],
        },
        {
          name: 'format changes while loading',
          props: { src: '/models/duck.glb', format: 'glb' },
          interactions: [{ type: 'props', props: { format: 'gltf' } }],
        },
        {
          name: 'lighting changes',
          props: { src: '/models/duck.glb', lighting: 'studio' },
          interactions: [{ type: 'props', props: { lighting: 'sunset' } }],
        },
        {
          name: 'background appears',
          props: { src: '/models/duck.glb' },
          interactions: [{ type: 'props', props: { background: '#ff0000' } }],
        },
        {
          name: 'auto rotate toggles',
          props: { src: '/models/duck.glb', autoRotate: false },
          interactions: [{ type: 'props', props: { autoRotate: true } }],
        },
        {
          name: 'camera target changes',
          props: { src: '/models/duck.glb', cameraTarget: [0, 0, 0] },
          interactions: [{ type: 'props', props: { cameraTarget: [2, 2, 2] } }],
        },
        {
          name: 'callbacks change without reloading',
          props: { src: '/models/fail-me.glb' },
          callbacks: ['onError'],
          interactions: [{ type: 'props', props: { src: '/models/fail-me.glb' } }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'resolveFormat',
      calls: [
        ['/models/duck.gltf'],
        ['/models/duck.glb'],
        ['/models/duck.obj'],
        ['/models/duck.stl'],
        ['foo.bar', 'stl'],
        ['https://cdn.example/duck.glb?v=2'],
        ['/foo.stl#fragment'],
        ['/foo.unknown'],
        ['/MODELS/DUCK.GLB'],
      ],
    },
    {
      export: 'disposeObject3D',
      calls: [[fakeModelRoot()], [fakeModelRoot()]],
    },
  ],
}
