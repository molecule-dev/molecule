/** Translation keys for the exif-panel-react locale package. */
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

/** Translation record mapping exif-panel keys to translated strings. */
export type ExifPanelTranslations = Record<ExifPanelTranslationKey, string>
