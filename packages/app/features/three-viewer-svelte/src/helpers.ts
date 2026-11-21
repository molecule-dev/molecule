/**
 * Pure helpers of the Svelte 3D model viewer: the format inference and the GPU
 * resource disposal the component runs on unmount.
 *
 * @module
 */

import type { Material, Mesh, Object3D } from 'three'

import type { ThreeViewerFormat } from './types.js'

/**
 * Resolve a model format from an explicit prop or the file extension on `src`.
 *
 * @param src - The model URL.
 * @param explicit - The explicit `format` prop, if provided.
 * @returns The resolved format.
 */
export function resolveFormat(src: string, explicit?: ThreeViewerFormat): ThreeViewerFormat {
  if (explicit) return explicit
  const m = src.toLowerCase().match(/\.(gltf|glb|obj|stl)(?:\?|#|$)/)
  if (m) return m[1] as ThreeViewerFormat
  return 'gltf'
}

/**
 * Dispose a material and any of its texture maps.
 *
 * @param material - The material to dispose.
 */
function disposeMaterial(material: Material): void {
  const m = material as Material & Record<string, unknown>
  for (const key of Object.keys(m)) {
    const value = m[key]
    if (
      value &&
      typeof value === 'object' &&
      'isTexture' in (value as Record<string, unknown>) &&
      (value as { isTexture?: boolean }).isTexture
    ) {
      ;(value as { dispose: () => void }).dispose()
    }
  }
  material.dispose()
}

/**
 * Walk an Object3D tree and dispose every geometry, material, and texture so
 * three.js does not leak GPU resources when the viewer unmounts or swaps
 * models.
 *
 * @param root - The root node to dispose.
 */
export function disposeObject3D(root: Object3D): void {
  root.traverse((child) => {
    const mesh = child as Mesh
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }
    const mat = mesh.material as Material | Material[] | undefined
    if (Array.isArray(mat)) {
      for (const m of mat) disposeMaterial(m)
    } else if (mat) {
      disposeMaterial(mat)
    }
  })
}
