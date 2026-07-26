import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for tr. */
export const tr: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Video temizleyici',
  'videoScrubber.aria.strip': 'Film şeridi — oynatma başlığı {{time}} s (çerçeve) {{frame}} )',
  'videoScrubber.aria.playhead': "Playhead'de {{time}} S",
  'videoScrubber.aria.frameReadout': 'Çerçeve {{frame}} ile ilgili {{total}}',
  'videoScrubber.aria.thumbnail': 'Çerçeve önizlemesi',
  'videoScrubber.thumbnails.empty': 'Önizleme yok',
  'videoScrubber.frameReadout.total': '/ {{total}} çerçeveler',
}
