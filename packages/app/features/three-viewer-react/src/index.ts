/**
 * 3D model viewer wrapping three.js.
 *
 * Exports `<ThreeViewer>` — a React component that renders GLTF/GLB, OBJ,
 * or STL models with orbit controls, lighting presets, auto-fit camera,
 * and full GPU resource cleanup on unmount.
 *
 * @example
 * ```tsx
 * import { ThreeViewer } from '@molecule/app-three-viewer-react'
 *
 * function ModelPage() {
 *   return (
 *     <ThreeViewer
 *       src="/models/duck.glb"
 *       lighting="studio"
 *       autoRotate
 *       onLoad={() => console.log('loaded')}
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './ThreeViewer.js'
