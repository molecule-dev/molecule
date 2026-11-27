import type { JSX } from 'react'

import { type ImageGalleryEditorProps, ImageGalleryEditorSurface } from './ImageGalleryEditor.js'

export type { ImageGalleryEditorProps } from './ImageGalleryEditor.js'

/** Editable image gallery using the device picker. */
export function ImageGalleryEditor(props: ImageGalleryEditorProps): JSX.Element {
  return <ImageGalleryEditorSurface {...props} devicePicker />
}
