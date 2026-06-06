import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for tr. */
export const tr: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Video temizleyici',
  'videoScrubber.aria.strip':
    'Film şeridi — oynatma başlığı<x> {{zaman}}</x> s (çerçeve)<x> {{çerçeve}}</x> )',
  'videoScrubber.aria.playhead': "Playhead'de<x> {{zaman}}</x> S",
  'videoScrubber.aria.frameReadout': 'Çerçeve<x> {{çerçeve}}</x> ile ilgili<x> {{toplam}}</x>',
  'videoScrubber.aria.thumbnail': 'Çerçeve önizlemesi',
  'videoScrubber.thumbnails.empty': 'Önizleme yok',
  'videoScrubber.frameReadout.total': '/<x> {{toplam}}</x> çerçeveler',
}
