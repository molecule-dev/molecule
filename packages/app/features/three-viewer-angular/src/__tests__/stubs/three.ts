/**
 * three.js stand-ins for the unit tests: the same fakes
 * `@molecule/app-three-viewer-react`'s own tests use (jsdom has no WebGL
 * context, so the real `WebGLRenderer` cannot be constructed), with the
 * instances each mount creates recorded so a test can assert on them.
 *
 * @module
 */

import { vi } from 'vitest'

/** Every renderer created by a mount under test. */
export const rendererInstances: WebGLRenderer[] = []
/** Every orbit-controls instance created by a mount under test. */
export const controlsInstances: OrbitControls[] = []
/** Every loader instance created by a mount under test. */
export const loaderInstances: FakeLoader[] = []

/** The `load` a loader instance runs instead of its default (a test's injected impl). */
export const loaderLoad: {
  next: ((...args: unknown[]) => void) | null
} = { next: null }

/** Clears the recorded instances and the injected `load`. */
export function resetThreeStubs(): void {
  rendererInstances.length = 0
  controlsInstances.length = 0
  loaderInstances.length = 0
  loaderLoad.next = null
}

/** Minimal three.js Vector3 stand-in. */
export class Vector3 {
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
   * Adds a scaled direction to this vector.
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

/** Minimal three.js Box3 stand-in: a unit box around the origin. */
export class Box3 {
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

/** Minimal three.js Color stand-in. */
export class Color {
  /**
   * Builds a colour.
   *
   * @param value - The colour value.
   */
  constructor(readonly value?: string) {}
}

/** Minimal three.js Material stand-in with a dispose spy. */
export class Material {
  /** Records the dispose. */
  dispose = vi.fn()
}

/** Minimal three.js MeshStandardMaterial stand-in with a dispose spy. */
export class MeshStandardMaterial extends Material {}

/** Minimal three.js geometry stand-in with a dispose spy. */
export class BufferGeometry {
  /** Records the dispose. */
  dispose = vi.fn()
}

/** Minimal three.js Object3D stand-in. */
export class Object3D {
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

/** Minimal three.js Mesh stand-in with geometry, material, and traverse. */
export class Mesh extends Object3D {
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

/** Minimal three.js Scene stand-in with add/remove recorders. */
export class Scene extends Object3D {
  /** The scene background. */
  background: unknown = null
  /** Records scene additions. */
  add = vi.fn()
  /** Records scene removals. */
  remove = vi.fn()
}

/** Minimal three.js PerspectiveCamera stand-in. */
export class PerspectiveCamera {
  /** Vertical field of view. */
  fov = 45
  /** Aspect ratio. */
  aspect = 1
  /** Near plane. */
  near = 0.1
  /** Far plane. */
  far = 1000
  /** Camera position. */
  position = {
    copy: (): { addScaledVector: () => void } => ({ addScaledVector: (): void => undefined }),
    addScaledVector: (): void => undefined,
    set: (): void => undefined,
  }
  /** Records projection-matrix updates. */
  updateProjectionMatrix = vi.fn()
}

/** Minimal three.js WebGLRenderer stand-in that records each instance. */
export class WebGLRenderer {
  /** The renderer canvas. */
  domElement = document.createElement('canvas')
  /** Records pixel-ratio writes. */
  setPixelRatio = vi.fn()
  /** Records size writes. */
  setSize = vi.fn()
  /** Records frames. */
  render = vi.fn()
  /** Records the dispose. */
  dispose = vi.fn()
  /** Registers the instance for assertions. */
  constructor() {
    rendererInstances.push(this)
  }
}

/** Minimal three.js AmbientLight stand-in. */
export class AmbientLight {}
/** Minimal three.js HemisphereLight stand-in. */
export class HemisphereLight {}
/** Minimal three.js DirectionalLight stand-in. */
export class DirectionalLight {
  /** Light position. */
  position = { set: vi.fn() }
}

/** Minimal orbit controls stand-in that records each instance. */
export class OrbitControls {
  /** Orbit target. */
  target = { copy: vi.fn() }
  /** Whether damping is on. */
  enableDamping = false
  /** Whether the camera auto-rotates. */
  autoRotate = false
  /** Records updates. */
  update = vi.fn()
  /** Records the dispose. */
  dispose = vi.fn()
  /**
   * Builds controls over a camera and its canvas.
   *
   * @param camera - The camera.
   * @param domElement - The canvas.
   */
  constructor(
    readonly camera: unknown,
    readonly domElement: unknown,
  ) {
    controlsInstances.push(this)
  }
}

/**
 * The model root a stand-in loader resolves with for a `load-me` source: what
 * the real loader would hand its `onLoad`, in the shape each one does.
 *
 * @param kind - The loader's format.
 * @returns The loaded value.
 */
export function loadedModel(kind: 'gltf' | 'obj' | 'stl'): unknown {
  if (kind === 'gltf') return { scene: new Mesh() }
  if (kind === 'obj') return new Mesh()
  return new BufferGeometry()
}

/**
 * Runs a stand-in loader's `load`: the injected impl when a test set one,
 * otherwise the same source-driven outcome the React reference is recorded
 * with (`load-me` resolves, `fail-me` rejects, anything else stays pending).
 *
 * @param kind - The loader's format.
 * @param args - The `load` arguments.
 */
function runLoad(kind: 'gltf' | 'obj' | 'stl', args: unknown[]): void {
  if (loaderLoad.next) {
    loaderLoad.next(...args)
    return
  }
  const src = String(args[0] ?? '')
  const onLoad = args[1] as ((value: unknown) => void) | undefined
  const onError = args[3] as ((error: unknown) => void) | undefined
  if (src.includes('load-me')) onLoad?.(loadedModel(kind))
  if (src.includes('fail-me')) onError?.(new Error('boom'))
}

/** A loader stand-in: `load` records the call and runs the source-driven outcome. */
export class FakeLoader {
  /** Records the load call. */
  load = vi.fn((...args: unknown[]): void => runLoad(this.kind, args))
  /** Registers the instance for assertions. */
  constructor(readonly kind: 'gltf' | 'obj' | 'stl' = 'gltf') {
    loaderInstances.push(this)
  }
}

/** Minimal GLTFLoader stand-in. */
export class GLTFLoader extends FakeLoader {
  /** Builds a glTF loader stand-in. */
  constructor() {
    super('gltf')
  }
}
/** Minimal OBJLoader stand-in. */
export class OBJLoader extends FakeLoader {
  /** Builds an OBJ loader stand-in. */
  constructor() {
    super('obj')
  }
}
/** Minimal STLLoader stand-in. */
export class STLLoader extends FakeLoader {
  /** Builds an STL loader stand-in. */
  constructor() {
    super('stl')
  }
}
