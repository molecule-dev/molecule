import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for mk. */
export const mk: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Видео прегледувач',
  'videoScrubber.aria.strip':
    'Филмска лента — глава за репродукција на {{time}} s (рамка {{frame}} )',
  'videoScrubber.aria.playhead': 'Глава за репродукција на {{time}} с',
  'videoScrubber.aria.frameReadout': 'Рамка {{frame}} од {{total}}',
  'videoScrubber.aria.thumbnail': 'Преглед на рамката',
  'videoScrubber.thumbnails.empty': 'Нема преглед',
  'videoScrubber.frameReadout.total': '/ {{total}} рамки',
}
