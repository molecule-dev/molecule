import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for ca. */
export const ca: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Depurador de vídeo',
  'videoScrubber.aria.strip':
    'Tira de pel·lícula — cursor de reproducció a {{time}} s (marc {{frame}} )',
  'videoScrubber.aria.playhead': 'Capçal de reproducció a {{time}} s',
  'videoScrubber.aria.frameReadout': 'Marc {{frame}} de {{total}}',
  'videoScrubber.aria.thumbnail': 'Previsualització del fotograma',
  'videoScrubber.thumbnails.empty': 'Sense previsualització',
  'videoScrubber.frameReadout.total': '/ {{total}} marcs',
}
