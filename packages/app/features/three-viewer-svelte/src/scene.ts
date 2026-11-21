/**
 * Scene helpers for the Svelte 3D model viewer: the lighting rigs, the camera
 * fit, and the loader for each supported format.
 *
 * @module
 */

import {
  AmbientLight,
  Box3,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  Vector3,
} from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

import type { ThreeViewerFormat, ThreeViewerLighting } from './types.js'

/**
 * Configure a scene with one of the lighting presets.
 *
 * @param scene - The scene to add lights to.
 * @param preset - The preset to apply.
 * @returns The lights added (for cleanup).
 */
export function applyLighting(scene: Scene, preset: ThreeViewerLighting): Object3D[] {
  const lights: Object3D[] = []
  if (preset === 'flat') {
    const ambient = new AmbientLight(0xffffff, 1.0)
    scene.add(ambient)
    lights.push(ambient)
    return lights
  }
  if (preset === 'sunset') {
    const hemi = new HemisphereLight(0xffb37a, 0x2a1850, 0.7)
    scene.add(hemi)
    lights.push(hemi)
    const sun = new DirectionalLight(0xff8a4a, 1.4)
    sun.position.set(5, 3, 2)
    scene.add(sun)
    lights.push(sun)
    const fill = new DirectionalLight(0x6688cc, 0.4)
    fill.position.set(-4, 2, -3)
    scene.add(fill)
    lights.push(fill)
    return lights
  }
  // studio (default) — three-point rig
  const ambient = new AmbientLight(0xffffff, 0.4)
  scene.add(ambient)
  lights.push(ambient)
  const key = new DirectionalLight(0xffffff, 1.1)
  key.position.set(5, 5, 5)
  scene.add(key)
  lights.push(key)
  const fill = new DirectionalLight(0xffffff, 0.6)
  fill.position.set(-5, 2, 3)
  scene.add(fill)
  lights.push(fill)
  const back = new DirectionalLight(0xffffff, 0.4)
  back.position.set(0, 4, -5)
  scene.add(back)
  lights.push(back)
  return lights
}

/**
 * Fit a perspective camera so the entire bounding box is in view, and aim
 * orbit controls at the box centre (or an explicit target).
 *
 * @param object - The loaded model root.
 * @param camera - The camera to position.
 * @param controls - The orbit controls to retarget.
 * @param target - Optional explicit camera target.
 */
export function fitCameraToObject(
  object: Object3D,
  camera: PerspectiveCamera,
  controls: OrbitControls,
  target?: [number, number, number],
): void {
  const box = new Box3().setFromObject(object)
  const size = new Vector3()
  const center = new Vector3()
  box.getSize(size)
  box.getCenter(center)

  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const fitOffset = 1.6
  const fovRad = (camera.fov * Math.PI) / 180
  const distance = (maxDim / (2 * Math.tan(fovRad / 2))) * fitOffset

  const dir = new Vector3(1, 0.6, 1).normalize()
  camera.position.copy(center).addScaledVector(dir, distance)
  camera.near = Math.max(distance / 1000, 0.01)
  camera.far = distance * 100
  camera.updateProjectionMatrix()

  controls.target.copy(target ? new Vector3(...target) : center)
  controls.update()
}

/**
 * Load a model from `src` using the appropriate loader for `format`.
 *
 * @param src - The model URL.
 * @param format - The resolved format.
 * @returns A promise that resolves to the loaded scene/mesh root.
 */
export function loadModel(src: string, format: ThreeViewerFormat): Promise<Object3D> {
  return new Promise((resolve, reject) => {
    if (format === 'gltf' || format === 'glb') {
      const loader = new GLTFLoader()
      loader.load(
        src,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
      )
      return
    }
    if (format === 'obj') {
      const loader = new OBJLoader()
      loader.load(
        src,
        (obj) => resolve(obj),
        undefined,
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
      )
      return
    }
    if (format === 'stl') {
      const loader = new STLLoader()
      loader.load(
        src,
        (geometry) => {
          const mesh = new Mesh(
            geometry,
            new MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.6, metalness: 0.1 }),
          )
          resolve(mesh)
        },
        undefined,
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
      )
      return
    }
    reject(new Error(`Unsupported three-viewer format: ${String(format)}`))
  })
}
