import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for pl. */
export const pl: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Przesuwacz wideo',
  'videoScrubber.aria.strip':
    'Taśma filmowa — głowica odtwarzania w<x> {{czas}}</x> s (ramka<x> {{rama}}</x> )',
  'videoScrubber.aria.playhead': 'Głowica odtwarzania w<x> {{czas}}</x> S',
  'videoScrubber.aria.frameReadout': 'Rama<x> {{rama}}</x> z<x> {{całkowity}}</x>',
  'videoScrubber.aria.thumbnail': 'Podgląd klatki',
  'videoScrubber.thumbnails.empty': 'Brak podglądu',
  'videoScrubber.frameReadout.total': '/<x> {{całkowity}}</x> ramki',
}
