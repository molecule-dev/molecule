/** Translation keys for the camera locale package. */
export type CameraTranslationKey =
  | 'camera.error.canvasContext'
  | 'camera.error.noFileSelected'
  | 'camera.error.noFilesSelected'
  | 'camera.error.failedToReadFile'
  | 'camera.error.videoNotSupported'
  | 'camera.error.previewNotStarted'
  | 'camera.error.previewNoParent'
  | 'camera.error.noVideoTrack'

/** Translation record mapping camera keys to translated strings. */
export type CameraTranslations = Record<CameraTranslationKey, string>
