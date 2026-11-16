/** Translation keys for the exif-panel locale package. */
export type ExifPanelTranslationKey =
  | 'exifPanel.aria.region'
  | 'exifPanel.eyebrow'
  | 'exifPanel.heading'
  | 'exifPanel.camera'
  | 'exifPanel.lens'
  | 'exifPanel.exposure'
  | 'exifPanel.aperture'
  | 'exifPanel.shutter'
  | 'exifPanel.iso'
  | 'exifPanel.focalLength'
  | 'exifPanel.focalLength35mm'
  | 'exifPanel.gps'
  | 'exifPanel.timestamp'
  | 'exifPanel.software'
  | 'exifPanel.copyright'
  | 'exifPanel.orientation'
  | 'exifPanel.mapLink'
  | 'exifPanel.value.aperture'
  | 'exifPanel.value.shutter'
  | 'exifPanel.value.iso'
  | 'exifPanel.value.focalLength'

/** Translation record mapping exif-panel keys to translated strings. */
export type ExifPanelTranslations = Record<ExifPanelTranslationKey, string>
