import type { JSX } from 'react'

import { type FileDropzoneProps, FileDropzoneSurface } from './FileDropzone.js'

export type { FileDropzoneProps } from './FileDropzone.js'

/** File upload area using the device picker. */
export function FileDropzone(props: FileDropzoneProps): JSX.Element {
  return <FileDropzoneSurface {...props} devicePicker />
}
