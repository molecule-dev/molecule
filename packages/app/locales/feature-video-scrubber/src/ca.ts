import type { FeatureVideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for ca. */
export const ca: Partial<FeatureVideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Depurador de vídeo',
  'videoScrubber.aria.strip':
    'Tira de pel·lícula — cursor de reproducció a<x> {{hora}}</x> s (marc<x> {{frame}}</x> )',
  'videoScrubber.aria.playhead': 'Capçal de reproducció a<x> {{hora}}</x> s',
  'videoScrubber.aria.frameReadout': 'Marc<x> {{frame}}</x> de<x> {{total}}</x>',
  'videoScrubber.aria.thumbnail': 'Previsualització del fotograma',
  'videoScrubber.thumbnails.empty': 'Sense previsualització',
  'videoScrubber.frameReadout.total': '/<x> {{total}}</x> marcs',
}
